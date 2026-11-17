export const codigoPaginaRevision = `
import { datosRevision, usuarioRevision, vacanteRevision } from '/revision/datos.js';
import { renderizarEncabezado } from '/js/componentes/encabezado.js';
import { renderizarAutenticacion } from '/js/componentes/autenticacion.js';
import { renderizarCuentaIntegrada } from '/js/componentes/miPerfil.js';
import { renderizarTableroCuenta } from '/js/pantallas/tableroCuenta.js';
import { pedirMotivo } from '/js/componentes/dialogos.js';
const parametros = new URLSearchParams(location.search);
const vista = parametros.get('vista') || 'P19';
const contenedor = document.querySelector('#area-contenido');
const sinAccion = () => {};
const acciones = new Proxy({}, { get: (_objetivo, nombre) => (...argumentos) => {
  window.ultimaAccionRevision = { nombre, argumentos };
  if (nombre === 'alActualizarRecurso') return { ...datosRevision.recursosLaborales[0], ...argumentos[1] };
} });
const rol = ['P07','P30'].includes(vista) ? 'candidato' : ['P08','P09','P10','P31'].includes(vista) ? 'empresa' : vista.endsWith('publico') || ['P01','P02','P03','ingreso','registro','registro-empresa'].includes(vista) ? 'visitante' : 'administrador';
renderizarEncabezado(document.querySelector('#encabezado-principal'), sinAccion, rol, rol === 'visitante' ? null : {...usuarioRevision, rol}, sinAccion, vista);
document.body.classList.toggle('modo-autenticacion', ['ingreso','registro','registro-empresa'].includes(vista));
document.body.classList.toggle('modo-inicio', vista === 'P01');
try {
  if (['P30','P31'].includes(vista)) await renderizarTableroCuenta(contenedor, {...usuarioRevision, rol}, rol, sinAccion, sinAccion);
  else if (['ingreso','registro','registro-empresa'].includes(vista)) renderizarAutenticacion(contenedor, vista === 'ingreso' ? 'login' : 'registro', sinAccion, sinAccion, vista === 'registro-empresa' ? 'empresa' : 'candidato');
  else if (['P07','P08','P09','P10'].includes(vista)) await renderizarCuentaIntegrada(contenedor, document.querySelector('#navegacion-cuenta-integrada'), vista, null, {...usuarioRevision,rol});
  else {
    const configuraciones = {
      P01: ['p01Inicio','renderizarP01Inicio',[datosRevision,sinAccion,sinAccion]],
      P02: ['p02Resultados','renderizarP02Resultados',[datosRevision,'','',sinAccion]],
      P03: ['p03Detalle','renderizarP03Detalle',[datosRevision,vacanteRevision.id,sinAccion,sinAccion,null]],
      P04: ['p04Recursos','renderizarP04Recursos',[datosRevision]],
      P05: ['p05Foros','renderizarP05Foros',[sinAccion,'administrador',sinAccion]],
      'P05-publico': ['p05Foros','renderizarP05Foros',[sinAccion,'visitante',sinAccion]],
      P11: ['p11Resumen','renderizarP11Resumen',[datosRevision,sinAccion]],
      P12: ['p12Usuarios','renderizarP12Usuarios',[datosRevision.usuarios,acciones]],
      P13: ['p13Empresas','renderizarP13Empresas',[datosRevision.empresas,acciones]],
      P14: ['p14Vacantes','renderizarP14Vacantes',[datosRevision.vacantes,acciones]],
      P15: ['p15Moderacion','renderizarP15Moderacion',[datosRevision.elementosModeracion,acciones]],
      P16: ['p16VerificacionEmpresas','renderizarP16VerificacionEmpresas',[datosRevision.solicitudesVerificacion,acciones]],
      P19: ['p19CrearRecurso','renderizarP19CrearRecurso',[datosRevision.recursosLaborales,acciones]],
      P28: ['p28CrearTema','renderizarP28CrearTema',[sinAccion,sinAccion]]
    };
    const [archivo, funcion, argumentos] = configuraciones[vista];
    const modulo = await import('/js/pantallas/' + archivo + '.js');
    await modulo[funcion](contenedor, ...argumentos);
  }
  if (parametros.get('formulario') === 'recurso') contenedor.querySelector('[data-subpestana="Crear"]').click();
  if (parametros.get('ventana') === 'edicion') contenedor.querySelector('[data-editar]').click();
  if (parametros.get('ventana') === 'dialogo') pedirMotivo();
  if (parametros.get('ventana') === 'oferta') {
    for (let intento = 0; intento < 100 && !contenedor.querySelector('[data-editar-oferta]'); intento++) await new Promise((resolver) => setTimeout(resolver, 20));
    contenedor.querySelector('[data-editar-oferta]').click();
  }
  window.revisionLista = true;
} catch (error) { window.errorRevision = error.stack; }
`;

export function paginaRevision(tema) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  ${tema ? `<script>localStorage.setItem('workconnect-tema', '${tema}');</script>` : ''}
  <script src="/js/apariencia.js"></script><link rel="stylesheet" href="/css/estilos.css"><link rel="stylesheet" href="/css/miPerfil.css"><link rel="stylesheet" href="/css/apariencia.css"></head>
  <body><div class="aplicacion-raiz"><header id="encabezado-principal" class="encabezado"></header><main class="contenedor-principal"><div class="disposicion-panel"><nav id="navegacion-cuenta-integrada" hidden></nav><section id="area-contenido" class="area-contenido"></section></div></main>
  <footer class="pie-pagina"><div class="pie-pagina-contenido"><p>WorkConnect · Conectando talento con oportunidades.</p></div></footer></div><div id="modal-raiz"></div><script type="module" src="/revision/pagina.js"></script></body></html>`;
}
