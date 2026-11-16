import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { readFileSync as leerArchivo } from 'node:fs';
import { createContext as crearContexto, runInContext as evaluarContexto } from 'node:vm';
import { solicitarApi } from '../publico/js/utilidades/solicitudes.js';

const codigo = leerArchivo(new URL('../publico/js/apariencia.js', import.meta.url), 'utf8');
function prepararTema(guardado, oscuroSistema = false, almacenamientoBloqueado = false) {
  const eventos = {};
  const valores = new Map([['workconnect-tema', guardado]]);
  const boton = { textContent: '', atributos: {}, setAttribute(nombre, valor) { this.atributos[nombre] = valor; } };
  const documento = {
    documentElement: { dataset: {}, style: {} },
    querySelectorAll: () => [boton],
    addEventListener: (evento, manejar) => { eventos[evento] = manejar; }
  };
  const entorno = crearContexto({
    document: documento,
    window: { matchMedia: () => ({ matches: oscuroSistema, addEventListener: (evento, manejar) => { eventos.sistema = manejar; } }) },
    localStorage: {
      getItem: () => { if (almacenamientoBloqueado) throw new Error('Almacenamiento no disponible'); return guardado; },
      setItem: (clave, valor) => { if (almacenamientoBloqueado) throw new Error('Almacenamiento no disponible'); valores.set(clave, valor); }
    },
    MutationObserver: class { observe() {} }
  });
  evaluarContexto(codigo, entorno);
  return { documento, eventos, valores, boton, entorno };
}

prueba('respeta el tema guardado y conserva la elección al alternar', () => {
  const { documento, eventos, valores, boton } = prepararTema('oscuro', false);
  comprobar.equal(documento.documentElement.dataset.tema, 'oscuro');
  comprobar.equal(boton.textContent, 'Modo claro');
  comprobar.equal(boton.atributos['aria-pressed'], 'true');
  eventos.click({ target: { closest: () => boton } });
  comprobar.equal(documento.documentElement.dataset.tema, 'claro');
  comprobar.equal(valores.get('workconnect-tema'), 'claro');
  eventos.sistema({ matches: true });
  comprobar.equal(documento.documentElement.dataset.tema, 'claro');
});

prueba('sigue al sistema sin elección previa y funciona con almacenamiento bloqueado', () => {
  const { documento, eventos, boton } = prepararTema(null, true, true);
  comprobar.equal(documento.documentElement.dataset.tema, 'oscuro');
  eventos.sistema({ matches: false });
  comprobar.equal(documento.documentElement.dataset.tema, 'claro');
  eventos.click({ target: { closest: () => boton } });
  comprobar.equal(documento.documentElement.dataset.tema, 'oscuro');
});

prueba('las etiquetas equivalentes reciben la misma acción y los estados se distinguen', () => {
  const { entorno } = prepararTema('claro');
  for (const texto of ['Aprobar', 'Aceptar al candidato', 'Activar publicación', 'Desocultar', 'Marcar revisado']) {
    comprobar.equal(evaluarContexto(`clasificarAccion(${JSON.stringify(texto)})`, entorno), 'confirmar');
  }
  for (const texto of ['Desactivar', 'Ocultar', 'Suspender', 'Denegar']) {
    comprobar.equal(evaluarContexto(`clasificarAccion(${JSON.stringify(texto)})`, entorno), 'desactivar');
  }
  comprobar.equal(evaluarContexto('clasificarEstado("Verificada")', entorno), 'positivo');
  comprobar.equal(evaluarContexto('clasificarEstado("En revisión")', entorno), 'pendiente');
  comprobar.equal(evaluarContexto('clasificarEstado("Inactiva")', entorno), 'neutro');
});

prueba('la solicitud compartida conserva cabeceras, cuerpo y errores del servidor', async () => {
  const solicitudAnterior = globalThis.fetch;
  try {
    globalThis.fetch = async (_ruta, opciones) => {
      comprobar.equal(opciones.headers['Content-Type'], 'application/json');
      comprobar.equal(opciones.headers['X-Prueba'], 'valor');
      comprobar.equal(opciones.body, '{}');
      return { ok: false, status: 403, json: async () => ({ error: 'Sin permiso' }) };
    };
    await comprobar.rejects(() => solicitarApi('/prueba', { method: 'POST', body: '{}', headers: { 'X-Prueba': 'valor' } }), (error) => error.status === 403 && error.message === 'Sin permiso');
  } finally { globalThis.fetch = solicitudAnterior; }
});
