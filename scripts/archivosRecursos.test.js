import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { audienciaValida, puedeVerRecurso, leerAdjunto, mapearAdjuntosRecurso } from '../servicios/archivosRecursos.js';
import { validarEdicionRecurso } from '../servicios/gestionContenido.js';

prueba('cada audiencia es independiente y los borradores solo se muestran a administración', () => {
  const recurso = { estado_publicacion: 'Publicado', audiencia: ['Empresas'] };
  comprobar.equal(puedeVerRecurso(recurso, 'empresa'), true);
  comprobar.equal(puedeVerRecurso(recurso, 'candidato'), false);
  comprobar.equal(puedeVerRecurso(recurso), false);
  comprobar.equal(puedeVerRecurso({ ...recurso, estado_publicacion: 'Borrador' }, 'empresa'), false);
  comprobar.equal(puedeVerRecurso({ ...recurso, estado_publicacion: 'Borrador' }, 'administrador'), true);
  comprobar.equal(audienciaValida(['Empresas']), true);
  comprobar.equal(audienciaValida(['Empresas', 'Empresas']), false);
  comprobar.equal(audienciaValida(['Todos']), false);
  comprobar.equal(audienciaValida([]), false);
});

prueba('los adjuntos conservan nombre y bytes sin exponer su ruta de almacenamiento', () => {
  const archivo = { version: 1, nombre: 'archivo.sin-extension', ruta: 'adjuntos/12345678-1234-1234-1234-123456789abc', tamano: 120 };
  const valor = JSON.stringify(archivo);
  comprobar.equal(leerAdjunto(valor).nombre, archivo.nombre);
  comprobar.equal(leerAdjunto(JSON.stringify({ ...archivo, ruta: '../privado' })), null);
  comprobar.deepEqual(mapearAdjuntosRecurso({ id: 'recurso', adjuntos: [valor] }), [{ nombre: archivo.nombre, tamano: 120, url: '/api/adjuntos-recursos/recurso/0' }]);
  comprobar.equal(mapearAdjuntosRecurso({ adjuntos: ['antiguo.pdf'] })[0].url, null);
});

prueba('editar conserva exactamente los grupos seleccionados y rechaza grupos desconocidos', () => {
  const recurso = { titulo: 'Recurso para entrevistas', resumen: 'Resumen de preparación de entrevistas.', contenido: 'Contenido completo para preparar una entrevista laboral.', categoria: 'Artículo', nivelLectura: 'Básico', tiempoLecturaMin: 5, audiencia: ['Empresas'] };
  comprobar.deepEqual(validarEdicionRecurso(recurso).audiencia, ['Empresas']);
  comprobar.equal(validarEdicionRecurso({ ...recurso, audiencia: ['Todos'] }), null);
});
