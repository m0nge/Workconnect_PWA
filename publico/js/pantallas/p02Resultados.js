import { tarjetaVacante } from './p01Inicio.js';
import { escaparHtml, textoSeguro, valorEnLista } from '../utilidades/formato.js';

export function renderizarP02Resultados(contenedor, datos, terminoInicial = '', ubicacionInicial = '', alNavegar) {
  const vacantes = datos.vacantes.filter((vacante) => vacante.estado === 'Activa');
  const ubicaciones = [...new Set(
    vacantes
      .map((vacante) => vacante.municipio || vacante.departamento)
      .filter(Boolean)
  )].sort((a, b) => String(a).localeCompare(String(b)));
  const sectores = [...new Set(vacantes.map((vacante) => vacante.sector).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)));

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla"><h1 class="titulo-pantalla">Resultados de búsqueda</h1></div>
      <div class="resultados-publicos">
        <aside class="tarjeta tarjeta-filtro">
          <h2 class="grafico-titulo">Filtrar empleos</h2>
          <form id="formulario-filtros">
            <label class="campo-formulario"><span>Palabra clave</span><input id="filtro-termino" type="search" maxlength="80" value="${escapeAttribute(terminoInicial)}" /></label>
            <label class="campo-formulario">
              <span>Ubicación</span>
              <select id="filtro-ubicacion">
                <option value="">Todas las ubicaciones</option>
                ${ubicaciones.map((ubicacion) => `<option value="${escapeAttribute(ubicacion)}">${escaparHtml(ubicacion)}</option>`).join('')}
              </select>
            </label>
            <label class="campo-formulario"><span>Modalidad</span><select id="filtro-modalidad"><option value="">Todas</option><option value="Remoto">Remoto</option><option value="Híbrido">Híbrido</option><option value="Presencial">Presencial</option></select></label>
            <label class="campo-formulario">
              <span>Sector</span>
              <select id="filtro-sector">
                <option value="">Todos los sectores</option>
                ${sectores.map((sector) => `<option value="${escapeAttribute(sector)}">${escaparHtml(sector)}</option>`).join('')}
              </select>
            </label>
            <button class="boton-principal ancho-completo" type="submit">Aplicar filtros</button>
            <button class="boton-secundario ancho-completo" id="limpiar-filtros" type="button">Limpiar filtros</button>
          </form>
        </aside>
        <section><div class="seccion-lista-cabecera"><p id="contador-resultados" class="subtitulo-pantalla"></p><select id="orden-resultados" class="campo-select" aria-label="Ordenar resultados"><option value="reciente">Más recientes</option><option value="titulo">Título A-Z</option></select></div><div id="lista-resultados" class="lista-tarjetas-publicas"></div></section>
      </div>
    </div>`;

  const pintar = () => {
    const termino = textoSeguro(contenedor.querySelector('#filtro-termino').value).toLowerCase();
    const ubicacion = textoSeguro(contenedor.querySelector('#filtro-ubicacion').value).toLowerCase();
    const modalidad = contenedor.querySelector('#filtro-modalidad').value;
    const sector = textoSeguro(contenedor.querySelector('#filtro-sector').value).toLowerCase();
    const orden = contenedor.querySelector('#orden-resultados').value;
    const filtradas = vacantes.filter((vacante) => {
      const texto = `${vacante.titulo || ''} ${vacante.empresa || ''}`.toLowerCase();
      const lugar = `${vacante.municipio || ''} ${vacante.departamento || ''}`.toLowerCase();
      return (
        (!termino || texto.includes(termino)) &&
        (!ubicacion || lugar.includes(ubicacion)) &&
        (!modalidad || valorEnLista(vacante.modalidad, ['Remoto', 'Híbrido', 'Presencial']) && vacante.modalidad === modalidad) &&
        (!sector || String(vacante.sector || '').toLowerCase() === sector)
      );
    }).sort((a, b) => orden === 'titulo' ? a.titulo.localeCompare(b.titulo) : 0);
    contenedor.querySelector('#contador-resultados').textContent = `${filtradas.length} vacante(s) encontrada(s)`;
    contenedor.querySelector('#lista-resultados').innerHTML = filtradas.length ? filtradas.map(tarjetaVacante).join('') : '<div class="tarjeta tarjeta-espaciado"><p class="subtitulo-pantalla">No encontramos vacantes con esos filtros.</p></div>';
    contenedor.querySelectorAll('[data-vacante]').forEach((boton) => boton.addEventListener('click', () => alNavegar('P03', boton.dataset.vacante)));
  };
  contenedor.querySelector('#formulario-filtros').addEventListener('submit', (evento) => { evento.preventDefault(); pintar(); });
  contenedor.querySelector('#limpiar-filtros').addEventListener('click', () => { contenedor.querySelector('#formulario-filtros').reset(); pintar(); });
  contenedor.querySelector('#orden-resultados').addEventListener('change', pintar);
  contenedor.querySelector('#filtro-ubicacion').value = ubicaciones.some(
    (ubicacion) => String(ubicacion).toLowerCase() === textoSeguro(ubicacionInicial).toLowerCase()
  )
    ? ubicacionInicial
    : '';
  pintar();
}

function escapeAttribute(valor) {
  return String(valor || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
