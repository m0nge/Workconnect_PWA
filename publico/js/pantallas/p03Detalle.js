import { reportarContenido } from '../utilidades/reportes.js';
import { escaparHtml } from '../utilidades/formato.js';

export function renderizarP03Detalle(
  contenedor,
  datos,
  idVacante,
  alNavegar,
  mostrarNotificacion,
  usuarioActual
) {
  const vacante =
    datos.vacantes.find((elementoLista) => String(elementoLista.id) === String(idVacante));

  if (!vacante) {
    contenedor.innerHTML = `
      <div class="tarjeta tarjeta-espaciado">
        <p>No hay una vacante disponible.</p>
      </div>
    `;
    return;
  }

  const ubicacion = vacante.municipio || vacante.departamento || 'El Salvador';
  const modalidad = vacante.modalidad || 'Presencial';
  const contrato = vacante.tipoContrato || 'Contrato laboral';
  const salario = vacante.salarioMin
    ? `$${vacante.salarioMin} - $${vacante.salarioMax}`
    : 'A convenir';
  const nombreEmpresa = vacante.empresa || 'Empresa no especificada';
  const inicialesEmpresa = nombreEmpresa.slice(0, 2).toUpperCase();
  const imagenEmpresa =
    vacante.empresaLogoUrl || vacante.logoEmpresaUrl || vacante.imagenEmpresaUrl || '';
  const identificadorEmpresa = imagenEmpresa
    ? `<img class="imagen-empresa" src="${escaparHtml(imagenEmpresa)}" alt="Logo de ${escaparHtml(vacante.empresa)}" />`
    : `<div class="avatar-cuadrado">${escaparHtml(inicialesEmpresa)}</div>`;
  const valoraciones = Array.isArray(vacante.valoraciones)
    ? vacante.valoraciones
    : [];
  const calificacion = Number(vacante.calificacionPromedio || vacante.calificacion || 0);
  const totalValoraciones = Number(vacante.totalResenas || valoraciones.length || 0);
  const estrellas = Array.from({ length: 5 }, (_, indice) =>
    indice < Math.round(calificacion) ? '★' : '☆'
  ).join('');

  const listaDetalle = (elementosLista) => {
    if (!Array.isArray(elementosLista) || elementosLista.length === 0) {
      return '<p class="texto-secundario">Información no especificada.</p>';
    }

    return `
      <ul class="lista-detalle-empleo">
        ${elementosLista.map((elementoLista) => `<li>${escaparHtml(elementoLista)}</li>`).join('')}
      </ul>
    `;
  };

  contenedor.innerHTML = `
    <div class="pila-vertical detalle-empleo-contenedor">
      <button class="enlace-accion-vino" id="volver-resultados" type="button">
        ← Volver a resultados
      </button>

      <div class="detalle-empleo-publico">
        <main class="tarjeta tarjeta-espaciado detalle-empleo-principal">
          <section class="detalle-empleo-cabecera">
            <div class="detalle-empleo-identidad">
              ${identificadorEmpresa}
              <div>
                <span class="detalle-empleo-sector">
                  ${escaparHtml(vacante.sector || 'Oportunidad laboral')}
                </span>
                <h1 class="titulo-pantalla">${escaparHtml(vacante.titulo)}</h1>
                <p class="subtitulo-pantalla">
                  ${escaparHtml(nombreEmpresa)} · ${escaparHtml(ubicacion)}
                </p>
              </div>
            </div>

            <div class="detalle-empleo-etiquetas">
              <span class="etiqueta-cuadrada">${escaparHtml(modalidad)}</span>
              <span class="etiqueta-cuadrada">${escaparHtml(contrato)}</span>
              <span class="etiqueta-cuadrada">${vacante.plazas} plaza(s)</span>
              <span class="etiqueta-cuadrada">
                Publicada ${escaparHtml(vacante.fechaPublicacion)}
              </span>
            </div>
          </section>

          <section class="detalle-empleo-contenido">
            <h2 class="detalle-empleo-titulo">Descripción del puesto</h2>
            <p>${escaparHtml(vacante.descripcion || 'Descripción no disponible.')}</p>

            <div class="detalle-empleo-bloque">
            <h2 class="detalle-empleo-titulo">Funciones y responsabilidades</h2>
            ${listaDetalle(vacante.funciones)}
            </div>

            <div class="detalle-empleo-bloque">
            <h2 class="detalle-empleo-titulo">Requisitos</h2>
            ${listaDetalle(vacante.requisitos)}
            </div>

            <div class="detalle-empleo-bloque">
            <h2 class="detalle-empleo-titulo">Beneficios</h2>
            ${listaDetalle(vacante.beneficios)}
            </div>

            <section class="detalle-valoraciones">
              <div class="valoraciones-cabecera">
                <div>
                  <h2 class="detalle-empleo-titulo">
                    Valoraciones de ${escaparHtml(nombreEmpresa)}
                  </h2>
                  <div class="valoraciones-resumen" id="resumen-valoraciones">
                    <strong>${calificacion.toFixed(1)}</strong>
                    <div>
                      <span class="estrellas-valoracion">${estrellas}</span>
                      <span class="texto-secundario">
                        ${totalValoraciones} valoración(es) publicadas
                      </span>
                    </div>
                  </div>
                </div>
                <button id="escribir-valoracion" class="boton-secundario" type="button">
                  Escribir valoración
                </button>
              </div>
              <div id="lista-valoraciones">Cargando valoraciones...</div>
              <form id="formulario-valoracion" hidden>
                <fieldset class="valoracion-estrellas"><legend>Tu calificación *</legend>
                  <label><input type="radio" name="calificacion" value="1" required><span aria-hidden="true">★</span><span class="valoracion-lectura">1 estrella</span></label>
                  <label><input type="radio" name="calificacion" value="2"><span aria-hidden="true">★</span><span class="valoracion-lectura">2 estrellas</span></label>
                  <label><input type="radio" name="calificacion" value="3"><span aria-hidden="true">★</span><span class="valoracion-lectura">3 estrellas</span></label>
                  <label><input type="radio" name="calificacion" value="4"><span aria-hidden="true">★</span><span class="valoracion-lectura">4 estrellas</span></label>
                  <label><input type="radio" name="calificacion" value="5"><span aria-hidden="true">★</span><span class="valoracion-lectura">5 estrellas</span></label>
                </fieldset>
                <label class="campo-formulario"><span>Tu comentario *</span><textarea name="comentario" required minlength="3" maxlength="2000" rows="4"></textarea></label>
                <button type="submit" class="boton-principal">Enviar valoración</button><p class="texto-secundario">Tu opinión se publica directamente y puede reportarse para revisión.</p>
              </form>
            </section>
          </section>
        </main>

        <aside class="tarjeta tarjeta-espaciado detalle-empleo-lateral">
            <p class="detalle-empleo-salario">
              ${salario}<span>/ mes</span>
            </p>
            <p class="texto-secundario">${vacante.plazas} plaza(s) · ${escaparHtml(contrato)}</p>
            <button id="aplicar-empleo" class="boton-principal boton-aplicar" type="button">
              Aplicar a esta vacante
            </button>
            <p class="texto-secundario">
              ${!usuarioActual ? 'Inicia sesión o crea una cuenta para enviar tu postulación.' : usuarioActual.rol === 'candidato' ? 'Se enviará el currículum guardado en tu perfil.' : 'Solo las cuentas de candidato pueden postularse.'}
            </p>
            <button class="boton-secundario ancho-completo" type="button" id="reportar-empleo">
              Reportar vacante
            </button>
            <div class="detalle-empresa">
              <h2 class="detalle-empleo-titulo">Sobre la empresa</h2>
              <div class="detalle-empresa-nombre">
                ${identificadorEmpresa}
                <strong>${escaparHtml(nombreEmpresa)}</strong>
              </div>
              <p class="texto-secundario">Empresa registrada en WorkConnect.</p>
              <div class="fila-resumen">
                <span>Ubicación</span>
                <strong>${escaparHtml(ubicacion)}</strong>
              </div>
              <div class="fila-resumen">
                <span>Modalidad</span>
                <strong>${escaparHtml(modalidad)}</strong>
              </div>
              <div class="fila-resumen">
                <span>Estado</span>
                <strong class="estado-verificada">✓ Verificada</strong>
              </div>
            </div>
        </aside>
      </div>
    </div>
  `;

  contenedor
    .querySelector('#volver-resultados')
    .addEventListener('click', () => alNavegar('P02'));

  contenedor.querySelector('#aplicar-empleo').addEventListener('click', async (evento) => {
    if (!usuarioActual) {
      mostrarNotificacion('Inicia sesión para postularte.');
      alNavegar('AUTH_LOGIN');
      return;
    }
    if (usuarioActual.rol !== 'candidato') {
      mostrarNotificacion('Solo las cuentas de candidato pueden postularse.');
      return;
    }
    const boton = evento.currentTarget;
    boton.disabled = true;
    try {
      const respuesta = await fetch('/api/candidato/postulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacante_id: vacante.id })
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (respuesta.status === 409) { boton.textContent = 'Postulado'; mostrarNotificacion(resultado.error); return; }
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo enviar la postulación.');
      mostrarNotificacion('¡Postulación enviada! Puedes verla en Mis postulaciones.');
      boton.textContent = 'Postulado';
      return;
    } catch (error) {
      mostrarNotificacion(error.message || 'No se pudo enviar la postulación.');
      boton.disabled = false;
    }
  });

  contenedor
    .querySelector('#reportar-empleo')
    .addEventListener('click', () => mostrarNotificacion('Gracias. Revisaremos esta publicación.'));

  const aplicar = contenedor.querySelector('#aplicar-empleo');
  if (usuarioActual?.rol === 'candidato') {
    aplicar.disabled = true;
    fetch('/api/candidato/postulaciones/' + encodeURIComponent(vacante.id))
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (d.postulado) aplicar.textContent = 'Postulado'; else aplicar.disabled = false; })
      .catch(() => { aplicar.disabled = false; mostrarNotificacion('No se pudo verificar tu postulación.'); });
  }
  const formulario = contenedor.querySelector('#formulario-valoracion');
  contenedor.querySelector('#escribir-valoracion').addEventListener('click', () => {
    if (!usuarioActual) { mostrarNotificacion('Inicia sesión para escribir una valoración.'); alNavegar('AUTH_LOGIN'); return; }
    if (usuarioActual.rol !== 'candidato') { mostrarNotificacion('Solo las cuentas de candidato pueden valorar empresas.'); return; }
    formulario.hidden = !formulario.hidden;
    if (!formulario.hidden) formulario.querySelector('input').focus();
  });
  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    if (!usuarioActual) { mostrarNotificacion('Inicia sesión para valorar una empresa.'); alNavegar('AUTH_LOGIN'); return; }
    if (usuarioActual.rol !== 'candidato') { mostrarNotificacion('Solo las cuentas de candidato pueden valorar empresas.'); return; }
    if (!formulario.reportValidity()) return;
    const boton = formulario.querySelector('button[type="submit"]'); boton.disabled = true;
    try {
      const datos = new FormData(formulario);
      const r = await fetch('/api/candidato/valoraciones', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({empresa_id:vacante.empresaId,calificacion:Number(datos.get('calificacion')),comentario:datos.get('comentario')})});
      const resultado = await r.json().catch(() => ({})); if(!r.ok) throw new Error(resultado.error || 'No se pudo enviar tu valoración.');
      formulario.reset(); formulario.hidden = true; mostrarNotificacion('Valoración publicada.');
    } catch(error) { mostrarNotificacion(error.message); } finally { boton.disabled = false; }
  });
  const lista = contenedor.querySelector('#lista-valoraciones');
  if (vacante.empresaId) fetch('/api/valoraciones-empresa/' + encodeURIComponent(vacante.empresaId))
    .then(async r => { if(!r.ok) throw new Error(); return r.json(); })
    .then(({valoraciones: opiniones}) => {
      const promedio = opiniones.length ? opiniones.reduce((total,v) => total + v.calificacion,0) / opiniones.length : 0;
      const estrellas = '★'.repeat(Math.round(promedio)) + '☆'.repeat(5-Math.round(promedio));
      contenedor.querySelector('#resumen-valoraciones').innerHTML = '<strong>' + promedio.toFixed(1) + '</strong><div><span class="estrellas-valoracion">' + estrellas + '</span><span class="texto-secundario"> ' + opiniones.length + ' valoración(es) publicadas</span></div>';
      lista.innerHTML = opiniones.length ? opiniones.map(v => '<article class="valoracion-item"><span class="estrellas-valoracion">' + '★'.repeat(v.calificacion) + '☆'.repeat(5-v.calificacion) + '</span><p>' + escaparHtml(v.comentario) + '</p>' + (usuarioActual ? '<button type="button" class="boton" data-reportar-valoracion="' + escaparHtml(v.id) + '">Reportar</button>' : '') + '</article>').join('') : '<p class="texto-secundario">Aún no hay valoraciones publicadas.</p>';
      lista.querySelectorAll('[data-reportar-valoracion]').forEach((boton) => {
        boton.addEventListener('click', () => reportarContenido('valoraciones_empresas', boton.dataset.reportarValoracion, mostrarNotificacion));
      });
    }).catch(() => { lista.textContent = 'No se pudieron cargar las valoraciones.'; });
  else lista.textContent = 'Esta vacante no tiene una empresa vinculada.';
}
