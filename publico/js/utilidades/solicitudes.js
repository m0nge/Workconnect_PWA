export async function solicitarApi(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...opciones.headers }
  });
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const mensaje = respuesta.status === 413
      ? 'El contenido o la imagen supera el tamaño máximo permitido.'
      : respuesta.status === 404 ? 'El recurso solicitado no fue encontrado.'
      : respuesta.status >= 500 ? 'Error interno del servidor. Intenta de nuevo.'
      : 'No se pudo completar la solicitud.';
    const error = new Error(resultado.error || mensaje);
    error.status = respuesta.status;
    error.requiereConfiguracion = Boolean(resultado.requiereConfiguracion);
    error.urlSupabase = resultado.urlSupabase || '';
    throw error;
  }
  return resultado;
}
