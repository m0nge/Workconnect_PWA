export const formatosFoto = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';

export async function prepararFoto(archivo) {
  if (!archivo?.size || archivo.size > 10 * 1024 * 1024) throw new Error('Selecciona una imagen de máximo 10 MB.');
  if (!/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(archivo.name) &&
      !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'].includes(archivo.type)) {
    throw new Error('Selecciona una imagen JPG, PNG, WebP, GIF, BMP o AVIF.');
  }
  const direccion = URL.createObjectURL(archivo);
  try {
    const imagen = new Image();
    imagen.src = direccion;
    await imagen.decode();
    if (!imagen.naturalWidth || !imagen.naturalHeight || imagen.naturalWidth * imagen.naturalHeight > 40000000) {
      throw new Error('La imagen es demasiado grande. Selecciona una de hasta 40 megapíxeles.');
    }
    const escala = Math.min(1, 1200 / Math.max(imagen.naturalWidth, imagen.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
    lienzo.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
    lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const resultado = await new Promise((resolver) => lienzo.toBlob(resolver, 'image/webp', 0.88));
    if (!resultado) throw new Error('No se pudo preparar la imagen.');
    return resultado;
  } catch (error) {
    if (error.name === 'EncodingError') throw new Error('No se pudo leer la imagen. Prueba con otra foto JPG, PNG o WebP.');
    throw error;
  } finally { URL.revokeObjectURL(direccion); }
}

export async function subirFoto(ruta, archivo) {
  const imagen = await prepararFoto(archivo);
  const respuesta = await fetch(ruta, { method: 'POST', headers: { 'Content-Type': imagen.type }, body: imagen });
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo guardar la imagen.');
  document.dispatchEvent(new CustomEvent('foto-actualizada', { detail: resultado.foto_url || resultado.logo_url }));
  return resultado;
}
