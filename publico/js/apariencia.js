const claveTema = 'workconnect-tema';
const preferenciaSistema = window.matchMedia('(prefers-color-scheme: dark)');
let temaElegido = null;
try { temaElegido = localStorage.getItem(claveTema); } catch {}
if (!['claro', 'oscuro'].includes(temaElegido)) temaElegido = null;

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  document.documentElement.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  actualizarControlTema();
}

function actualizarControlTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  document.querySelectorAll('[data-alternar-tema]').forEach((boton) => {
    const etiqueta = oscuro ? 'Modo claro' : 'Modo oscuro';
    if (boton.textContent !== etiqueta) boton.textContent = etiqueta;
    boton.setAttribute('aria-label', `Cambiar a ${etiqueta.toLowerCase()}`);
    boton.setAttribute('aria-pressed', String(oscuro));
  });
}

function normalizarEtiqueta(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^[^a-zA-Z]+/, '').trim().toLowerCase();
}

function clasificarAccion(texto) {
  const limpio = normalizarEtiqueta(texto);
  if (/^(aprobar|aceptar|activar|desocultar|verificar|marcar revisado)\b/.test(limpio)) return 'confirmar';
  if (/^(desactivar|suspender|ocultar|denegar|rechazar|devolver)\b/.test(limpio)) return 'desactivar';
  if (/^(eliminar|borrar)\b/.test(limpio)) return 'eliminar';
  if (/^(editar|modificar)\b/.test(limpio)) return 'editar';
  if (/^(guardar|publicar|crear|responder|enviar|iniciar sesion|ingresar|registrarse)\b/.test(limpio)) return 'principal';
  return null;
}

function clasificarEstado(texto) {
  const limpio = normalizarEtiqueta(texto);
  if (/^(activ[oa]|verificad[oa]|aprobad[oa]|publicad[oa]|contratad[oa]|aceptad[oa])$/.test(limpio)) return 'positivo';
  if (/^(pendiente|en revision)$/.test(limpio)) return 'pendiente';
  if (/^(suspendid[oa]|rechazad[oa]|devuelt[oa])$/.test(limpio)) return 'negativo';
  if (/^(inactiv[oa]|ocult[oa]|borrador)$/.test(limpio)) return 'neutro';
  if (/^(nueva|entrevista|enviada)$/.test(limpio)) return 'informativo';
  return null;
}

function unificarAcciones(raiz) {
  raiz.querySelectorAll('#area-contenido button, #area-contenido a.boton, #modal-raiz button, #modal-raiz a.boton').forEach((boton) => {
    if (boton.matches('[role="tab"], .boton-pestana, .acceso-pestana, .enlace-nav-superior')) return;
    const accion = clasificarAccion(boton.textContent || '');
    if (!accion) return;
    boton.dataset.accionVisual = accion;
    // Las acciones comparten tamaño y color aunque provengan de formularios distintos.
    ['color', 'background', 'background-color', 'border', 'border-color', 'border-radius', 'font-size', 'font-weight', 'padding'].forEach((propiedad) => boton.style.removeProperty(propiedad));
  });
  raiz.querySelectorAll('.etiqueta-estado, .etiqueta-cuadrada, .insignia-estado-postulacion').forEach((etiqueta) => {
    const estado = clasificarEstado(etiqueta.textContent || '');
    if (!estado) return;
    etiqueta.dataset.estadoVisual = estado;
    ['color', 'background', 'background-color', 'border-color', 'font-size', 'font-weight'].forEach((propiedad) => etiqueta.style.removeProperty(propiedad));
  });
}

aplicarTema(temaElegido || (preferenciaSistema.matches ? 'oscuro' : 'claro'));
document.addEventListener('click', (evento) => {
  if (!evento.target.closest('[data-alternar-tema]')) return;
  temaElegido = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  try { localStorage.setItem(claveTema, temaElegido); } catch {}
  aplicarTema(temaElegido);
});
preferenciaSistema.addEventListener('change', (evento) => {
  if (!temaElegido) aplicarTema(evento.matches ? 'oscuro' : 'claro');
});
const observadorApariencia = new MutationObserver(() => {
  actualizarControlTema();
  unificarAcciones(document);
});
observadorApariencia.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
