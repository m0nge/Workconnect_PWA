import { escaparHtml } from '../utilidades/formato.js';

export function renderizarP01Inicio(contenedor, datos, alNavegar, alBuscar) {
  const vacantes = datos.vacantes.filter((vacante) => vacante.estado === 'Activa');
  const destacadas = vacantes.slice(0, 3);

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <section class="tarjeta tarjeta-espaciado portada-publica">
        <h1 class="titulo-pantalla">Conectando talento<br /><em>con oportunidades.</em></h1>
        <p class="subtitulo-pantalla">Explora oportunidades laborales en El Salvador.</p>
        <form id="formulario-busqueda-inicio" class="formulario-busqueda-publica">
          <label class="campo-formulario">
            <span>¿Qué trabajo buscas?</span>
            <input id="busqueda-inicio" type="search" maxlength="80" placeholder="Cargo, palabra clave o empresa" required />
          </label>
          <label class="campo-formulario">
            <span>Ubicación</span>
            <input id="ubicacion-inicio" type="text" maxlength="60" placeholder="Departamento o municipio" />
          </label>
          <button class="boton-principal" type="submit">Buscar empleos</button>
        </form>
      </section>

      <div class="cuadricula-indicadores">
        <div class="tarjeta-kpi"><p class="kpi-etiqueta">VACANTES ACTIVAS</p><p class="kpi-valor">${vacantes.length}</p><p class="kpi-detalle esmeralda">Oportunidades disponibles</p></div>
        <div class="tarjeta-kpi"><p class="kpi-etiqueta">EMPRESAS</p><p class="kpi-valor">${datos.empresas.length}</p><p class="kpi-detalle">Registradas en el portal</p></div>
        <div class="tarjeta-kpi"><p class="kpi-etiqueta">RECURSOS</p><p class="kpi-valor">${datos.recursosLaborales.length}</p><p class="kpi-detalle">Para impulsar tu carrera</p></div>
        <div class="tarjeta-kpi"><p class="kpi-etiqueta">POSTULACIONES</p><p class="kpi-valor">${datos.estadisticasDashboard.totalPostulaciones}</p><p class="kpi-detalle">Procesos registrados</p></div>
      </div>

      <section class="tarjeta tarjeta-espaciado">
        <div class="seccion-lista-cabecera"><div><h2 class="grafico-titulo">Vacantes destacadas</h2><p class="grafico-subtitulo">Conoce las oportunidades más recientes.</p></div><button class="enlace-accion-vino" data-ir="P02">Ver todas</button></div>
        <div class="lista-tarjetas-publicas">
          ${destacadas.length ? destacadas.map((vacante) => tarjetaVacante(vacante)).join('') : '<p class="subtitulo-pantalla">No hay vacantes publicadas por el momento.</p>'}
        </div>
      </section>
    </div>
  `;

  contenedor.querySelector('#formulario-busqueda-inicio').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const termino = contenedor.querySelector('#busqueda-inicio').value.trim();
    const ubicacion = contenedor.querySelector('#ubicacion-inicio').value.trim();
    if (termino.length < 2) return;
    alBuscar(termino, ubicacion);
  });
  contenedor.querySelectorAll('[data-ir]').forEach((boton) => boton.addEventListener('click', () => alNavegar(boton.dataset.ir)));
  contenedor.querySelectorAll('[data-vacante]').forEach((boton) => boton.addEventListener('click', () => alNavegar('P03', Number(boton.dataset.vacante))));
}

export function tarjetaVacante(vacante) {
  return `<article class="tarjeta tarjeta-vacante-publica">
    <div><span class="etiqueta-cuadrada">${escaparHtml(vacante.modalidad || 'Presencial')}</span><h3 class="titulo-tarjeta">${escaparHtml(vacante.titulo)}</h3><p class="texto-secundario">${escaparHtml(vacante.empresa)}</p></div>
    <div class="datos-vacante-publica"><span>${escaparHtml(vacante.municipio || vacante.departamento || 'El Salvador')}</span><span>${escaparHtml(vacante.tipoContrato || 'Contrato laboral')}</span><span>${vacante.salarioMin ? `$${vacante.salarioMin} - $${vacante.salarioMax}` : 'Salario a convenir'}</span></div>
    <button class="boton-secundario" type="button" data-vacante="${vacante.id}">Ver detalle</button>
  </article>`;
}
