import { tarjetaVacante } from './p01Inicio.js';

export function renderizarP02Resultados(contenedor, datos, terminoInicial = '', ubicacionInicial = '', alNavegar) {
  const vacantes = datos.vacantes.filter((vacante) => vacante.estado === 'Activa');
  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla"><h1 class="titulo-pantalla">Resultados de búsqueda</h1></div>
      <div class="resultados-publicos">
        <aside class="tarjeta tarjeta-filtro">
          <h2 class="grafico-titulo">Filtrar empleos</h2>
          <form id="formulario-filtros">
            <label class="campo-formulario"><span>Palabra clave</span><input id="filtro-termino" type="search" maxlength="80" value="${escapeAttribute(terminoInicial)}" /></label>
            <label class="campo-formulario"><span>Ubicación</span><input id="filtro-ubicacion" type="text" maxlength="60" value="${escapeAttribute(ubicacionInicial)}" /></label>
            <label class="campo-formulario"><span>Modalidad</span><select id="filtro-modalidad"><option value="">Todas</option><option>Remoto</option><option>Híbrido</option><option>Presencial</option></select></label>
            <label class="campo-formulario"><span>Sector</span><input id="filtro-sector" type="text" maxlength="50" /></label>
            <button class="boton-principal ancho-completo" type="submit">Aplicar filtros</button>
            <button class="boton-secundario ancho-completo" id="limpiar-filtros" type="button">Limpiar filtros</button>
          </form>
        </aside>
        <section><div class="seccion-lista-cabecera"><p id="contador-resultados" class="subtitulo-pantalla"></p><select id="orden-resultados" class="campo-select" aria-label="Ordenar resultados"><option value="reciente">Más recientes</option><option value="titulo">Título A-Z</option></select></div><div id="lista-resultados" class="lista-tarjetas-publicas"></div></section>
      </div>
    </div>`;

  const pintar = () => {
    const termino = contenedor.querySelector('#filtro-termino').value.trim().toLowerCase();
    const ubicacion = contenedor.querySelector('#filtro-ubicacion').value.trim().toLowerCase();
    const modalidad = contenedor.querySelector('#filtro-modalidad').value;
    const sector = contenedor.querySelector('#filtro-sector').value.trim().toLowerCase();
    const orden = contenedor.querySelector('#orden-resultados').value;
    const filtradas = vacantes.filter((vacante) => {
      const texto = `${vacante.titulo} ${vacante.empresa}`.toLowerCase();
      const lugar = `${vacante.municipio} ${vacante.departamento}`.toLowerCase();
      return (!termino || texto.includes(termino)) && (!ubicacion || lugar.includes(ubicacion)) && (!modalidad || vacante.modalidad === modalidad) && (!sector || String(vacante.sector || '').toLowerCase().includes(sector));
    }).sort((a, b) => orden === 'titulo' ? a.titulo.localeCompare(b.titulo) : 0);
    contenedor.querySelector('#contador-resultados').textContent = `${filtradas.length} vacante(s) encontrada(s)`;
    contenedor.querySelector('#lista-resultados').innerHTML = filtradas.length ? filtradas.map(tarjetaVacante).join('') : '<div class="tarjeta tarjeta-espaciado"><p class="subtitulo-pantalla">No encontramos vacantes con esos filtros.</p></div>';
    contenedor.querySelectorAll('[data-vacante]').forEach((boton) => boton.addEventListener('click', () => alNavegar('P03', Number(boton.dataset.vacante))));
  };
  contenedor.querySelector('#formulario-filtros').addEventListener('submit', (evento) => { evento.preventDefault(); pintar(); });
  contenedor.querySelector('#limpiar-filtros').addEventListener('click', () => { contenedor.querySelector('#formulario-filtros').reset(); pintar(); });
  contenedor.querySelector('#orden-resultados').addEventListener('change', pintar);
  pintar();
}

function escapeAttribute(valor) {
  return String(valor || '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
