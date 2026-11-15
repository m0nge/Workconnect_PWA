import { escaparHtml } from '../utilidades/formato.js';

export function renderizarP03Detalle(
  contenedor,
  datos,
  idVacante,
  alNavegar,
  mostrarNotificacion
) {
  const vacante =
    datos.vacantes.find((item) => item.id === idVacante) ||
    datos.vacantes.find((item) => item.estado === 'Activa');

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

  const listaDetalle = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      return '<p class="texto-secundario">Información no especificada.</p>';
    }

    return `
      <ul class="lista-detalle-empleo">
        ${items.map((item) => `<li>${escaparHtml(item)}</li>`).join('')}
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
                  <div class="valoraciones-resumen">
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
              ${
                valoraciones.length
                  ? valoraciones
                      .map(
                        (valoracion) => `
                          <article class="valoracion-item">
                            <div class="valoracion-item-cabecera">
                              <strong>${escaparHtml(valoracion.autor || 'Usuario')}</strong>
                              <span class="estrellas-valoracion">
                                ${'★'.repeat(Math.max(0, Math.min(5, Number(valoracion.calificacion) || 0)))}${'☆'.repeat(5 - Math.max(0, Math.min(5, Number(valoracion.calificacion) || 0)))}
                              </span>
                            </div>
                            <p>${escaparHtml(valoracion.comentario || '')}</p>
                            <small>${escaparHtml(valoracion.fecha || '')}</small>
                          </article>
                        `
                      )
                      .join('')
                  : '<p class="texto-secundario">Aún no hay valoraciones publicadas.</p>'
              }
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
              Inicia sesión o crea una cuenta para enviar tu postulación.
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

  contenedor
    .querySelector('#aplicar-empleo')
    .addEventListener('click', () => mostrarNotificacion('Debes iniciar sesión para postularte.'));

  contenedor
    .querySelector('#reportar-empleo')
    .addEventListener('click', () => mostrarNotificacion('Gracias. Revisaremos esta publicación.'));

  contenedor
    .querySelector('#escribir-valoracion')
    .addEventListener('click', () => mostrarNotificacion('Inicia sesión para escribir una valoración.'));
}
