import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { detectarLenguaje, reportarAutomaticamente, destinoModeracion } from '../servicios/moderacion.js';
import { renderizarP15Moderacion } from '../publico/js/pantallas/p15Moderacion.js';

prueba('detecta violencia, contenido sexual e insultos con mayúsculas y tildes', () => {
  const hallazgos = detectarLenguaje('Te MATARÉ, imbécil. Publicidad de pornografía.');
  comprobar.deepEqual(hallazgos.map((h) => h.categoria), ['violencia', 'sexual', 'insultos']);
  comprobar.deepEqual(detectarLenguaje('Buscamos personal de computación, análisis y atención al público.'), []);
});

prueba('solo crea reportes automáticos cuando detecta palabras y conserva el origen', async () => {
  const filas = [];
  const cliente = { from: (tabla) => {
    comprobar.equal(tabla, 'moderacion_reportes');
    return { insert: async (fila) => { filas.push(fila); return { error: null }; } };
  } };
  const contenido = { tipo: 'reporte', categoria: 'Reportes', origen: 'postulaciones', id: 'id', autor: 'Ana' };
  comprobar.equal(await reportarAutomaticamente(cliente, { ...contenido, texto: 'Experiencia en ventas' }), false);
  comprobar.equal(filas.length, 0);
  comprobar.equal(await reportarAutomaticamente(cliente, { ...contenido, texto: 'Te voy a matar' }), true);
  comprobar.equal(filas[0].estado, 'Pendiente');
  comprobar.match(filas[0].detalles, /^Origen: postulaciones\n/);
  await comprobar.rejects(() => reportarAutomaticamente({ from: () => ({ insert: async () => ({ error: {} }) }) },
    { ...contenido, texto: 'mierda' }), /no se pudo generar/);
});

prueba('conecta los estados de moderación con el contenido correspondiente', () => {
  const referencia = '12345678-1234-1234-1234-123456789abc';
  comprobar.equal(destinoModeracion({ tipo: 'comentario', referencia }).tabla, 'foros_respuestas');
  comprobar.equal(destinoModeracion({ tipo: 'valoracion', referencia }).visible, 'Aprobada');
  comprobar.equal(destinoModeracion({ tipo: 'reporte', referencia, detalles: 'Origen: vacantes\nReporte' }).oculto, 'Inactiva');
  comprobar.equal(destinoModeracion({ tipo: 'foro', referencia: 'Título del tema' }), null);
});

prueba('la vista omite lo resuelto, ofrece desocultar y filtra postulaciones', () => {
  const contenedor = { innerHTML: '', querySelectorAll: () => [] };
  const base = { tipo: 'foro', categoria: 'Foros', detalles: '', autor: '', referencia: '', fecha: '' };
  renderizarP15Moderacion(contenedor, [
    { ...base, id: '1', motivoOTitulo: 'YA_RESUELTO', estado: 'Aprobado' },
    { ...base, id: '2', motivoOTitulo: 'CONTENIDO_OCULTO', estado: 'Oculto' },
    { ...base, id: '3', motivoOTitulo: 'PENDIENTE', estado: 'Pendiente' }
  ], {});
  comprobar.doesNotMatch(contenedor.innerHTML, /YA_RESUELTO|Desestimar/);
  comprobar.match(contenedor.innerHTML, /CONTENIDO_OCULTO/);
  comprobar.match(contenedor.innerHTML, /Desocultar/);
  comprobar.match(contenedor.innerHTML, /data-categoria="Postulaciones"/);
});
