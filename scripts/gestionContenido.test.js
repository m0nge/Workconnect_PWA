import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { validarEdicionRecurso, validarEdicionForo, registrarGestionContenido } from '../servicios/gestionContenido.js';
import { filtrarContenido } from '../publico/js/componentes/listaContenido.js';
import { renderizarP05Foros } from '../publico/js/pantallas/p05Foros.js';
import { renderizarP19CrearRecurso } from '../publico/js/pantallas/p19CrearRecurso.js';

const recurso = {
  titulo: 'Consejos de entrevistas', categoria: 'Consejo', nivelLectura: 'Básico',
  tiempoLecturaMin: 5, resumen: 'Consejos útiles para preparar una entrevista laboral.',
  contenido: 'Prepara ejemplos de tus experiencias y revisa los requisitos del puesto.'
};
const id = '12345678-1234-1234-1234-123456789abc';

prueba('la edición valida límites y conserva estado, audiencia y adjuntos existentes', () => {
  const campos = validarEdicionRecurso({ ...recurso, estadoPublicacion: 'Publicado', autor_id: 'otro' });
  comprobar.equal(campos.titulo, recurso.titulo);
  comprobar.equal(campos.estado_publicacion, undefined);
  comprobar.equal(campos.autor_id, undefined);
  comprobar.equal(campos.audiencia, undefined);
  comprobar.equal(campos.adjuntos, undefined);
  comprobar.equal(validarEdicionRecurso({ ...recurso, tiempoLecturaMin: -1 }), null);
  comprobar.equal(validarEdicionRecurso({ ...recurso, contenido: 'corto' }), null);
  comprobar.equal(validarEdicionForo({ titulo: 'Tema válido', categoria: 'Entrevistas y CV', contenido: 'Texto suficiente para editar una conversación existente.' }).categoria, 'Entrevistas y CV');
  comprobar.equal(validarEdicionForo({ titulo: 'x', categoria: '', contenido: '' }), null);
});

prueba('combina búsqueda sin tildes, categoría y estado', () => {
  const elementosLista = [
    { titulo: 'Preparación de entrevistas', categoria: 'Consejo', estado: 'Publicado' },
    { titulo: 'Preparación del CV', categoria: 'Tutorial', estado: 'Borrador' }
  ];
  comprobar.equal(filtrarContenido(elementosLista, { busqueda: 'preparacion', categoria: 'Consejo', estado: 'Publicado' }).length, 1);
  comprobar.equal(filtrarContenido(elementosLista, { estado: 'Borrador' })[0].titulo, 'Preparación del CV');
  comprobar.equal(filtrarContenido(elementosLista, { categoria: 'Noticia' }).length, 0);
});

function preparar(autorizar = true) {
  const rutas = new Map();
  const llamadas = [];
  const fila = { id, ...recurso, estado_publicacion: 'Borrador', estado: 'Oculto' };
  const cliente = { from(tabla) {
    llamadas.push(['from', tabla]);
    return {
      update(campos) { llamadas.push(['update', campos]); return this; },
      delete() { llamadas.push(['delete']); return this; },
      eq(campo, valor) { llamadas.push(['eq', campo, valor]); return this; },
      select() { return this; },
      order: async () => ({ data: [fila], error: null }),
      maybeSingle: async () => ({ data: fila, error: null })
    };
  } };
  const aplicacionPrueba = Object.fromEntries(['get', 'put', 'patch', 'delete'].map((metodo) => [metodo, (ruta, manejador) => rutas.set(`${metodo} ${ruta}`, manejador)]));
  const respuestaHttp = { codigo: 200, status(codigo) { this.codigo = codigo; return this; }, json(datos) { this.datos = datos; return this; } };
  registrarGestionContenido(aplicacionPrueba, {
    conManejoErrores: (f) => f,
    exigirRol: async (_solicitudHttp, respuesta, roles) => {
      comprobar.deepEqual(roles, ['administrador']);
      if (!autorizar) { respuesta.status(403).json({ error: 'Sin permiso' }); return null; }
      return { supabase: cliente, usuario: { nombre: 'Admin' } };
    }, mapearRecurso: (r) => r, reportarAutomaticamente: async () => {}
  });
  return { rutas, llamadas, res: respuestaHttp };
}

prueba('todas las operaciones requieren administrador y rechazan IDs inválidos', async () => {
  for (const autorizar of [false, true]) {
    const { rutas, llamadas, res: respuestaHttp } = preparar(autorizar);
    await rutas.get('put /api/recursos/:id')({ params: { id: 'invalido' }, body: recurso }, respuestaHttp);
    comprobar.equal(respuestaHttp.codigo, autorizar ? 400 : 403);
    comprobar.equal(llamadas.length, 0);
  }
});

prueba('desactivar actualiza solo la visibilidad y permite recuperar temas ocultos', async () => {
  const { rutas, llamadas, res: respuestaHttp } = preparar();
  await rutas.get('patch /api/recursos/:id/estado')({ params: { id }, body: { estado: 'Borrador' } }, respuestaHttp);
  comprobar.deepEqual(llamadas.find(([tipo]) => tipo === 'update'), ['update', { estado_publicacion: 'Borrador' }]);
  await rutas.get('get /api/admin/foros')({ params: {} }, respuestaHttp);
  comprobar.equal(respuestaHttp.datos[0].estado, 'Oculto');
  const cantidad = llamadas.length;
  await rutas.get('patch /api/admin/foros/:id/estado')({ params: { id }, body: { estado: 'Inexistente' } }, respuestaHttp);
  comprobar.equal(respuestaHttp.codigo, 400);
  comprobar.equal(llamadas.length, cantidad);
});

prueba('eliminar dirige la operación únicamente al registro seleccionado', async () => {
  const { rutas, llamadas, res: respuestaHttp } = preparar();
  await rutas.get('delete /api/admin/foros/:id')({ params: { id } }, respuestaHttp);
  comprobar.deepEqual(llamadas, [['from', 'foros_temas'], ['delete'], ['eq', 'id', id]]);
  comprobar.equal(respuestaHttp.datos.eliminado, true);
});

class Nodo {
  innerHTML = '';
  value = '';
  hijos = new Map();
  addEventListener() {}
  querySelector(selector) {
    if (!this.hijos.has(selector)) this.hijos.set(selector, new Nodo());
    return this.hijos.get(selector);
  }
  querySelectorAll() { return []; }
}

prueba('administración de foros abre la tabla con contenido inactivo y sin menú lateral', async () => {
  const solicitudOriginal = globalThis.fetch;
  const urls = [];
  try {
    globalThis.fetch = async (url) => {
      urls.push(url);
      return { ok: true, json: async () => [{ id, titulo: 'Tema desactivado', categoria: 'Consejos', mensaje: 'Descripción del tema', estado: 'Oculto' }] };
    };
    const contenedor = new Nodo();
    await renderizarP05Foros(contenedor, () => {}, 'administrador');
    comprobar.deepEqual(urls, ['/api/admin/foros']);
    comprobar.doesNotMatch(contenedor.innerHTML, /<aside|Administrar foros/);
    const filas = contenedor.querySelector('#gestion-foros').querySelector('tbody').innerHTML;
    comprobar.match(filas, /Tema desactivado/);
    comprobar.match(filas, /Editar/);
    comprobar.match(filas, />Activar</);
    comprobar.match(filas, /Eliminar/);
  } finally { globalThis.fetch = solicitudOriginal; }
});

prueba('recursos abre una sola lista con las acciones directas', () => {
  const contenedor = new Nodo();
  renderizarP19CrearRecurso(contenedor, [{ id, ...recurso, estadoPublicacion: 'Publicado' }], {});
  comprobar.match(contenedor.innerHTML, /Todos los recursos/);
  comprobar.doesNotMatch(contenedor.innerHTML, /data-subpestana="Publicados"/);
  const filas = contenedor.querySelector('#contenido-subpestana-recurso').querySelector('tbody').innerHTML;
  comprobar.match(filas, /Consejos de entrevistas/);
  comprobar.match(filas, /Editar/);
  comprobar.match(filas, /Desactivar/);
});
