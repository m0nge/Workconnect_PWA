import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { seccionDePortada, desplazarASeccion } from '../publico/js/utilidades/navegacionPortada.js';

prueba('los enlaces públicos corresponden a las secciones en orden y no incluyen pantallas de cuenta', () => {
  comprobar.equal(seccionDePortada('P01'), 'inicio-empleos');
  comprobar.equal(seccionDePortada('P17'), 'inicio-recursos');
  comprobar.equal(seccionDePortada('P04'), 'inicio-recursos');
  comprobar.equal(seccionDePortada('P05'), 'inicio-foros');
  comprobar.equal(seccionDePortada('P08'), null);
  comprobar.equal(seccionDePortada('P11'), null);
});

prueba('desplaza al destino y respeta la preferencia de reducir movimiento', () => {
  const documentoAnterior = globalThis.document;
  const ventanaAnterior = globalThis.window;
  try {
    let opciones;
    globalThis.document = { getElementById: (id) => id === 'inicio-foros' ? { scrollIntoView: (valor) => { opciones = valor; } } : null, querySelectorAll: () => [] };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    comprobar.equal(desplazarASeccion('inicio-foros'), true);
    comprobar.equal(opciones.behavior, 'smooth');
    globalThis.window.matchMedia = () => ({ matches: true });
    desplazarASeccion('inicio-foros');
    comprobar.equal(opciones.behavior, 'auto');
    comprobar.equal(desplazarASeccion('seccion-inexistente'), false);
  } finally {
    if (documentoAnterior === undefined) delete globalThis.document; else globalThis.document = documentoAnterior;
    if (ventanaAnterior === undefined) delete globalThis.window; else globalThis.window = ventanaAnterior;
  }
});
