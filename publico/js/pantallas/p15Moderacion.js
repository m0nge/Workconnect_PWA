import { escaparHtml } from '../utilidades/formato.js';

const estadoModeracion = {
  categoriaSeleccionada: 'Todo'
};

export function renderizarP15Moderacion(contenedor, elementos, acciones) {
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
    (e) => e.categoria === 'Reportes' && e.estado === 'Pendiente'
  ).length;

  const pestanas = [
    { clave: 'Todo', etiqueta: `Todo · ${conteoTodoPend} pend.` },
    { clave: 'Foros', etiqueta: `Foros · ${conteoForosPend} pend.` },
    { clave: 'Comentarios', etiqueta: `Comentarios · ${conteoComentariosPend} pend.` },
    { clave: 'Valoraciones', etiqueta: `Valoraciones · ${conteoValoracionesPend} pend.` },
    { clave: 'Reportes', etiqueta: `Reportes · ${conteoReportesPend} pend.` }
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
        <div class="tarjeta tarjeta-espaciado texto-centro" style="color:#64748b; font-size:0.75rem; padding:2rem;">
          No hay contenido pendiente de moderación en esta categoría.
        </div>
      `
      : elementosFiltrados
          .map((item) => {
            const estiloEstado =
              item.estado === 'Pendiente'
                ? 'background:#fffbeb; color:#92400e; border-color:#fde68a;'
                : item.estado === 'Aprobado'
                ? 'background:#ecfdf5; color:#047857; border-color:#a7f3d0;'
                : item.estado === 'Oculto'
                ? 'background:#f1f5f9; color:#334155; border-color:#cbd5e1;'
                : 'background:#fff1f2; color:#9f1239; border-color:#fecdd3;';

            return `
              <div class="tarjeta-moderacion">
                <div class="barra-tarjeta-moderacion">
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span class="etiqueta-cuadrada" style="background:#f1f5f9; color:#475569; border-color:#e2e8f0;">
                      ${escaparHtml(item.tipo)}
                    </span>
                    <span class="etiqueta-cuadrada" style="${estiloEstado}">
                      ${escaparHtml(item.estado)}
                    </span>
                  </div>

                  <div class="grupo-acciones">
                    <button
                      type="button"
                      class="boton"
                      data-estado-mod="Aprobado"
                      data-id="${escaparHtml(item.id)}"
                      title="Conserva o restablece el contenido autorizado"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      class="boton"
                      data-estado-mod="Desestimado"
                      data-id="${escaparHtml(item.id)}"
                      title="Descarta el reporte si no hay infracción"
                    >
                      Desestimar
                    </button>
                    <button
                      type="button"
                      class="boton"
                      data-estado-mod="Oculto"
                      data-id="${escaparHtml(item.id)}"
                      title="Retira de la vista pública el contenido señalado"
                    >
                      Ocultar
                    </button>
                    <button
                      type="button"
                      class="boton boton-peligro"
                      data-eliminar-mod="${escaparHtml(item.id)}"
                      title="Suprime el elemento de la plataforma"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div>
                  <p class="titulo-fila" style="font-size:0.75rem;">
                    ${escaparHtml(item.motivoOTitulo)}
                  </p>
                  <p class="subtitulo-fila">
                    ${escaparHtml(item.referencia)} · ${escaparHtml(item.autor)} · ${escaparHtml(item.fecha)}
                  </p>
                  <div class="caja-detalle-moderacion">
                    ${escaparHtml(item.detalles)}
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <span class="codigo-pantalla">P15 ADMINISTRACIÓN</span>
        <h1 class="titulo-pantalla">Moderación</h1>
        <p class="subtitulo-pantalla">
          Aprueba, oculta o elimina foros, comentarios, valoraciones y reportes.
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
