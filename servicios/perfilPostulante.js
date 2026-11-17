import { esUuid } from './validaciones.js';

export function registrarPerfilPostulante(aplicacion, { conManejoErrores, obtenerEmpresaAutenticada }) {
  aplicacion.get('/api/empresa/postulaciones/:id/perfil', conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
    if (!contexto) return;
    if (!esUuid(solicitud.params.id)) return respuesta.status(400).json({ error: 'Postulación no válida.' });
    const { data: postulacion, error } = await contexto.supabase.from('postulaciones')
      .select('id, candidato_id, curriculum_url, vacantes!inner(empresa_id), perfiles_candidatos!inner(titulo_profesional, resumen_laboral, usuarios!inner(nombre, email, telefono, ubicacion, foto_url))')
      .eq('id', solicitud.params.id).eq('vacantes.empresa_id', contexto.empresa.id).maybeSingle();
    if (error) return respuesta.status(503).json({ error: 'No se pudo consultar la postulación.' });
    if (!postulacion) return respuesta.status(404).json({ error: 'La postulación no existe o no pertenece a tu empresa.' });
    const [experiencias, estudios, habilidades] = await Promise.all([
      contexto.supabase.from('experiencias_laborales').select('puesto, empresa, fecha_inicio, fecha_fin, es_trabajo_actual, descripcion').eq('candidato_id', postulacion.candidato_id).order('fecha_inicio', { ascending: false }),
      contexto.supabase.from('estudios_candidatos').select('carrera_programa, institucion, nivel_academico, anio_inicio, anio_fin').eq('candidato_id', postulacion.candidato_id).order('anio_inicio', { ascending: false }),
      contexto.supabase.from('habilidades_candidatos').select('habilidad, nivel_dominio').eq('candidato_id', postulacion.candidato_id).order('habilidad')
    ]);
    if ([experiencias, estudios, habilidades].some((resultado) => resultado.error)) return respuesta.status(503).json({ error: 'No se pudo cargar el perfil completo. Intenta de nuevo.' });
    const perfil = postulacion.perfiles_candidatos;
    respuesta.set('Cache-Control', 'private, no-store');
    return respuesta.json({
      perfil: { nombre: perfil.usuarios.nombre, email: perfil.usuarios.email, telefono: perfil.usuarios.telefono || '', ubicacion: perfil.usuarios.ubicacion || '', foto_url: perfil.usuarios.foto_url || '', titulo_profesional: perfil.titulo_profesional || '', resumen_laboral: perfil.resumen_laboral || '' },
      experiencias: experiencias.data || [], estudios: estudios.data || [], habilidades: habilidades.data || [],
      curriculum_url: postulacion.curriculum_url ? `/api/empresa/postulaciones/${postulacion.id}/curriculum` : null
    });
  }));
}
