import { createServer as crearServidor } from 'node:http';
import { spawn as iniciarProceso } from 'node:child_process';
import * as archivos from 'node:fs/promises';
import { existsSync as existeArchivo } from 'node:fs';
import * as rutas from 'node:path';
import { tmpdir as directorioTemporal } from 'node:os';
import { respuestaRevision } from './datosRevision.js';
import { paginaRevision, codigoPaginaRevision } from './paginaRevision.js';

const raiz = rutas.resolve('publico');
const navegador = [process.env.NAVEGADOR_REVISION, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((ruta) => ruta && existeArchivo(ruta));
if (!navegador) throw new Error('Configura NAVEGADOR_REVISION con la ruta de Chrome o Edge.');
const esperar = (milisegundos) => new Promise((resolver) => setTimeout(resolver, milisegundos));
const directorioPerfil = await archivos.mkdtemp(rutas.join(directorioTemporal(), 'workconnect-apariencia-'));
console.log('Preparando navegador y servidor de revisión.');
const directorioCapturas = rutas.resolve('revision-interfaz');
await archivos.mkdir(directorioCapturas, { recursive: true });
const servidor = crearServidor(async (solicitud, respuesta) => {
  const url = new URL(solicitud.url, 'http://localhost');
  const enviar = (tipo, contenido) => { respuesta.writeHead(200, { 'Content-Type': tipo }); respuesta.end(contenido); };
  if (url.pathname === '/revision') return enviar('text/html; charset=utf-8', paginaRevision(url.searchParams.get('tema')));
  if (url.pathname === '/') {
    const pagina = (await archivos.readFile(rutas.join(raiz, 'index.html'), 'utf8')).replace(/<link\b[^>]*href="https:[^>]*>/g, '');
    return enviar('text/html; charset=utf-8', pagina);
  }
  if (url.pathname === '/revision/pagina.js') return enviar('text/javascript; charset=utf-8', codigoPaginaRevision);
  if (url.pathname === '/revision/datos.js') return enviar('text/javascript; charset=utf-8', await archivos.readFile(new URL('./datosRevision.js', import.meta.url)));
  if (url.pathname.startsWith('/api/')) {
    const referencia = new URL(solicitud.headers.referer || 'http://localhost');
    return enviar('application/json', JSON.stringify(respuestaRevision(url.pathname, referencia.searchParams.get('vista'))));
  }
  const ruta = rutas.resolve(raiz, '.' + url.pathname);
  if (!ruta.startsWith(raiz + rutas.sep)) { respuesta.writeHead(403); respuesta.end(); return; }
  try {
    const tipos = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
    enviar(tipos[rutas.extname(ruta)] || 'application/octet-stream', await archivos.readFile(ruta));
  } catch { respuesta.writeHead(404); respuesta.end(); }
});
await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
console.log('Servidor de revisión iniciado.');
const origen = `http://127.0.0.1:${servidor.address().port}`;
const proceso = iniciarProceso(navegador, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${directorioPerfil}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let conexion;
try {
  const rutaPuerto = rutas.join(directorioPerfil, 'DevToolsActivePort');
  for (let intento = 0; intento < 150 && !existeArchivo(rutaPuerto); intento++) await esperar(100);
  if (!existeArchivo(rutaPuerto)) throw new Error('El navegador no inició la revisión.');
  console.log('Navegador iniciado.');
  const puerto = (await archivos.readFile(rutaPuerto, 'utf8')).split('\n')[0];
  const paginas = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
  conexion = new WebSocket(paginas.find((pagina) => pagina.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolver, rechazar) => { conexion.addEventListener('open', resolver, { once: true }); conexion.addEventListener('error', rechazar, { once: true }); });
  let secuencia = 0;
  const pendientes = new Map();
  const erroresNavegador = [];
  conexion.addEventListener('message', (evento) => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.id) {
      const pendiente = pendientes.get(mensaje.id);
      pendientes.delete(mensaje.id);
      if (mensaje.error) pendiente?.rechazar(new Error(mensaje.error.message)); else pendiente?.resolver(mensaje.result);
    } else if (mensaje.method === 'Runtime.exceptionThrown') erroresNavegador.push(mensaje.params.exceptionDetails.exception?.description || mensaje.params.exceptionDetails.text);
  });
  function ordenar(metodo, parametros = {}) {
    return new Promise((resolver, rechazar) => {
      const identificador = ++secuencia;
      const temporizador = setTimeout(() => { pendientes.delete(identificador); rechazar(new Error(`El navegador no respondió a ${metodo}.`)); }, 10000);
      pendientes.set(identificador, { resolver: (valor) => { clearTimeout(temporizador); resolver(valor); }, rechazar: (error) => { clearTimeout(temporizador); rechazar(error); } });
      conexion.send(JSON.stringify({ id: identificador, method: metodo, params: parametros }));
    });
  }
  async function evaluar(expresion) {
    const resultado = await ordenar('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true });
    if (resultado.exceptionDetails) throw new Error(resultado.exceptionDetails.exception?.description || resultado.exceptionDetails.text);
    return resultado.result.value;
  }
  await ordenar('Runtime.enable');
  await ordenar('Page.enable');
  await ordenar('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  const vistas = ['P01', 'P02', 'P03', 'P04', 'P05', 'P05-publico', 'P07', 'P08', 'P09', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P19', 'P28', 'ingreso', 'registro', 'registro-empresa', 'P19&formulario=recurso', 'P19&ventana=edicion', 'P05&ventana=edicion', 'P05&ventana=dialogo', 'P08&ventana=oferta'];
  const informes = [];
  const estilosAcciones = new Map();
  for (const pantalla of [
    { ancho: 1365, alto: 1000, vistas },
    { ancho: 390, alto: 844, vistas: ['P01', 'P03', 'P19', 'P07', 'P09', 'registro-empresa', 'P05&ventana=dialogo', 'P08', 'P08&ventana=oferta'] },
    { ancho: 320, alto: 844, vistas: ['P19', 'P07', 'P01', 'registro-empresa'] }
  ]) {
    await ordenar('Emulation.setDeviceMetricsOverride', { width: pantalla.ancho, height: pantalla.alto, deviceScaleFactor: 1, mobile: pantalla.ancho < 600 });
    for (const tema of ['claro', 'oscuro']) {
    for (const vista of pantalla.vistas) {
      erroresNavegador.length = 0;
      await ordenar('Page.navigate', { url: `${origen}/revision?vista=${vista}&tema=${tema}` });
      let lista = false;
      for (let intento = 0; intento < 100; intento++) {
        await esperar(50);
        try { lista = await evaluar('({ lista: !!window.revisionLista, error: window.errorRevision })'); } catch { continue; }
        if (lista.error) throw new Error(`${vista}: ${lista.error}`);
        if (lista.lista) break;
      }
      if (!lista?.lista) throw new Error(`${vista}: la pantalla no terminó de cargar.`);
      await esperar(150);
      if (vista === 'P03') {
        const avisoCorrecto = await evaluar(`(async () => {
          const { renderizarP03Detalle } = await import('/js/pantallas/p03Detalle.js');
          const { datosRevision, vacanteRevision } = await import('/revision/datos.js');
          const original = window.fetch;
          let exito = false; let destino;
          const esperarCambio = async condicion => {
            for (let intento = 0; intento < 100; intento++) {
              if (condicion()) return;
              await new Promise(resolver => setTimeout(resolver, 20));
            }
            throw new Error('No aparecio el aviso junto a la postulacion.');
          };
          window.fetch = async (ruta, opciones = {}) => {
            if (ruta === '/api/candidato/postulaciones') return new Response(JSON.stringify(exito ? { id: 'postulacion-temporal' } : { codigo: 'CV_REQUERIDO', error: 'Primero guarda tu currículum PDF en Mi perfil para postularte.' }), { status: exito ? 201 : 400, headers: { 'Content-Type': 'application/json' } });
            if (String(ruta).startsWith('/api/candidato/postulaciones/')) return new Response(JSON.stringify({ postulado: false }), { headers: { 'Content-Type': 'application/json' } });
            return original(ruta, opciones);
          };
          try {
            renderizarP03Detalle(document.querySelector('#area-contenido'), datosRevision, vacanteRevision.id, valor => { destino = valor; }, () => {}, { rol: 'candidato' });
            const boton = document.querySelector('#aplicar-empleo');
            await esperarCambio(() => !boton.disabled);
            boton.click();
            const aviso = document.querySelector('#aviso-postulacion');
            await esperarCambio(() => !aviso.hidden && aviso.querySelector('button'));
            if (aviso.getAttribute('role') !== 'alert' || parseFloat(getComputedStyle(aviso).fontSize) < 16 || !aviso.textContent.includes('Te falta subir tu CV')) return false;
            aviso.querySelector('button').click();
            if (destino !== 'P07') return false;
            exito = true; boton.click();
            await esperarCambio(() => aviso.classList.contains('aviso-contextual-exito'));
            aviso.querySelector('button').click();
            return destino === 'POSTULACIONES_CANDIDATO' && boton.disabled && aviso.getAttribute('role') === 'status';
          } finally { window.fetch = original; window.scrollTo(0, 0); }
        })()`);
        if (!avisoCorrecto) throw new Error('Los avisos de postulación no son visibles o no llevan a la sección correcta.');
      }
      if (vista === 'P07') {
        const perfilDinamico = await evaluar(`(async () => {
          const original = window.fetch;
          const esperarCambio = async (condicion) => {
            for (let intento = 0; intento < 100; intento++) {
              if (condicion()) return;
              await new Promise(resolver => setTimeout(resolver, 20));
            }
            throw new Error('El perfil no actualizo su contenido.');
          };
          window.fetch = async (ruta, opciones = {}) => {
            if (ruta === '/api/candidato/perfil' && opciones.method === 'PUT') return new Response(JSON.stringify({ guardado: true }), { headers: { 'Content-Type': 'application/json' } });
            if (ruta === '/api/candidato/curriculum') return new Response(JSON.stringify(opciones.method === 'DELETE' ? { eliminado: true, curriculum_nombre: '' } : { guardado: true, curriculum_nombre: 'revision-dinamica.pdf' }), { headers: { 'Content-Type': 'application/json' } });
            return original(ruta, opciones);
          };
          try {
            document.querySelector('#perfil-editar-datos').click();
            document.querySelector('#perfil-titulo').value = 'Especialista de revision';
            document.querySelector('#perfil-telefono').value = '7777-1111';
            document.querySelector('[data-formulario="perfil"]').requestSubmit();
            await esperarCambio(() => document.querySelector('#perfil-titulo-resumen').textContent === 'Especialista de revision');
            if (document.querySelector('#perfil-resumen-telefono').textContent !== '7777-1111') return false;
            document.querySelector('#perfil-editar-curriculum').click();
            const transferencia = new DataTransfer();
            transferencia.items.add(new File(['%PDF-1.4'], 'revision-dinamica.pdf', { type: 'application/pdf' }));
            document.querySelector('#perfil-cv').files = transferencia.files;
            document.querySelector('#perfil-cv-guardar').click();
            await esperarCambio(() => document.querySelector('#perfil-cv-resumen').textContent === 'revision-dinamica.pdf');
            const quitar = document.querySelector('#perfil-cv-quitar');
            if (quitar.hidden || document.querySelector('#perfil-cv-descargar').hidden) return false;
            quitar.click(); document.querySelector('dialog').close();
            await new Promise(resolver => setTimeout(resolver, 30));
            if (quitar.hidden) return false;
            quitar.click(); document.querySelector('dialog').close('aceptar');
            await esperarCambio(() => quitar.hidden);
            return document.querySelector('#perfil-cv-resumen').textContent === 'Sin currículum cargado' && document.querySelector('#perfil-cv-descargar').hidden && document.querySelector('#perfil-titulo-resumen').textContent === 'Especialista de revision';
          } finally { window.fetch = original; }
        })()`);
        if (!perfilDinamico) throw new Error('El perfil o el CV requieren recargar para ver los cambios.');
      }
      if (vista === 'P19') {
        const detalleCorrecto = await evaluar(`(() => {
          const fila = document.querySelector('[data-ver-contenido]');
          if (!fila) return false;
          fila.querySelector('td').click();
          if (!document.querySelector('#modal-raiz .recurso-detalle-lectura')) return false;
          document.querySelector('#modal-cerrar-x').click();
          fila.querySelector('[data-editar]').click();
          if (!document.querySelector('#editar-contenido') || document.querySelector('.recurso-detalle-lectura')) return false;
          document.querySelector('#modal-cerrar-x').click();
          fila.querySelector('.titulo-con-detalle').click();
          const correcto = !!document.querySelector('#modal-raiz .recurso-detalle-texto');
          document.querySelector('#modal-cerrar-x').click();
          return correcto;
        })()`);
        if (!detalleCorrecto) throw new Error('El detalle del recurso no abre o interfiere con la edición.');
      }
      if (['P10', 'P13', 'P15'].includes(vista)) {
        const imagenesCorrectas = await evaluar(`(async () => {
          const imagenes = [...document.querySelectorAll('#area-contenido .avatar-con-respaldo img')];
          if (!imagenes.length) return false;
          for (const imagen of imagenes) {
            imagen.loading = 'eager';
            await imagen.decode();
            if (!imagen.naturalWidth || imagen.getBoundingClientRect().width < 25) return false;
          }
          imagenes[0].src = '/imagen-inexistente.png';
          await new Promise(resolver => setTimeout(resolver, 100));
          return !!document.querySelector('#area-contenido .avatar-con-respaldo > span');
        })()`);
        if (!imagenesCorrectas) throw new Error('No se muestran los avatares de empresas o postulaciones.');
      }
      if (vista === 'registro-empresa') {
        const desplazamientoCorrecto = await evaluar(`(() => {
          const panel = document.querySelector('.acceso-presentacion');
          if (innerWidth <= 700) return getComputedStyle(panel).position !== 'sticky';
          const antes = panel.getBoundingClientRect().top;
          window.scrollTo(0, 300);
          const despues = panel.getBoundingClientRect().top;
          const correcto = scrollY > 100 && Math.abs(antes - despues) <= 2;
          window.scrollTo(0, 0);
          return correcto;
        })()`);
        if (!desplazamientoCorrecto) throw new Error('El panel de acceso no permanece visible al bajar por el formulario.');
      }
      if (vista === 'P08') {
        const filtradoCorrecto = await evaluar(`(() => {
          const entrada = document.querySelector('#buscar-ofertas-empresa');
          entrada.value = 'SIN_RESULTADO_DE_BUSQUEDA'; entrada.dispatchEvent(new Event('input', { bubbles: true }));
          const vacio = document.querySelectorAll('[data-vacante-id]').length === 0;
          entrada.value = ''; entrada.dispatchEvent(new Event('input', { bubbles: true }));
          return vacio && document.querySelectorAll('[data-vacante-id]').length === 1 && !!document.querySelector('[data-editar-oferta]');
        })()`);
        if (!filtradoCorrecto) throw new Error('No funciona el buscador de ofertas de empresa.');
      }
      if (vista === 'P08&ventana=oferta') {
        const cargada = await evaluar("document.querySelector('#modal-raiz #vacante-titulo')?.value === 'Asistente de administración'");
        if (!cargada) throw new Error('La oferta no se cargó en el formulario de edición.');
      }
      if (vista === 'P09') {
        const erroresVisibles = await evaluar(`(async () => {
          const formulario = document.querySelector('[data-formulario="vacante"]');
          const original = window.fetch; let enviados = 0;
          window.fetch = async (ruta, opciones = {}) => {
            if (ruta === '/api/empresa/vacantes' && opciones.method === 'POST') {
              enviados++;
              return new Response(JSON.stringify(enviados === 1 ? { error: 'Revisa la descripción.', errores: { descripcion: 'Completa la descripción de esta oferta.' } } : { guardado: true }), { status: enviados === 1 ? 400 : 201, headers: { 'Content-Type': 'application/json' } });
            }
            return original(ruta, opciones);
          };
          const esperarCambio = async condicion => {
            for (let intento = 0; intento < 100; intento++) {
              if (condicion()) return;
              await new Promise(resolver => setTimeout(resolver, 20));
            }
            throw new Error('No se actualizaron los errores de la vacante.');
          };
          try {
            formulario.requestSubmit();
            const titulo = formulario.querySelector('#vacante-titulo');
            if (enviados || titulo.getAttribute('aria-invalid') !== 'true' || formulario.querySelector('#vacante-titulo-error').hidden || document.activeElement !== titulo) return false;
            for (const selector of formulario.querySelectorAll('select')) {
              selector.value = selector.options[1]?.value || '';
              selector.dispatchEvent(new Event('change', { bubbles: true }));
            }
            for (const [campo, valor] of Object.entries({ titulo: 'Oferta de prueba', plazas: '1', 'salario-min': '1000', 'salario-max': '500', descripcion: 'Descripcion completa de la oferta laboral.', funciones: 'Organizar documentos', requisitos: 'Experiencia administrativa' })) {
              const entrada = formulario.querySelector('#vacante-' + campo);
              entrada.value = valor; entrada.dispatchEvent(new Event('input', { bubbles: true }));
            }
            formulario.requestSubmit();
            if (enviados || formulario.querySelector('#vacante-salario-max').getAttribute('aria-invalid') !== 'true' || titulo.hasAttribute('aria-invalid')) return false;
            const maximo = formulario.querySelector('#vacante-salario-max');
            maximo.value = '1200'; maximo.dispatchEvent(new Event('input', { bubbles: true }));
            formulario.requestSubmit();
            await esperarCambio(() => enviados === 1 && formulario.querySelector('#vacante-descripcion').getAttribute('aria-invalid') === 'true');
            if (titulo.value !== 'Oferta de prueba') return false;
            formulario.requestSubmit();
            await esperarCambio(() => enviados === 2 && formulario.querySelector('#vacante-mensaje-estado').classList.contains('aviso-contextual-exito'));
            return !titulo.value && !formulario.querySelector('#vacante-mensaje-estado').classList.contains('oculto') && !formulario.querySelector('[aria-invalid="true"]');
          } finally { window.fetch = original; }
        })()`);
        if (!erroresVisibles) throw new Error('La publicación no muestra los errores por campo o pierde los datos al fallar.');
        const previaCorrecta = await evaluar(`(async () => {
          const formulario = document.querySelector('[data-formulario="vacante"]');
          const panel = document.querySelector('.vacante-vista-previa');
          const titulo = formulario.querySelector('#vacante-titulo');
          titulo.value = 'Analista de operaciones'; titulo.dispatchEvent(new Event('input', { bubbles: true }));
          const descripcion = formulario.querySelector('#vacante-descripcion');
          descripcion.value = '<img src=x onerror=alert(1)>'; descripcion.dispatchEvent(new Event('input', { bubbles: true }));
          if (!panel.textContent.includes(titulo.value) || panel.querySelector('[onerror]') || !panel.textContent.includes(descripcion.value)) return false;
          const izquierda = formulario.closest('.mi-perfil-tarjeta').getBoundingClientRect();
          const derecha = panel.getBoundingClientRect();
          if (innerWidth >= 1100 ? derecha.left < izquierda.right - 1 : derecha.top < izquierda.bottom - 1) return false;
          formulario.reset(); await Promise.resolve();
          return panel.textContent.includes('Título del puesto') && !panel.textContent.includes('Analista de operaciones');
        })()`);
        if (!previaCorrecta) throw new Error('La vista previa de la vacante no actualiza, protege o distribuye sus datos correctamente.');
      }
      const informe = await evaluar(`(() => {
        const visibles = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea, .tarjeta, .mi-perfil-tarjeta, .modal-ventana, dialog, .encabezado, .pie-pagina')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
        const superficiesClaras = visibles.filter(e => !e.matches('input[type="checkbox"], input[type="radio"]') && /^rgb\\(/.test(getComputedStyle(e).backgroundColor) && getComputedStyle(e).backgroundColor.match(/\\d+/g).slice(0,3).every(n => Number(n) > 220)).map(e => e.className || e.tagName);
        const acciones = [...document.querySelectorAll('[data-accion-visual]')].filter(e => e.getClientRects().length).map(e => { const estilo = getComputedStyle(e); return { accion: e.dataset.accionVisual, texto: e.textContent.trim(), estilo: [estilo.backgroundColor, estilo.color, estilo.borderColor, estilo.borderRadius, estilo.fontSize, estilo.fontWeight, estilo.paddingTop, estilo.paddingBottom].join('|') }; });
        const campos = visibles.filter(e => e.matches('input, select, textarea')).map(e => ({ fondo: getComputedStyle(e).backgroundColor, texto: getComputedStyle(e).color }));
        const controlesFuera = [...document.querySelectorAll('#encabezado-principal button')].filter(e => e.getClientRects().length && (e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().left < -1)).map(e => e.textContent.trim());
        return { tema: document.documentElement.dataset.tema, superficiesClaras, acciones, campos, controlesFuera, ancho: document.documentElement.scrollWidth, ventana: innerWidth };
      })()`);
      if (informe.tema !== tema) throw new Error(`${vista}: tema incorrecto.`);
      if (tema === 'oscuro' && informe.superficiesClaras.length) throw new Error(`${vista}: superficies claras en modo oscuro: ${informe.superficiesClaras.join(', ')}`);
      if (informe.ancho > informe.ventana + 1) throw new Error(`${vista}: contenido fuera del ancho de pantalla (${informe.ancho}/${informe.ventana}).`);
      if (informe.controlesFuera.length) throw new Error(`${vista}: controles del encabezado fuera de pantalla: ${informe.controlesFuera.join(', ')}.`);
      for (const accion of informe.acciones) {
        const clave = `${tema}-${accion.accion}`;
        if (!estilosAcciones.has(clave)) estilosAcciones.set(clave, accion.estilo);
        if (estilosAcciones.get(clave) !== accion.estilo) throw new Error(`${vista}: estilo diferente para ${accion.texto}: ${accion.estilo} / ${estilosAcciones.get(clave)}`);
      }
      if (erroresNavegador.length) throw new Error(`${vista}: ${erroresNavegador.join('\n')}`);
      informes.push({ vista, tema, ancho: pantalla.ancho, campos: informe.campos.length, acciones: informe.acciones.length });
      if (informes.length % 5 === 0) console.log(`${informes.length} vistas verificadas.`);
      if (tema === 'oscuro' && ['P19', 'registro-empresa', 'P01', 'P05&ventana=edicion'].includes(vista)) {
        const captura = await ordenar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await archivos.writeFile(rutas.join(directorioCapturas, `${vista.replace(/[^a-z0-9]/gi, '-')}-${tema}-${pantalla.ancho}.png`), Buffer.from(captura.data, 'base64'));
      }
    }
    console.log(`Modo ${tema}, ancho ${pantalla.ancho}: ${pantalla.vistas.length} vistas y formularios revisados.`);
    }
  }
  await evaluar("document.querySelector('[data-alternar-tema]').click()");
  await ordenar('Page.navigate', { url: `${origen}/revision?vista=P19` });
  await esperar(350);
  if (await evaluar('document.documentElement.dataset.tema') !== 'claro') throw new Error('La preferencia de tema no se conservó.');
  await ordenar('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false });
  erroresNavegador.length = 0;
  await ordenar('Page.navigate', { url: origen + '/' });
  await esperar(750);
  const inicioCorrecto = await evaluar("document.querySelector('#area-contenido h1')?.textContent");
  if (!inicioCorrecto || erroresNavegador.length) throw new Error(`La aplicación no inició correctamente: ${erroresNavegador.join(', ')}`);
  await ordenar('Page.navigate', { url: origen + '/?vista=portada-publica' });
  await esperar(900);
  const ordenCorrecto = await evaluar("[...document.querySelectorAll('[data-seccion-portada]')].map(seccion => seccion.id).join(',') === 'inicio-empleos,inicio-recursos,inicio-foros'");
  if (!ordenCorrecto) throw new Error('La portada no muestra empleos, recursos y foros en orden.');
  for (const [pantalla, seccion] of [['P17', 'inicio-recursos'], ['P05', 'inicio-foros'], ['P01', 'inicio-empleos']]) {
    await evaluar(`document.querySelector('#navegacion-superior [data-pantalla="${pantalla}"]').click()`);
    await esperar(850);
    const visible = await evaluar(`(() => { const rectangulo = document.getElementById('${seccion}').getBoundingClientRect(); return rectangulo.top < innerHeight - 80 && rectangulo.bottom > 70; })()`);
    if (!visible) throw new Error(`El menú no desplazó a ${seccion}.`);
  }
  await evaluar("document.querySelector('#navegacion-superior [data-seccion-cuenta=\"P08\"]').click()");
  if (!await evaluar("!!document.querySelector('#formulario-autenticacion')")) throw new Error('Para empresas no abre el inicio de sesión.');
  console.log('Portada pública: orden, navegación por secciones y acceso de empresas verificados.');
  const formatosVerificados = await evaluar(`(async () => {
    const { prepararFoto } = await import('/js/utilidades/fotos.js');
    const lienzo = document.createElement('canvas');
    lienzo.width = 1800; lienzo.height = 900;
    lienzo.getContext('2d').fillRect(0, 0, 1800, 900);
    const archivos = [];
    for (const [tipo, extension] of [['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]) {
      const contenido = await new Promise(resolver => lienzo.toBlob(resolver, tipo));
      archivos.push(new File([contenido], 'foto.' + extension, { type: tipo }));
    }
    archivos.push(new File([Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), caracter => caracter.charCodeAt(0))], 'foto.gif', { type: 'image/gif' }));
    const bmp = new ArrayBuffer(58); const vista = new DataView(bmp);
    vista.setUint16(0, 0x4d42, true); vista.setUint32(2, 58, true); vista.setUint32(10, 54, true);
    vista.setUint32(14, 40, true); vista.setInt32(18, 1, true); vista.setInt32(22, 1, true);
    vista.setUint16(26, 1, true); vista.setUint16(28, 24, true); vista.setUint32(34, 4, true);
    archivos.push(new File([bmp], 'foto.bmp', { type: 'image/bmp' }));
    for (const archivo of archivos) {
      const preparada = await prepararFoto(archivo);
      const imagen = await createImageBitmap(preparada);
      if (preparada.type !== 'image/webp' || imagen.width > 1200 || imagen.height > 1200) throw new Error('Conversion incorrecta de ' + archivo.type);
      imagen.close();
    }
    let rechazo = false;
    try { await prepararFoto(new File(['no es una imagen'], 'foto.png', { type: 'image/png' })); } catch { rechazo = true; }
    if (!rechazo) throw new Error('Se acepto una imagen corrupta.');
    return archivos.length;
  })()`);
  console.log(`Fotos: ${formatosVerificados} formatos convertidos y archivos corruptos rechazados en navegador.`);
  await archivos.writeFile(rutas.join(directorioCapturas, 'resultado.json'), JSON.stringify({ informes, variantes: estilosAcciones.size, persistencia: true }, null, 2));
  console.log(`Revisión completa: ${informes.length} vistas, ${estilosAcciones.size} variantes de acciones y preferencia persistente.`);
} finally {
  conexion?.close();
  proceso.kill();
  servidor.close();
  await esperar(400);
  const temporal = rutas.resolve(directorioTemporal()) + rutas.sep;
  if (rutas.resolve(directorioPerfil).startsWith(temporal) && rutas.basename(directorioPerfil).startsWith('workconnect-apariencia-')) {
    await archivos.rm(directorioPerfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }).catch(() => {});
  }
}
