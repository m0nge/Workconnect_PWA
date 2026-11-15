import { escaparHtml, textoSeguro } from '../utilidades/formato.js';

export function renderizarP04Recursos(contenedor, datos, titulo = 'Recursos laborales') {
  const recursos = datos.recursosLaborales || [];
  const categorias = [...new Set(recursos.map((recurso) => recurso.categoria).filter(Boolean))];

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <h1 class="titulo-pantalla">${escaparHtml(titulo)}</h1>
        <p class="subtitulo-pantalla">
          Artículos, consejos y herramientas para avanzar en tu carrera.
        </p>
      </div>
      <div class="filtros-recursos">
        <input
          id="buscar-recurso"
          class="campo-select"
          type="search"
          maxlength="80"
          placeholder="Buscar recurso..."
        />
        <select id="categoria-recurso" class="campo-select">
          <option value="">Todas las categorías</option>
          ${categorias.map((categoria) => `<option value="${escaparHtml(categoria)}">${escaparHtml(categoria)}</option>`).join('')}
        </select>
      </div>
      <div id="lista-recursos" class="cuadricula-recursos"></div>
    </div>
  `;

  const pintar = () => {
    const termino = textoSeguro(contenedor.querySelector('#buscar-recurso').value).toLowerCase();
    const categoria = contenedor.querySelector('#categoria-recurso').value;
    const filtrados = recursos.filter((recurso) => {
      const texto = `${recurso.titulo || ''} ${recurso.resumen || ''}`.toLowerCase();
      return (!termino || texto.includes(termino)) && (!categoria || recurso.categoria === categoria);
    });
    contenedor.querySelector('#lista-recursos').innerHTML = filtrados.length
      ? filtrados
          .map(
            (recurso) => `
              <article class="tarjeta tarjeta-recurso-publico">
                <span class="etiqueta-cuadrada">${escaparHtml(recurso.categoria || 'General')}</span>
                <h2 class="titulo-tarjeta">${escaparHtml(recurso.titulo || 'Recurso laboral')}</h2>
                <p class="texto-secundario">
                  ${escaparHtml(recurso.resumen || 'Contenido para tu desarrollo profesional.')}
                </p>
                <p class="texto-secundario">
                  ${escaparHtml(recurso.tiempoLecturaMin || 0)} min de lectura ·
                  ${escaparHtml(recurso.nivelLectura || 'General')}
                </p>
                <button class="boton-secundario" type="button" data-recurso="${escaparHtml(recurso.id)}">
                  Leer recurso
                </button>
              </article>
            `
          )
          .join('')
      : '<div class="tarjeta tarjeta-espaciado"><p class="subtitulo-pantalla">No hay recursos disponibles.</p></div>';
  };
  contenedor.querySelector('#buscar-recurso').addEventListener('input', pintar);
  contenedor.querySelector('#categoria-recurso').addEventListener('change', pintar);
  pintar();
}
