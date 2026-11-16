import { escaparHtml, validarTexto } from '../utilidades/formato.js';
import { renderizarP04Recursos } from './p04Recursos.js';
import { renderizarP05Foros } from './p05Foros.js';
import { observarSeccionesPortada } from '../utilidades/navegacionPortada.js';

export function renderizarP01Inicio(
  contenedor,
  datos,
  alNavegar,
  alBuscar,
  rolActual = 'visitante',
  usuario = null,
  mostrarNotificacion = () => {}
) {
  const vacantes = datos.vacantes.filter((vacante) => vacante.estado === 'Activa');
  const destacadas = vacantes.slice(0, 3);
  const esCandidato = rolActual === 'candidato';
  const esEmpresa = rolActual === 'empresa';
  const textoPresentacion = esEmpresa
    ? 'Encuentra el talento que tu empresa necesita.'
    : 'Conectando talento con oportunidades.';
  const subtituloPresentacion = esEmpresa
    ? 'Publica vacantes y encuentra profesionales para hacer crecer tu equipo.'
    : 'Explora vacantes verificadas, postúlate en minutos y da seguimiento a cada proceso.';
  const etiquetasMetricas = esCandidato
    ? ['VACANTES ACTIVAS', 'EMPRESAS VERIFICADAS', 'RECURSOS', 'MIS POSTULACIONES']
    : ['VACANTES ACTIVAS', 'EMPRESAS VERIFICADAS', 'CANDIDATOS REGISTRADOS', 'POSTULACIONES ENVIADAS'];
  const valoresMetricas = [
    vacantes.length,
    datos.empresas.filter((empresa) => empresa.estado === 'Verificada').length,
    datos.recursosLaborales.length,
    datos.estadisticasResumen.totalPostulaciones
  ];

  contenedor.innerHTML = `
    <div class="pila-vertical portada-integrada">
      <section id="inicio-empleos" data-seccion-portada class="tarjeta tarjeta-espaciado portada-publica">
        <div class="portada-contenido">
          <div class="portada-mensaje">
            <span class="portada-etiqueta">PORTAL DE EMPLEOS DE EL SALVADOR</span>
            <h1 class="titulo-pantalla">${esCandidato ? 'Encuentra tu próxima oportunidad.' : textoPresentacion}</h1>
            <p class="portada-descripcion">${subtituloPresentacion}</p>
            <div class="portada-sectores">
              <span>Explora por sector:</span>
              <button type="button" data-sector="Tecnología">Tecnología</button>
              <button type="button" data-sector="Finanzas">Finanzas</button>
              <button type="button" data-sector="Logística">Logística</button>
              <button type="button" data-sector="Salud">Salud</button>
              <button type="button" data-sector="Comercio">Comercio</button>
            </div>
          </div>
          <form id="formulario-busqueda-inicio" class="formulario-busqueda-publica">
            <h2>Encuentra tu próximo empleo</h2>
            <label class="campo-formulario">
              <span>Cargo o palabra clave</span>
              <input id="busqueda-inicio" type="search" maxlength="80" placeholder="Ej. Contador, soporte, ventas" required />
            </label>
            <label class="campo-formulario">
              <span>Ubicación</span>
              <input id="ubicacion-inicio" type="text" maxlength="60" placeholder="Todo El Salvador" />
            </label>
            <div class="formulario-busqueda-acciones">
              <button class="boton-secundario" type="button" data-ir="P02">Mostrar filtros avanzados</button>
              <button class="boton-principal" type="submit">Buscar empleos</button>
            </div>
          </form>
        </div>
      </section>

      <div class="cuadricula-indicadores metricas-portada">
        ${valoresMetricas.map((valor, indice) => `<div class="tarjeta-kpi"><p class="kpi-etiqueta">${etiquetasMetricas[indice]}</p><p class="kpi-valor">${valor}</p><p class="kpi-detalle">${indice === 0 ? 'Oportunidades disponibles' : 'Datos del portal'}</p></div>`).join('')}
      </div>

      <section class="tarjeta tarjeta-espaciado">
        <div class="seccion-lista-cabecera"><div><h2 class="grafico-titulo">Vacantes destacadas</h2><p class="grafico-subtitulo">Conoce las oportunidades más recientes.</p></div><button class="enlace-accion-vino" data-ir="P02">Ver todas</button></div>
        <div class="lista-tarjetas-publicas">
          ${destacadas.length ? destacadas.map((vacante) => tarjetaVacante(vacante)).join('') : '<p class="subtitulo-pantalla">No hay vacantes publicadas por el momento.</p>'}
        </div>
      </section>
      <section id="inicio-recursos" data-seccion-portada class="seccion-portada" aria-label="Recursos laborales">
        <div id="contenido-recursos-portada"></div>
      </section>
      <section id="inicio-foros" data-seccion-portada class="seccion-portada" aria-label="Foros de la comunidad">
        <div id="contenido-foros-portada"><p class="subtitulo-pantalla">Cargando conversaciones...</p></div>
      </section>
      <section class="tarjeta tarjeta-espaciado portada-empresas" aria-labelledby="titulo-empresas-portada">
        <div><h2 id="titulo-empresas-portada" class="titulo-pantalla">¿Buscas talento para tu empresa?</h2>
          <p class="subtitulo-pantalla">Ingresa para publicar vacantes y gestionar tus postulaciones.</p></div>
        <button type="button" class="boton-principal" data-ir="AUTH_EMPRESA">Ingresar como empresa</button>
      </section>
    </div>
  `;

  contenedor.querySelector('#formulario-busqueda-inicio').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const termino = contenedor.querySelector('#busqueda-inicio').value.trim();
    const ubicacion = contenedor.querySelector('#ubicacion-inicio').value.trim();
    if (!validarTexto(termino, 2, 80) || ubicacion.length > 60) {
      contenedor.querySelector('#busqueda-inicio').focus();
      return;
    }
    alBuscar(termino, ubicacion);
  });
  contenedor.querySelectorAll('[data-ir]').forEach((boton) => boton.addEventListener('click', () => alNavegar(boton.dataset.ir)));
  contenedor.querySelectorAll('[data-vacante]').forEach((boton) => boton.addEventListener('click', () => alNavegar('P03', boton.dataset.vacante)));
  contenedor.querySelectorAll('[data-sector]').forEach((boton) => boton.addEventListener('click', () => {
    const termino = boton.dataset.sector;
    alBuscar(termino, '');
  }));
  renderizarP04Recursos(contenedor.querySelector('#contenido-recursos-portada'), datos, 'Recursos laborales', { integrado: true });
  renderizarP05Foros(contenedor.querySelector('#contenido-foros-portada'), alNavegar, rolActual, mostrarNotificacion, { integrado: true });
  if (rolActual !== 'administrador') observarSeccionesPortada(contenedor);
}

export function tarjetaVacante(vacante) {
  const empresa = vacante.empresa || 'Empresa no especificada';
  const municipio = vacante.municipio || vacante.departamento || 'El Salvador';
  return `<article class="tarjeta tarjeta-vacante-publica">
    <div><span class="etiqueta-cuadrada">${escaparHtml(vacante.modalidad || 'Presencial')}</span><h3 class="titulo-tarjeta">${escaparHtml(vacante.titulo || 'Vacante sin título')}</h3><p class="texto-secundario">${escaparHtml(empresa)}</p></div>
    <div class="datos-vacante-publica"><span>${escaparHtml(municipio)}</span><span>${escaparHtml(vacante.tipoContrato || 'Contrato laboral')}</span><span>${vacante.salarioMin ? `$${vacante.salarioMin} - $${vacante.salarioMax}` : 'Salario a convenir'}</span></div>
    <button class="boton-secundario" type="button" data-vacante="${vacante.id}">Ver detalle</button>
  </article>`;
}
