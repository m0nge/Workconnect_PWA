import { esPortadaRecurso } from './validaciones.js';
import { audienciaValida, retirarAdjuntosSinUso } from './archivosRecursos.js';

export function validarEdicionRecurso(datos) {
  if (datos.audiencia !== undefined && !audienciaValida(datos.audiencia)) return null;
  const texto = (campo, min, max) => typeof datos[campo] === 'string' && datos[campo].trim().length >= min && datos[campo].trim().length <= max;
  if (!texto('titulo', 8, 160) || !texto('resumen', 20, 500) || !texto('contenido', 30, 10000) ||
      !['Artículo', 'Consejo', 'Tutorial', 'Noticia'].includes(datos.categoria) ||
      !['Básico', 'Intermedio', 'Avanzado'].includes(datos.nivelLectura) ||
      !Number.isInteger(datos.tiempoLecturaMin) || datos.tiempoLecturaMin < 1 || datos.tiempoLecturaMin > 60 ||
      (datos.imagenPortadaUrl !== undefined && (typeof datos.imagenPortadaUrl !== 'string' || !esPortadaRecurso(datos.imagenPortadaUrl)))) return null;
  return {
    titulo: datos.titulo.trim(), categoria: datos.categoria, nivel_lectura: datos.nivelLectura,
    tiempo_lectura_min: datos.tiempoLecturaMin, resumen: datos.resumen.trim(), contenido: datos.contenido.trim(),
    ...(datos.imagenPortadaUrl !== undefined ? { imagen_portada_url: datos.imagenPortadaUrl.trim() || null } : {}),
    ...(datos.audiencia !== undefined ? { audiencia: [...datos.audiencia] } : {})
  };
}

export function validarEdicionForo(datos) {
  if (typeof datos.titulo !== 'string' || datos.titulo.trim().length < 5 || datos.titulo.trim().length > 120 ||
      typeof datos.categoria !== 'string' || !datos.categoria.trim() || datos.categoria.length > 100 ||
      typeof datos.contenido !== 'string' || datos.contenido.trim().length < 20 || datos.contenido.length > 2000) return null;
  return { titulo: datos.titulo.trim(), categoria: datos.categoria.trim(), mensaje: datos.contenido.trim() };
}

export function registrarGestionContenido(aplicacion, { exigirRol, conManejoErrores, mapearRecurso, reportarAutomaticamente }) {
  const administrar = (manejador) => conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await exigirRol(solicitud, respuesta, ['administrador']);
    if (!contexto) return;
    if (solicitud.params.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(solicitud.params.id)) {
      return respuesta.status(400).json({ error: 'El identificador no es válido.' });
    }
    return manejador(solicitud, respuesta, contexto);
  });
  const mapearForo = (fila) => ({ ...fila, autor: fila.usuarios?.nombre || 'Usuario' });

  aplicacion.get('/api/admin/foros', administrar(async (_solicitud, respuesta, { supabase }) => {
    const { data: datosRespuesta, error } = await supabase.from('foros_temas')
      .select('id, titulo, categoria, mensaje, estado, creado_en, usuarios(nombre)').order('creado_en', { ascending: false });
    if (error) return respuesta.status(503).json({ error: 'No se pudieron cargar los temas.' });
    return respuesta.json((datosRespuesta || []).map(mapearForo));
  }));

  for (const configuracion of [
    { ruta: '/api/recursos', tabla: 'recursos_laborales', columna: 'estado_publicacion', estados: ['Publicado', 'Borrador'], campos: '*, usuarios(nombre)', validar: validarEdicionRecurso, mapear: mapearRecurso },
    { ruta: '/api/admin/foros', tabla: 'foros_temas', columna: 'estado', estados: ['Activo', 'Oculto'], campos: '*, usuarios(nombre)', validar: validarEdicionForo, mapear: mapearForo }
  ]) {
    aplicacion.put(`${configuracion.ruta}/:id`, administrar(async (solicitud, respuesta, contexto) => {
      const campos = configuracion.validar(solicitud.body || {});
      if (!campos) return respuesta.status(400).json({ error: 'Revisa el título, categoría y contenido. Los campos no cumplen los límites permitidos.' });
      const { data: datosRespuesta, error } = await contexto.supabase.from(configuracion.tabla).update(campos)
        .eq('id', solicitud.params.id).select(configuracion.campos).maybeSingle();
      if (error) return respuesta.status(503).json({ error: 'No se pudo guardar la edición.' });
      if (!datosRespuesta) return respuesta.status(404).json({ error: 'El contenido ya no existe.' });
      if (configuracion.tabla === 'foros_temas') {
        await reportarAutomaticamente(contexto.supabase, { texto: `${campos.titulo} ${campos.mensaje}`, tipo: 'foro', categoria: 'Foros', id: datosRespuesta.id, autor: contexto.usuario.nombre });
      }
      return respuesta.json(configuracion.mapear(datosRespuesta));
    }));

    aplicacion.patch(`${configuracion.ruta}/:id/estado`, administrar(async (solicitud, respuesta, { supabase }) => {
      const estado = solicitud.body?.estado;
      if (!configuracion.estados.includes(estado)) return respuesta.status(400).json({ error: 'El estado no es válido.' });
      const { data: datosRespuesta, error } = await supabase.from(configuracion.tabla).update({ [configuracion.columna]: estado })
        .eq('id', solicitud.params.id).select(configuracion.campos).maybeSingle();
      if (error) return respuesta.status(503).json({ error: 'No se pudo cambiar la visibilidad.' });
      if (!datosRespuesta) return respuesta.status(404).json({ error: 'El contenido ya no existe.' });
      return respuesta.json(configuracion.mapear(datosRespuesta));
    }));

    aplicacion.delete(`${configuracion.ruta}/:id`, administrar(async (solicitud, respuesta, { supabase }) => {
      const { data: datosRespuesta, error } = await supabase.from(configuracion.tabla).delete().eq('id', solicitud.params.id).select(configuracion.tabla === 'recursos_laborales' ? 'id, adjuntos' : 'id').maybeSingle();
      if (error) return respuesta.status(409).json({ error: 'No se pudo eliminar el contenido. Puede tener registros asociados que impiden borrarlo.' });
      if (!datosRespuesta) return respuesta.status(404).json({ error: 'El contenido ya no existe.' });
      if (configuracion.tabla === 'recursos_laborales') {
        try { await retirarAdjuntosSinUso(supabase, datosRespuesta.adjuntos || []); }
        catch { console.error('El recurso se eliminó, pero no se pudieron retirar todos sus adjuntos.'); }
      }
      return respuesta.json({ eliminado: true, id: datosRespuesta.id });
    }));
  }
}
