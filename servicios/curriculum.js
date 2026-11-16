export async function quitarCurriculum({ supabase, perfil, usuario }) {
  const ruta = perfil.curriculum_url;
  const archivoPropio = typeof ruta === 'string' && ruta.startsWith(`${perfil.id}/`) && !ruta.includes('..');
  let conservarArchivo = false;
  if (archivoPropio) {
    const { data: referencias, error } = await supabase.from('postulaciones').select('id').eq('curriculum_url', ruta).limit(1);
    if (error) throw new Error('No se pudo comprobar el currículum. Intenta de nuevo.');
    conservarArchivo = referencias.length > 0;
  }
  let consulta = supabase.from('perfiles_candidatos').update({ curriculum_nombre: null, curriculum_url: null, actualizado_en: new Date().toISOString() })
    .eq('id', perfil.id).eq('usuario_id', usuario.id);
  consulta = ruta ? consulta.eq('curriculum_url', ruta) : consulta.is('curriculum_url', null);
  const { data: actualizado, error } = await consulta.select('id').maybeSingle();
  if (error) throw new Error('No se pudo quitar el currículum. Intenta de nuevo.');
  if (!actualizado) throw new Error('El currículum cambió durante la operación. Actualiza el perfil e intenta de nuevo.');
  if (archivoPropio && !conservarArchivo) {
    const { error: errorArchivo } = await supabase.storage.from('curriculums-candidatos').remove([ruta]);
    if (errorArchivo) console.error('El currículum se desvinculó del perfil, pero no se pudo retirar su archivo.');
  }
  return { eliminado: true, curriculum_nombre: '' };
}
