import { escaparHtml, textoSeguro } from '../utilidades/formato.js';
import { abrirModal } from '../componentes/modal.js';

export function renderizarP04Recursos(contenedor, datos, titulo = 'Recursos laborales') {
  const recursos = datos.recursosLaborales || [];
  const categorias = [...new Set(recursos.map((recurso) => recurso.categoria).filter(Boolean))];

  contenedor.innerHTML = `
    <div class="pila-vertical recursos-pantalla">
      <div class="cabecera-pantalla recursos-hero">
        <span class="etiqueta-cuadrada">DESARROLLO PROFESIONAL</span>
        <h1 class="titulo-pantalla">${escaparHtml(titulo)}</h1>
        <p class="subtitulo-pantalla">
          Contenido seleccionado para ayudarte a tomar mejores decisiones y avanzar en tu carrera.
        </p>
      </div>
      <div class="filtros-recursos">
        <label class="recurso-busqueda">
          <span>Buscar en recursos</span>
          <input id="buscar-recurso" class="campo-select" type="search" maxlength="80" placeholder="Ej. entrevistas, CV, habilidades..." />
        </label>
        <div class="recurso-busqueda">
          <span>Explorar por categoría</span>
          <nav id="categorias-recursos" class="recursos-categorias" aria-label="Categorías de recursos">
            <button type="button" class="recurso-categoria activo" data-categoria="">Todos <small>${recursos.length}</small></button>
            ${categorias.map((categoria) => `<button type="button" class="recurso-categoria" data-categoria="${escaparHtml(categoria)}">${escaparHtml(categoria)} <small>${recursos.filter((recurso) => recurso.categoria === categoria).length}</small></button>`).join('')}
          </nav>
        </div>
      </div>
      <div id="contador-recursos" class="recursos-contador"></div>
      <div id="lista-recursos" class="cuadricula-recursos"></div>
    </div>
  `;

  let categoriaSeleccionada = '';
  const pintar = () => {
    const termino = textoSeguro(contenedor.querySelector('#buscar-recurso').value).toLowerCase();
    const filtrados = recursos.filter((recurso) => {
      const texto = `${recurso.titulo || ''} ${recurso.resumen || ''}`.toLowerCase();
      return (!termino || texto.includes(termino)) && (!categoriaSeleccionada || recurso.categoria === categoriaSeleccionada);
    });
    const lista = contenedor.querySelector('#lista-recursos');
    contenedor.querySelector('#contador-recursos').textContent =
      `${filtrados.length} ${filtrados.length === 1 ? 'recurso disponible' : 'recursos disponibles'}`;
    lista.classList.remove('oculto');
    lista.innerHTML = filtrados.length
      ? filtrados
          .map(
            (recurso) => `
              <article class="tarjeta tarjeta-recurso-publico">
                <span class="etiqueta-cuadrada">${escaparHtml(recurso.categoria || 'General')}</span>
                <h2 class="titulo-tarjeta">${escaparHtml(recurso.titulo || 'Recurso laboral')}</h2>
                <p class="texto-secundario">
                  ${escaparHtml(recurso.resumen || 'Contenido para tu desarrollo profesional.')}
                </p>
                <p class="recurso-meta">
                  ${escaparHtml(recurso.tiempoLecturaMin || 0)} min de lectura ·
                  ${escaparHtml(recurso.nivelLectura || 'General')}
                </p>
                <button class="boton-secundario recurso-leer" type="button" data-recurso="${escaparHtml(recurso.id)}">
                  Leer recurso
                </button>
              </article>
            `
          )
          .join('')
      : '<div class="tarjeta tarjeta-espaciado"><p class="subtitulo-pantalla">No hay recursos disponibles.</p></div>';
    lista.querySelectorAll('[data-recurso]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const recurso = recursos.find((elemento) => String(elemento.id) === boton.dataset.recurso);
        if (!recurso) return;
        abrirModal({
          titulo: recurso.titulo || 'Recurso laboral',
          subtitulo: `${recurso.categoria || 'General'} · ${recurso.tiempoLecturaMin || 0} min de lectura`,
          contenidoHtml: `
            <span class="etiqueta-cuadrada">${escaparHtml(recurso.nivelLectura || 'General')}</span>
            <p class="detalle-texto">${escaparHtml(recurso.contenido || recurso.resumen || 'Contenido no disponible.')}</p>
          `,
          alMontar(cuerpo, cerrar) {
            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'boton-secundario';
            boton.textContent = 'Cerrar';
            boton.addEventListener('click', cerrar);
            cuerpo.append(boton);
          }
        });
      });
    });
  };
  contenedor.querySelector('#buscar-recurso').addEventListener('input', pintar);
  contenedor.querySelectorAll('[data-categoria]').forEach((boton) => {
    boton.addEventListener('click', () => {
      categoriaSeleccionada = boton.dataset.categoria;
      contenedor.querySelectorAll('[data-categoria]').forEach((elemento) => elemento.classList.toggle('activo', elemento === boton));
      pintar();
    });
  });
  pintar();
}
