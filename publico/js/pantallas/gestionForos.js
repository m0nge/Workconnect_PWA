import { renderizarListaContenido, solicitarContenido } from '../componentes/listaContenido.js';

export async function renderizarGestionForos(contenedor, alNavegar) {
  contenedor.innerHTML = `<div class="pila-vertical"><div class="cabecera-pantalla"><h1 class="titulo-pantalla">Foros</h1>
    <p class="subtitulo-pantalla">Edita los temas y administra su visibilidad.</p></div>
    <div class="seccion-lista-cabecera"><h2 class="grafico-titulo">Todos los temas</h2><button id="crear-tema" type="button" class="boton-principal">Crear tema</button></div>
    <div id="gestion-foros" aria-live="polite">Cargando temas...</div></div>`;
  contenedor.querySelector('#crear-tema').addEventListener('click', () => alNavegar('P28'));
  const zona = contenedor.querySelector('#gestion-foros');
  const adaptar = (t) => ({ ...t, contenido: t.mensaje, estado: t.estado === 'Activo' ? 'Activo' : 'Inactivo', activo: t.estado === 'Activo' });
  try {
    const temas = await solicitarContenido('/api/admin/foros');
    const categorias = [...new Set(['Búsqueda de empleo', 'Desarrollo profesional', 'Experiencias laborales', ...temas.map((t) => t.categoria)])];
    renderizarListaContenido(zona, {
      elementos: temas.map(adaptar),
      camposEdicion: [
        { clave: 'titulo', etiqueta: 'Título', min: 5, max: 120 },
        { clave: 'categoria', etiqueta: 'Categoría', opciones: categorias },
        { clave: 'contenido', etiqueta: 'Descripción', multilinea: true, min: 20, max: 2000 }
      ],
      alGuardar: async (tema, cambios) => adaptar(await solicitarContenido(`/api/admin/foros/${tema.id}`, 'PUT', cambios)),
      alAlternar: async (tema) => adaptar(await solicitarContenido(`/api/admin/foros/${tema.id}/estado`, 'PATCH', { estado: tema.activo ? 'Oculto' : 'Activo' })),
      alEliminar: (tema) => solicitarContenido(`/api/admin/foros/${tema.id}`, 'DELETE')
    });
  } catch (error) { zona.textContent = error.message; }
}
