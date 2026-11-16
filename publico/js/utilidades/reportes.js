import { pedirMotivo } from '../componentes/dialogos.js';

export async function reportarContenido(origen, id, notificar) {
  try {
    const consultaSesion = await fetch('/api/auth/sesion');
    const sesion = await consultaSesion.json();
    if (!consultaSesion.ok || !sesion.autenticado) {
      notificar('Inicia sesión para reportar contenido.');
      return;
    }
    const motivo = await pedirMotivo();
    if (!motivo) return;
    if (motivo.trim().length < 5 || motivo.length > 1000) {
      notificar('El motivo debe tener entre 5 y 1000 caracteres.');
      return;
    }
    const respuesta = await fetch('/api/reportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origen, id, motivo })
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo enviar el reporte.');
    notificar('Reporte enviado al administrador.');
  } catch (error) {
    notificar(error.message);
  }
}
