import { randomUUID as crearIdentificador } from 'node:crypto';

const deposito = 'fotos-candidatos';

export function identificarFoto(contenido) {
  if (!Buffer.isBuffer(contenido)) return null;
  if (contenido.length > 8 && contenido.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { tipo: 'image/png', extension: 'png' };
  if (contenido.length > 3 && contenido[0] === 255 && contenido[1] === 216 && contenido[2] === 255) return { tipo: 'image/jpeg', extension: 'jpg' };
  if (contenido.length > 12 && contenido.toString('ascii', 0, 4) === 'RIFF' && contenido.toString('ascii', 8, 12) === 'WEBP') return { tipo: 'image/webp', extension: 'webp' };
  return null;
}

export async function guardarFoto(contexto, contenido, esEmpresa = false) {
  const formato = identificarFoto(contenido);
  if (!formato) throw new Error('Selecciona una imagen válida JPG, PNG o WebP.');
  const { supabase, usuario, empresa } = contexto;
  const prefijo = esEmpresa ? `empresas/${empresa.id}/` : `${usuario.id}/`;
  const ruta = `${prefijo}${crearIdentificador()}.${formato.extension}`;
  const almacen = supabase.storage.from(deposito);
  const { error: errorSubida } = await almacen.upload(ruta, contenido, { contentType: formato.tipo, cacheControl: '3600', upsert: false });
  if (errorSubida) throw new Error('No se pudo subir la imagen. Intenta de nuevo.');
  const { data: direccion } = almacen.getPublicUrl(ruta);
  const url = direccion.publicUrl;
  const { error: errorUsuario } = await supabase.from('usuarios').update({ foto_url: url }).eq('id', usuario.id).select('id').single();
  if (errorUsuario) {
    await almacen.remove([ruta]);
    throw new Error('No se pudo guardar la foto en el perfil. Intenta de nuevo.');
  }
  if (esEmpresa) {
    const { error } = await supabase.from('empresas').update({ logo_url: url }).eq('id', empresa.id).eq('usuario_id', usuario.id).select('id').single();
    if (error) {
      const { error: errorRestauracion } = await supabase.from('usuarios').update({ foto_url: usuario.foto_url || null }).eq('id', usuario.id);
      if (!errorRestauracion) await almacen.remove([ruta]);
      throw new Error('No se pudo actualizar el logo de la empresa. Intenta de nuevo.');
    }
  }
  const anteriores = [...new Set([usuario.foto_url, esEmpresa && empresa.logo_url].filter(Boolean))];
  const base = almacen.getPublicUrl('').data.publicUrl;
  for (const anterior of anteriores) {
    if (!anterior.startsWith(base)) continue;
    const archivo = anterior.slice(base.length).split('?')[0];
    if (archivo.startsWith(prefijo) && !archivo.slice(prefijo.length).includes('/') && archivo !== ruta) {
      const { error } = await almacen.remove([archivo]);
      if (error) console.error('No se pudo retirar la imagen anterior del almacenamiento.');
    }
  }
  return url;
}
