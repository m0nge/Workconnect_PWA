export const esUuid = (valor) => typeof valor === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
export const esTexto = (valor, min, max) => typeof valor === 'string' && valor.trim().length >= min && valor.trim().length <= max;
export const esCorreo = (valor) => typeof valor === 'string' && valor.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
export function esFecha(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) && new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
}
export function esTelefono(valor, requerido = false) {
  if (!requerido && (valor === null || valor === undefined || valor === '')) return true;
  return typeof valor === 'string' && valor.length <= 30 && /^[+\d\s()-]+$/.test(valor) && valor.replace(/\D/g, '').length >= 8 && valor.replace(/\D/g, '').length <= 15;
}
export function esUrlWeb(valor) {
  if (valor === null || valor === undefined || valor === '') return true;
  if (typeof valor !== 'string' || valor.length > 2000) return false;
  try { return ['https:', 'http:'].includes(new URL(valor).protocol); } catch { return false; }
}
export const esNumeroCampo = (valor) => (typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '')) && Number.isFinite(Number(valor));

export function esPortadaRecurso(valor) {
  if (esUrlWeb(valor)) return true;
  if (typeof valor !== 'string' || valor.length > 2800000) return false;
  const coincidencia = valor.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!coincidencia) return false;
  const imagen = Buffer.from(coincidencia[2], 'base64');
  if (imagen.length > 2 * 1024 * 1024) return false;
  if (coincidencia[1] === 'jpeg') return imagen.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (coincidencia[1] === 'png') return imagen.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return imagen.subarray(0, 4).toString() === 'RIFF' && imagen.subarray(8, 12).toString() === 'WEBP';
}

export function crearControlAcceso(obtenerContextoAutenticado) {
  return async (solicitud, respuesta, siguiente) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(solicitud.method)) return siguiente();
    if (solicitud.method === 'POST' && ['/auth/login', '/auth/registro', '/auth/logout'].includes(solicitud.path)) return siguiente();
    const contexto = await obtenerContextoAutenticado(solicitud, respuesta);
    if (!contexto) return;
    const rolRequerido = /^\/candidato(?:\/|$)/.test(solicitud.path) ? 'candidato' :
      /^\/empresa(?:\/|$)/.test(solicitud.path) ? 'empresa' :
      /^\/(admin|usuarios|empresas|vacantes|moderacion|verificaciones|recursos)(?:\/|$)/.test(solicitud.path) ? 'administrador' : null;
    if (rolRequerido && contexto.rol !== rolRequerido) return respuesta.status(403).json({ error: 'Tu cuenta no tiene permisos para esta operación.' });
    return siguiente();
  };
}
