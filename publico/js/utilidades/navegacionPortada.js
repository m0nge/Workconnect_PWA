const secciones = { P01: 'inicio-empleos', P04: 'inicio-recursos', P17: 'inicio-recursos', P05: 'inicio-foros' };
let observadorSecciones = null;

export function seccionDePortada(pantalla) {
  return secciones[pantalla] || null;
}

function marcarSeccion(seccion) {
  document.querySelectorAll('#navegacion-superior [data-pantalla]').forEach((boton) => {
    const activo = seccionDePortada(boton.dataset.pantalla) === seccion;
    boton.classList.toggle('activo', activo);
    if (activo) boton.setAttribute('aria-current', 'location');
    else boton.removeAttribute('aria-current');
  });
}

export function desplazarASeccion(seccion) {
  const destino = document.getElementById(seccion);
  if (!destino) return false;
  destino.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  marcarSeccion(seccion);
  return true;
}

export function limpiarNavegacionPortada() {
  observadorSecciones?.disconnect();
  observadorSecciones = null;
}

export function observarSeccionesPortada(contenedor) {
  limpiarNavegacionPortada();
  if (!('IntersectionObserver' in window)) return;
  observadorSecciones = new IntersectionObserver((entradas) => {
    const visibles = entradas.filter((entrada) => entrada.isIntersecting);
    if (visibles.length) marcarSeccion(visibles.sort((primera, segunda) => Math.abs(primera.boundingClientRect.top) - Math.abs(segunda.boundingClientRect.top))[0].target.id);
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  contenedor.querySelectorAll('[data-seccion-portada]').forEach((seccion) => observadorSecciones.observe(seccion));
}
