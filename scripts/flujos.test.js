import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { crearControlAcceso, esCorreo, esFecha, esTelefono, esUrlWeb, esNumeroCampo, esPortadaRecurso } from '../servicios/validaciones.js';
import { registrarFlujoPostulaciones } from '../servicios/flujoPostulaciones.js';
import { reportarContenido } from '../publico/js/utilidades/reportes.js';

const id = '12345678-1234-1234-1234-123456789abc';
const perfilId = '22345678-1234-1234-1234-123456789abc';
const empresaId = '32345678-1234-1234-1234-123456789abc';
const resultado = (datosRespuesta, error = null) => ({ data: datosRespuesta, error });
const responder = () => ({ codigo: 200, status(c) { this.codigo = c; return this; }, json(d) { this.datos = d; return this; }, set() { return this; }, send(d) { this.archivo = d; return this; } });

prueba('conserva las portadas optimizadas y rechaza formatos de imagen inválidos', () => {
  comprobar.equal(esPortadaRecurso('data:image/jpeg;base64,/9j/'), true);
  comprobar.equal(esPortadaRecurso('data:image/png;base64,iVBORw0KGgo='), true);
  comprobar.equal(esPortadaRecurso('https://example.com/portada.jpg'), true);
  comprobar.equal(esPortadaRecurso('data:image/jpeg;base64,aG9sYQ=='), false);
  comprobar.equal(esPortadaRecurso('data:image/svg+xml;base64,PHN2Zz4='), false);
  comprobar.equal(esPortadaRecurso('javascript:alert(1)'), false);
});

prueba('visitantes pueden leer y ninguna escritura permite actuar sin sesión', async () => {
  for (const metodoLocal of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const rutasArchivos of ['/reportes', '/candidato/valoraciones', '/foros/temas', '/foros/temas/id/respuestas', '/candidato/postulaciones', '/recursos', '/admin/foros']) {
      const respuestaHttp = responder(); let siguiente = false;
      const middleware = crearControlAcceso(async (_solicitudHttp, respuesta) => { respuesta.status(401).json({ error: 'Sin sesión' }); return null; });
      await middleware({ method: metodoLocal, path: rutasArchivos }, respuestaHttp, () => { siguiente = true; });
      comprobar.equal(respuestaHttp.codigo, 401, `${metodoLocal} ${rutasArchivos}`);
      comprobar.equal(siguiente, false);
    }
  }
  const middleware = crearControlAcceso(() => { throw new Error('Una lectura pública no requiere sesión'); });
  for (const rutasArchivos of ['/foros/temas', '/datos', '/valoraciones-empresa/id']) {
    let siguiente = false;
    await middleware({ method: 'GET', path: rutasArchivos }, responder(), () => { siguiente = true; });
    comprobar.equal(siguiente, true);
  }
});

prueba('los roles separan acciones de candidato, empresa y administración', async () => {
  for (const rol of ['candidato', 'empresa', 'administrador']) {
    const middleware = crearControlAcceso(async () => ({ rol }));
    for (const [rutasArchivos, permitido] of [['/candidato/postulaciones', 'candidato'], ['/empresa/vacantes', 'empresa'], ['/usuarios/id', 'administrador']]) {
      const respuestaHttp = responder(); let siguiente = false;
      await middleware({ method: 'POST', path: rutasArchivos }, respuestaHttp, () => { siguiente = true; });
      comprobar.equal(siguiente, rol === permitido);
      comprobar.equal(respuestaHttp.codigo, rol === permitido ? 200 : 403);
    }
    let siguiente = false;
    await middleware({ method: 'POST', path: '/reportes' }, responder(), () => { siguiente = true; });
    comprobar.equal(siguiente, true);
  }
});

prueba('valida correo, fechas reales, teléfono, URL y campos numéricos', () => {
  comprobar.equal(esCorreo(' ana@example.com '), true);
  comprobar.equal(esCorreo('ana@'), false);
  comprobar.equal(esFecha('2026-02-30'), false);
  comprobar.equal(esFecha('2028-02-29'), true);
  comprobar.equal(esTelefono('+503 7777-8888'), true);
  comprobar.equal(esTelefono('abc7777'), false);
  comprobar.equal(esUrlWeb('javascript:alert(1)'), false);
  comprobar.equal(esUrlWeb('https://example.com'), true);
  for (const valor of [false, null, '', '   ', 'NaN', 'Infinity', {}]) comprobar.equal(esNumeroCampo(valor), false);
  comprobar.equal(esNumeroCampo('100.50'), true);
});

function preparar(respuestas, opciones = {}) {
  const consultas = []; const rutas = new Map();
  const consumir = () => { comprobar.ok(respuestas.length, 'Consulta inesperada'); return respuestas.shift(); };
  const supabase = {
    from(tabla) {
      const consulta = { tabla, filtros: [] }; consultas.push(consulta);
      return {
        select(campos) { consulta.campos = campos; return this; },
        eq(campo, valor) { consulta.filtros.push([campo, valor]); return this; },
        insert(datos) { consulta.insert = datos; return this; },
        limit: async () => consumir(), single: async () => consumir(), maybeSingle: async () => consumir()
      };
    },
    storage: { from: (deposito) => ({ download: async (ruta) => {
      consultas.push({ bucket: deposito, ruta });
      return resultado({ arrayBuffer: async () => Buffer.from('%PDF-test') });
    } }) }
  };
  const contexto = { supabase, usuario: { nombre: 'Ana' }, perfil: { id: perfilId, curriculum_url: `${perfilId}/cv.pdf` }, empresa: { id: empresaId } };
  if (opciones.sinCV) contexto.perfil.curriculum_url = null;
  const autenticar = async (_solicitudHttp, respuestaHttp) => {
    if (opciones.sinSesion) { respuestaHttp.status(401).json({ error: 'Sin sesión' }); return null; }
    return contexto;
  };
  const aplicacionPrueba = Object.fromEntries(['get', 'post'].map((metodo) => [metodo, (ruta, manejador) => rutas.set(`${metodo} ${ruta}`, manejador)]));
  registrarFlujoPostulaciones(aplicacionPrueba, {
    conManejoErrores: (f) => f, obtenerCandidatoAutenticado: autenticar, obtenerEmpresaAutenticada: autenticar,
    reportarAutomaticamente: async () => {}
  });
  return { consultas, rutas };
}

prueba('postular guarda el perfil autenticado y la vacante, ignorando identidades del formulario', async () => {
  const { consultas, rutas } = preparar([
    resultado({ id, estado: 'Activa', empresa_id: empresaId, empresas: { estado_verificacion: 'Verificada' } }),
    resultado([]), resultado({ id: 'postulacion', estado: 'Nueva' })
  ]);
  const respuestaHttp = responder();
  await rutas.get('post /api/candidato/postulaciones')({ body: { vacante_id: id, candidato_id: 'otro', empresa_id: 'otra', estado: 'Contratada', curriculum_url: 'ajeno.pdf' } }, respuestaHttp);
  comprobar.equal(respuestaHttp.codigo, 201);
  comprobar.deepEqual(consultas.find((c) => c.insert).insert, { vacante_id: id, candidato_id: perfilId, curriculum_url: `${perfilId}/cv.pdf`, estado: 'Nueva' });
});

prueba('rechaza postulaciones sin sesión, sin CV, duplicadas, vencidas e inactivas', async () => {
  const activa = { id, estado: 'Activa', empresas: { estado_verificacion: 'Verificada' } };
  const casos = [
    { opciones: { sinSesion: true }, respuestas: [], codigo: 401 },
    { opciones: { sinCV: true }, respuestas: [], codigo: 400 },
    { respuestas: [resultado({ ...activa, estado: 'Inactiva' })], codigo: 404 },
    { respuestas: [resultado({ ...activa, empresas: { estado_verificacion: 'Suspendida' } })], codigo: 404 },
    { respuestas: [resultado({ ...activa, fecha_limite: '2000-01-01' })], codigo: 400 },
    { respuestas: [resultado(activa), resultado([{ id: 'existente' }])], codigo: 409 },
    { respuestas: [resultado(activa), resultado([]), resultado(null, { code: '23505' })], codigo: 409 }
  ];
  for (const caso of casos) {
    const { rutas } = preparar(caso.respuestas, caso.opciones);
    const respuestaHttp = responder();
    await rutas.get('post /api/candidato/postulaciones')({ body: { vacante_id: id } }, respuestaHttp);
    comprobar.equal(respuestaHttp.codigo, caso.codigo);
  }
});

prueba('la empresa solo descarga CV de sus propias postulaciones', async () => {
  for (const existe of [true, false]) {
    const { rutas, consultas } = preparar([resultado(existe ? { id, candidato_id: perfilId, curriculum_url: `${perfilId}/cv.pdf` } : null)]);
    const respuestaHttp = responder();
    await rutas.get('get /api/empresa/postulaciones/:id/curriculum')({ params: { id } }, respuestaHttp);
    comprobar.ok(consultas[0].filtros.some(([campo, valor]) => campo === 'vacantes.empresa_id' && valor === empresaId));
    comprobar.equal(respuestaHttp.codigo, existe ? 200 : 404);
    comprobar.equal(consultas.some((c) => c.bucket), existe);
    if (existe) comprobar.equal(respuestaHttp.archivo.toString(), '%PDF-test');
  }
});

prueba('el botón de reporte no pide motivo ni envía reportes si la sesión venció', async () => {
  const solicitudAnterior = globalThis.fetch; const dialogoAnterior = globalThis.prompt;
  try {
    const urls = []; const mensajes = [];
    globalThis.fetch = async (url) => { urls.push(url); return { ok: true, json: async () => ({ autenticado: false }) }; };
    globalThis.prompt = () => { throw new Error('No debe abrirse el motivo'); };
    await reportarContenido('foros_temas', id, (mensaje) => mensajes.push(mensaje));
    comprobar.deepEqual(urls, ['/api/auth/sesion']);
    comprobar.match(mensajes[0], /Inicia sesión/);
  } finally {
    globalThis.fetch = solicitudAnterior;
    if (dialogoAnterior === undefined) delete globalThis.prompt; else globalThis.prompt = dialogoAnterior;
  }
});
