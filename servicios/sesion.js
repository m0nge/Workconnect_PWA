import { createHmac as crearFirmaHmac, timingSafeEqual as compararFirmas } from 'node:crypto';

export const duracionSesion = 8 * 60 * 60;

function firmar(contenido) {
  const secreto = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secreto) throw new Error('Falta configurar SESSION_SECRET para firmar sesiones.');
  return crearFirmaHmac('sha256', secreto).update(`workconnect-session:${contenido}`).digest();
}

export function crearTokenSesion(usuarioId) {
  const contenido = Buffer.from(JSON.stringify({
    usuarioId,
    exp: Math.floor(Date.now() / 1000) + duracionSesion
  })).toString('base64url');
  return `${contenido}.${firmar(contenido).toString('base64url')}`;
}

export function validarTokenSesion(token) {
  if (!token || token.length > 4096) return null;
  try {
    const partes = token.split('.');
    if (partes.length !== 2) return null;
    const [contenido, firma] = partes;
    const recibida = Buffer.from(firma, 'base64url');
    const esperada = firmar(contenido);
    if (recibida.length !== esperada.length || !compararFirmas(recibida, esperada)) return null;
    const sesion = JSON.parse(Buffer.from(contenido, 'base64url').toString('utf8'));
    if (!sesion.usuarioId || !Number.isFinite(sesion.exp) || sesion.exp <= Date.now() / 1000) return null;
    return sesion;
  } catch {
    return null;
  }
}
