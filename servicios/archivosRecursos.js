import { randomUUID as crearIdentificador } from 'node:crypto';
import express from 'express';
import { esUuid } from './validaciones.js';

export const depositoAdjuntosRecursos = 'recursos-adjuntos';
export const audienciasRecursos = ['Visitantes', 'Candidatos registrados', 'Empresas'];
export const audienciaValida = (valores) => Array.isArray(valores) && valores.length > 0 && valores.length <= 3 && new Set(valores).size === valores.length && valores.every((valor) => audienciasRecursos.includes(valor));
export function puedeVerRecurso(recurso, rol = 'visitante') {
  if (rol === 'administrador') return true;
  const audiencia = { visitante: 'Visitantes', candidato: 'Candidatos registrados', empresa: 'Empresas' }[rol];
  return recurso.estado_publicacion === 'Publicado' && Boolean(audiencia) && Array.isArray(recurso.audiencia) && recurso.audiencia.includes(audiencia);
}
export function leerAdjunto(valor) {
  if (typeof valor !== 'string' || valor.length > 2000) return null;
  try {
    const archivo = JSON.parse(valor);
    return archivo.version === 1 && typeof archivo.nombre === 'string' && archivo.nombre.length > 0 && archivo.nombre.length <= 200 && !/[\u0000-\u001f\u007f\\/]/.test(archivo.nombre) &&
      /^adjuntos\/[0-9a-f-]{36}$/.test(archivo.ruta) && esUuid(archivo.ruta.slice(9)) && Number.isInteger(archivo.tamano) && archivo.tamano > 0 && archivo.tamano <= 4 * 1024 * 1024 ? archivo : null;
  } catch { return null; }
}
export const adjuntosValidos = (valores) => Array.isArray(valores) && valores.length <= 10 && valores.every((valor) => leerAdjunto(valor));
export function mapearAdjuntosRecurso(fila) {
  return (Array.isArray(fila.adjuntos) ? fila.adjuntos : []).map((valor, indice) => {
    const archivo = leerAdjunto(valor);
    return archivo ? { nombre: archivo.nombre, tamano: archivo.tamano, url: `/api/adjuntos-recursos/${fila.id}/${indice}` } : { nombre: typeof valor === 'string' ? valor : 'Archivo anterior', url: null };
  });
}
export async function retirarAdjuntosSinUso(supabase, valores) {
  for (const valor of valores) {
    const archivo = leerAdjunto(valor);
    if (!archivo) continue;
    const { data: usos, error } = await supabase.from('recursos_laborales').select('id').contains('adjuntos', `{${JSON.stringify(valor)}}`).limit(1);
    if (error) throw new Error('No se pudo comprobar si el adjunto sigue en uso.');
    if (!usos.length) {
      const { error: errorBorrado } = await supabase.storage.from(depositoAdjuntosRecursos).remove([archivo.ruta]);
      if (errorBorrado) throw new Error('No se pudo retirar el archivo sin uso.');
    }
  }
}

export function registrarArchivosRecursos(aplicacion, { conManejoErrores, exigirRol, obtenerContextoAutenticado, obtenerClienteOError }) {
  aplicacion.post('/api/recursos/adjuntos', express.raw({ type: 'application/octet-stream', limit: '4mb' }), conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await exigirRol(solicitud, respuesta, ['administrador']);
    if (!contexto) return;
    let nombre;
    try { nombre = decodeURIComponent(solicitud.get('X-File-Name') || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim(); }
    catch { return respuesta.status(400).json({ error: 'El nombre del archivo no es válido.' }); }
    if (!nombre || nombre.length > 200 || !Buffer.isBuffer(solicitud.body) || !solicitud.body.length) return respuesta.status(400).json({ error: 'Selecciona un archivo con contenido y un nombre de hasta 200 caracteres.' });
    const { data: deposito, error: errorDeposito } = await contexto.supabase.storage.getBucket(depositoAdjuntosRecursos);
    if (!deposito) {
      if (errorDeposito && !/not found/i.test(errorDeposito.message || '')) return respuesta.status(503).json({ error: 'No se pudo consultar el almacenamiento de adjuntos.' });
      const { error } = await contexto.supabase.storage.createBucket(depositoAdjuntosRecursos, { public: false, fileSizeLimit: 4 * 1024 * 1024 });
      if (error && !/already exists/i.test(error.message || '')) return respuesta.status(503).json({ error: 'No se pudo preparar el almacenamiento de adjuntos.' });
    } else if (deposito.public) return respuesta.status(503).json({ error: 'El almacenamiento de adjuntos debe ser privado.' });
    const archivo = { version: 1, nombre, ruta: `adjuntos/${crearIdentificador()}`, tamano: solicitud.body.length };
    const { error } = await contexto.supabase.storage.from(depositoAdjuntosRecursos).upload(archivo.ruta, solicitud.body, { contentType: 'application/octet-stream', upsert: false });
    if (error) return respuesta.status(503).json({ error: 'No se pudo subir el archivo. Intenta de nuevo.' });
    return respuesta.status(201).json({ adjunto: JSON.stringify(archivo) });
  }));
  aplicacion.delete('/api/recursos/adjuntos', conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await exigirRol(solicitud, respuesta, ['administrador']);
    if (!contexto) return;
    if (!leerAdjunto(solicitud.body?.adjunto)) return respuesta.status(400).json({ error: 'Adjunto no válido.' });
    await retirarAdjuntosSinUso(contexto.supabase, [solicitud.body.adjunto]);
    return respuesta.json({ eliminado: true });
  }));
  aplicacion.get('/api/adjuntos-recursos/:recursoId/:indice', conManejoErrores(async (solicitud, respuesta) => {
    respuesta.set('Cache-Control', 'private, no-store');
    if (!esUuid(solicitud.params.recursoId) || !/^\d{1,2}$/.test(solicitud.params.indice)) return respuesta.status(400).json({ error: 'Adjunto no válido.' });
    const contexto = await obtenerContextoAutenticado(solicitud, respuesta, true);
    if (respuesta.headersSent) return;
    const supabase = contexto?.supabase || obtenerClienteOError(respuesta);
    if (!supabase) return;
    const { data: recurso, error } = await supabase.from('recursos_laborales').select('id, adjuntos, estado_publicacion, audiencia').eq('id', solicitud.params.recursoId).maybeSingle();
    if (error) return respuesta.status(503).json({ error: 'No se pudo consultar el recurso.' });
    if (!recurso || !puedeVerRecurso(recurso, contexto?.rol)) return respuesta.status(404).json({ error: 'El adjunto no está disponible para esta cuenta.' });
    const adjunto = leerAdjunto(recurso.adjuntos?.[Number(solicitud.params.indice)]);
    if (!adjunto) return respuesta.status(404).json({ error: 'Este archivo no está disponible. Debe adjuntarse nuevamente.' });
    const { data: archivo, error: errorArchivo } = await supabase.storage.from(depositoAdjuntosRecursos).download(adjunto.ruta);
    if (errorArchivo || !archivo) return respuesta.status(404).json({ error: 'No se encontró el archivo adjunto.' });
    respuesta.set('Content-Type', 'application/octet-stream');
    respuesta.set('X-Content-Type-Options', 'nosniff');
    const nombreCodificado = encodeURIComponent(adjunto.nombre).replace(/['()*]/g, (caracter) => `%${caracter.charCodeAt(0).toString(16).toUpperCase()}`);
    respuesta.set('Content-Disposition', `attachment; filename*=UTF-8''${nombreCodificado}`);
    return respuesta.send(Buffer.from(await archivo.arrayBuffer()));
  }));
}
