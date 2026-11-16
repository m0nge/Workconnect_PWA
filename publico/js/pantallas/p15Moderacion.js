import { escaparHtml } from '../utilidades/formato.js';
import { renderizarAvatar } from '../utilidades/avatar.js';

const estadoModeracion = {
  categoriaSeleccionada: 'Todo'
};

export function renderizarP15Moderacion(contenedor, elementos, acciones) {
  elementos = elementos.filter((e) => !['Aprobado', 'Desestimado'].includes(e.estado));
  const conteoTodoPend = elementos.filter((e) => e.estado === 'Pendiente').length;
  const conteoForosPend = elementos.filter(
    (e) => e.categoria === 'Foros' && e.estado === 'Pendiente'
  ).length;
  const conteoComentariosPend = elementos.filter(
    (e) => e.categoria === 'Comentarios' && e.estado === 'Pendiente'
  ).length;
  const conteoValoracionesPend = elementos.filter(
    (e) => e.categoria === 'Valoraciones' && e.estado === 'Pendiente'
  ).length;
  const conteoReportesPend = elementos.filter(
    (e) => e.categoria === 'Postulaciones' && e.estado === 'Pendiente'
  ).length;

  const pestanas = [
    { clave: 'Todo', etiqueta: `Todo · ${conteoTodoPend} pend.` },
    { clave: 'Foros', etiqueta: `Foros · ${conteoForosPend} pend.` },
    { clave: 'Comentarios', etiqueta: `Comentarios · ${conteoComentariosPend} pend.` },
    { clave: 'Valoraciones', etiqueta: `Valoraciones · ${conteoValoracionesPend} pend.` },
    { clave: 'Postulaciones', etiqueta: `Postulaciones · ${conteoReportesPend} pend.` }
  ];

  const htmlPestanas = pestanas
    .map(
      (p) => `
        <button
          type="button"
          class="boton-pestana ${estadoModeracion.categoriaSeleccionada === p.clave ? 'activo' : ''}"
          data-categoria="${p.clave}"
        >
          ${p.etiqueta}
        </button>
      `
    )
    .join('');

  const elementosFiltrados = elementos.filter((elem) => {
    if (estadoModeracion.categoriaSeleccionada === 'Todo') return true;
    return elem.categoria === estadoModeracion.categoriaSeleccionada;
  });

  const htmlTarjetas =
    elementosFiltrados.length === 0
      ? `
        <div class="tarjeta tarjeta-espaciado texto-centro" style="color:var(--color-texto-atenuado); font-size:0.75rem; padding:2rem;">
          No hay contenido pendiente de moderación en esta categoría.
        </div>
      `
      : elementosFiltrados
          .map((elementoLista) => {
            const estiloEstado =
              elementoLista.estado === 'Pendiente'
                ? 'background:var(--color-ambar-fondo); color:var(--color-ambar); border-color:var(--color-ambar-borde);'
                : elementoLista.estado === 'Aprobado'
                ? 'background:var(--color-esmeralda-fondo); color:var(--color-esmeralda); border-color:var(--color-esmeralda-borde);'
                : elementoLista.estado === 'Oculto'
                ? 'background:var(--color-superficie-elevada); color:var(--color-texto-secundario); border-color:var(--color-borde-suave);'
                : 'background:var(--color-rosa-fondo); color:var(--color-rosa); border-color:var(--color-rosa-borde);';

            return `
              <div class="tarjeta-moderacion">
                ${elementoLista.categoria === 'Postulaciones' ? `<div class="celda-identidad postulacion-reportada-identidad">${renderizarAvatar({ nombre: elementoLista.candidatoNombre || 'Candidato/a', fotoUrl: elementoLista.fotoUrl })}<strong>${escaparHtml(elementoLista.candidatoNombre || 'Candidato/a')}</strong></div>` : ''}
                <div class="barra-tarjeta-moderacion">
                  <div style="display:flex; align-elementos:center; gap:0.5rem;">
                    <span class="etiqueta-cuadrada" style="background:var(--color-superficie-elevada); color:var(--color-texto-secundario); border-color:var(--color-borde);">
                      ${escaparHtml(elementoLista.tipo)}
                    </span>
                    <span class="etiqueta-cuadrada" style="${estiloEstado}">
                      ${escaparHtml(elementoLista.estado)}
                    </span>
                  </div>

                  <div class="grupo-acciones">
                    <button
                      type="button"
                      class="boton"
                      data-estado-mod="Aprobado"
                      data-id="${escaparHtml(elementoLista.id)}"
                      title="Conserva o restablece el contenido autorizado"
                    >
                      Marcar revisado
                    </button>
                    <button
                      type="button"
                      class="boton"
                      data-estado-mod="${elementoLista.estado === 'Oculto' ? 'Aprobado' : 'Oculto'}"
                      data-id="${escaparHtml(elementoLista.id)}"
                      title="${elementoLista.estado === 'Oculto' ? 'Restablece la visibilidad del contenido' : 'Oculta el contenido reportado'}"
                    >
                      ${elementoLista.estado === 'Oculto' ? 'Desocultar' : 'Ocultar'}
                    </button>
                    <button
                      type="button"
                      class="boton boton-peligro"
                      data-eliminar-mod="${escaparHtml(elementoLista.id)}"
                      title="Suprime el elemento de la plataforma"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div>
                  <p class="titulo-fila" style="font-size:0.75rem;">
                    ${escaparHtml(elementoLista.motivoOTitulo)}
                  </p>
                  <p class="subtitulo-fila">
                    ${escaparHtml(elementoLista.referencia)} · ${escaparHtml(elementoLista.autor)} · ${escaparHtml(elementoLista.fecha)}
                  </p>
                  <div class="caja-detalle-moderacion">
                    ${escaparHtml(elementoLista.detalles)}
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <h1 class="titulo-pantalla">Moderación</h1>
        <p class="subtitulo-pantalla">
          Revisa reportes de foros, comentarios, valoraciones y postulaciones.
        </p>
      </div>

      <div class="barra-pestanas">
        ${htmlPestanas}
      </div>

      <div class="pila-compacta">
        ${htmlTarjetas}
      </div>
    </div>
  `;

  contenedor.querySelectorAll('[data-categoria]').forEach((boton) => {
    boton.addEventListener('click', () => {
      estadoModeracion.categoriaSeleccionada = boton.getAttribute('data-categoria');
      renderizarP15Moderacion(contenedor, elementos, acciones);
    });
  });

  contenedor.querySelectorAll('[data-estado-mod]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.getAttribute('data-id');
      const nuevoEstado = boton.getAttribute('data-estado-mod');
      if (id && nuevoEstado) {
        acciones.alActualizarEstadoModeracion(id, nuevoEstado);
      }
    });
  });

  contenedor.querySelectorAll('[data-eliminar-mod]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.getAttribute('data-eliminar-mod');
      if (id) {
        acciones.alEliminarElementoModeracion(id);
      }
    });
  });
}
