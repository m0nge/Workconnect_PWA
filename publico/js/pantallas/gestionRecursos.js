import { renderizarListaContenido } from '../componentes/listaContenido.js';

export function renderizarGestionRecursos(contenedor, recursos, acciones) {
  const adaptar = (r) => ({ ...r, estado: r.estadoPublicacion, activo: r.estadoPublicacion === 'Publicado' });
  renderizarListaContenido(contenedor, {
    elementos: recursos.map(adaptar),
    estadosDisponibles: ['Publicado', 'Borrador'],
    camposEdicion: [
      { clave: 'titulo', etiqueta: 'Título', min: 8, max: 160 },
      { clave: 'categoria', etiqueta: 'Categoría', opciones: ['Artículo', 'Consejo', 'Tutorial', 'Noticia'] },
      { clave: 'nivelLectura', etiqueta: 'Nivel de lectura', opciones: ['Básico', 'Intermedio', 'Avanzado'] },
      { clave: 'tiempoLecturaMin', etiqueta: 'Tiempo de lectura (minutos)', numero: true, min: 1, max: 60 },
      { clave: 'resumen', etiqueta: 'Resumen', multilinea: true, min: 20, max: 500 },
      { clave: 'contenido', etiqueta: 'Contenido', multilinea: true, min: 30, max: 10000 },
      { clave: 'imagenPortadaUrl', etiqueta: 'URL de portada', max: 2800000 }
    ],
    alGuardar: async (recurso, cambios) => adaptar(await acciones.alActualizarRecurso(recurso.id, cambios)),
    alAlternar: async (recurso) => adaptar(await acciones.alCambiarEstadoRecurso(recurso.id, recurso.activo ? 'Borrador' : 'Publicado')),
    alEliminar: (recurso) => acciones.alEliminarRecurso(recurso.id)
  });
}
