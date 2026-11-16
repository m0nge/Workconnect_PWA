import { esUuid } from './validaciones.js';

export function registrarFlujoPostulaciones(aplicacion, { conManejoErrores, obtenerCandidatoAutenticado, obtenerEmpresaAutenticada, reportarAutomaticamente }) {
  aplicacion.post('/api/candidato/postulaciones', conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
    if (!contexto) return;
    const vacanteId = solicitud.body?.vacante_id;
    if (!esUuid(vacanteId)) return respuesta.status(400).json({ error: 'La vacante seleccionada no es válida.' });
    const ruta = contexto.perfil.curriculum_url;
    if (!ruta || !ruta.startsWith(`${contexto.perfil.id}/`) || ruta.includes('..')) {
      return respuesta.status(400).json({ codigo: 'CV_REQUERIDO', error: 'Primero guarda tu currículum PDF en Mi perfil para postularte.' });
    }
    const { data: vacante, error: errorVacante } = await contexto.supabase.from('vacantes')
      .select('id, empresa_id, estado, fecha_limite, empresas!inner(id, estado_verificacion)').eq('id', vacanteId).maybeSingle();
    if (errorVacante) return respuesta.status(503).json({ error: 'No se pudo comprobar la vacante.' });
    if (!vacante || vacante.estado !== 'Activa' || vacante.empresas?.estado_verificacion !== 'Verificada') {
      return respuesta.status(404).json({ error: 'Esta vacante no está disponible.' });
    }
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (vacante.fecha_limite && vacante.fecha_limite < hoy) return respuesta.status(400).json({ error: 'El plazo de esta vacante ya finalizó.' });
    const { data: existente, error: errorConsulta } = await contexto.supabase.from('postulaciones')
      .select('id').eq('candidato_id', contexto.perfil.id).eq('vacante_id', vacanteId).limit(1);
    if (errorConsulta) return respuesta.status(503).json({ error: 'No se pudo comprobar si ya te postulaste.' });
    if (existente?.length) return respuesta.status(409).json({ error: 'Ya te postulaste a esta vacante.' });
    const { data: datosRespuesta, error } = await contexto.supabase.from('postulaciones').insert({
      vacante_id: vacante.id, candidato_id: contexto.perfil.id, curriculum_url: ruta, estado: 'Nueva'
    }).select('id, estado, creado_en').single();
    if (error) return respuesta.status(error.code === '23505' ? 409 : 503).json({ error: error.code === '23505' ? 'Ya te postulaste a esta vacante.' : 'No se pudo guardar la postulación.' });
    // La postulación ya fue recibida: un fallo al reportar no debe hacer creer que no se envió.
    let avisoModeracion = false;
    try {
      await reportarAutomaticamente(contexto.supabase, {
        texto: [contexto.usuario.nombre, contexto.perfil.titulo_profesional, contexto.perfil.resumen_laboral].filter(Boolean).join(' '),
        tipo: 'reporte', categoria: 'Reportes', origen: 'postulaciones', id: datosRespuesta.id, autor: contexto.usuario.nombre
      });
    } catch (errorReporte) { avisoModeracion = true; console.error(errorReporte.message); }
    return respuesta.status(201).json({ ...datosRespuesta, ...(avisoModeracion ? { avisoModeracion: true } : {}) });
  }));

  aplicacion.get('/api/empresa/postulaciones/:id/curriculum', conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
    if (!contexto) return;
    if (!esUuid(solicitud.params.id)) return respuesta.status(400).json({ error: 'Postulación no válida.' });
    const { data: datosRespuesta, error } = await contexto.supabase.from('postulaciones')
      .select('id, candidato_id, curriculum_url, vacantes!inner(empresa_id)')
      .eq('id', solicitud.params.id).eq('vacantes.empresa_id', contexto.empresa.id).maybeSingle();
    if (error) return respuesta.status(503).json({ error: 'No se pudo comprobar la postulación.' });
    if (!datosRespuesta) return respuesta.status(404).json({ error: 'La postulación no pertenece a tu empresa.' });
    if (!datosRespuesta.curriculum_url?.startsWith(`${datosRespuesta.candidato_id}/`) || datosRespuesta.curriculum_url.includes('..')) {
      return respuesta.status(404).json({ error: 'No se encontró un currículum válido.' });
    }
    const { data: archivo, error: errorArchivo } = await contexto.supabase.storage.from('curriculums-candidatos').download(datosRespuesta.curriculum_url);
    if (errorArchivo || !archivo) return respuesta.status(404).json({ error: 'No se pudo descargar el currículum.' });
    respuesta.set('Cache-Control', 'private, no-store');
    respuesta.set('Content-Type', 'application/pdf');
    respuesta.set('Content-Disposition', 'attachment; filename="curriculum.pdf"');
    return respuesta.send(Buffer.from(await archivo.arrayBuffer()));
  }));
}
