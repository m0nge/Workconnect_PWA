import { validarVacanteEmpresa } from '../publico/js/utilidades/validacionVacante.js';
export { validarVacanteEmpresa };

export function registrarEdicionVacanteEmpresa(aplicacion, { conManejoErrores, obtenerEmpresaAutenticada, reportarAutomaticamente }) {
  aplicacion.put('/api/empresa/vacantes/:id', conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
    if (!contexto) return;
    const { data: existente, error: errorConsulta } = await contexto.supabase.from('vacantes').select('id, fecha_limite')
      .eq('id', solicitud.params.id).eq('empresa_id', contexto.empresa.id).maybeSingle();
    if (errorConsulta) return respuesta.status(503).json({ error: 'No se pudo consultar la oferta.' });
    if (!existente) return respuesta.status(404).json({ error: 'La oferta no existe o no pertenece a tu empresa.' });
    const validacion = validarVacanteEmpresa(solicitud.body || {}, existente.fecha_limite);
    if (validacion.error) return respuesta.status(400).json({ error: validacion.error, errores: validacion.errores });
    const { data: vacante, error } = await contexto.supabase.from('vacantes').update(validacion.datos)
      .eq('id', solicitud.params.id).eq('empresa_id', contexto.empresa.id).select('*').maybeSingle();
    if (error) return respuesta.status(503).json({ error: 'No se pudo guardar la oferta.' });
    if (!vacante) return respuesta.status(404).json({ error: 'La oferta ya no está disponible.' });
    let avisoModeracion = false;
    try {
      await reportarAutomaticamente(contexto.supabase, { texto: [vacante.titulo, vacante.descripcion, ...vacante.funciones, ...vacante.requisitos, ...vacante.beneficios].join(' '), tipo: 'reporte', categoria: 'Reportes', origen: 'vacantes', id: vacante.id, autor: contexto.usuario.nombre });
    } catch { avisoModeracion = true; }
    return respuesta.json({ guardado: true, vacante, ...(avisoModeracion ? { avisoModeracion: true } : {}) });
  }));
}
