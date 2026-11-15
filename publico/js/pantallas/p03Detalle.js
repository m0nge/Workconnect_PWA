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
  const inicialesEmpresa = vacante.empresa.slice(0, 2).toUpperCase();
  const imagenEmpresa =
    vacante.empresaLogoUrl || vacante.logoEmpresaUrl || vacante.imagenEmpresaUrl || '';
  const identificadorEmpresa = imagenEmpresa
    ? `<img class="imagen-empresa" src="${escaparHtml(imagenEmpresa)}" alt="Logo de ${escaparHtml(vacante.empresa)}" />`
    : `<div class="avatar-cuadrado">${escaparHtml(inicialesEmpresa)}</div>`;

  const listaDetalle = (items) => {
    if (!items.length) {
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
              <div class="avatar-cuadrado grande">
                ${escaparHtml(inicialesEmpresa)}
              </div>
              <div>
                <span class="detalle-empleo-sector">
                  ${escaparHtml(vacante.sector || 'Oportunidad laboral')}
                </span>
                <h1 class="titulo-pantalla">${escaparHtml(vacante.titulo)}</h1>
                <p class="subtitulo-pantalla">
                  ${escaparHtml(vacante.empresa)} · ${escaparHtml(ubicacion)}
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
                <strong>${escaparHtml(vacante.empresa)}</strong>
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
}
