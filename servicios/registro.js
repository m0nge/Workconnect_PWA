import cifrado from 'bcryptjs';

export async function crearUsuarioRegistrado(supabase, { nombre, correo, contrasena, rol, telefono, ubicacion }) {
  const roles = { candidato: 'Candidato/a', empresa: 'Empresa' };
  if (!Object.hasOwn(roles, rol)) return { data: null, error: { code: '22023' } };
  const patronCorreo = correo.replace(/[\\%_]/g, '\\$&');
  const { data: existente, error: errorConsulta } = await supabase.from('usuarios').select('id').ilike('email', patronCorreo).maybeSingle();
  if (errorConsulta) return { data: null, error: errorConsulta };
  if (existente) return { data: null, error: { code: '23505' } };
  const claveCifrada = (await cifrado.hash(contrasena, 12)).replace(/^\$2b\$/, '$2a$');
  return supabase.from('usuarios').insert({
    nombre, email: correo, password_hash: claveCifrada, rol: roles[rol], estado: 'Activo', telefono, ubicacion
  }).select('id, nombre, email, rol, estado, foto_url').single();
}

export async function eliminarRegistroIncompleto(supabase, usuarioId) {
  for (const tabla of ['perfiles_candidatos', 'empresas']) {
    const { error } = await supabase.from(tabla).delete().eq('usuario_id', usuarioId);
    if (error) return false;
  }
  const { error } = await supabase.from('usuarios').delete().eq('id', usuarioId);
  return !error;
}
