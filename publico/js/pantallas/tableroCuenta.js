import { solicitarApi } from '../utilidades/solicitudes.js';
import { escaparHtml } from '../utilidades/formato.js';
import { resumirCandidato, resumirEmpresa, estadosProcesos } from '../utilidades/resumenCuenta.js';
import { renderizarAvatar } from '../utilidades/avatar.js';
import { mostrarAvisoContextual } from '../componentes/avisoContextual.js';

const consultar = (ruta) => solicitarApi(ruta, { cache: 'no-store' });

const fecha = (valor) => {
  const instante = new Date(/^\d{4}-\d{2}-\d{2}$/.test(valor || '') ? `${valor}T12:00:00Z` : valor);
  return !valor || Number.isNaN(instante.getTime()) ? 'Sin fecha' : new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeZone: 'America/El_Salvador' }).format(instante);
};
const boton = (titulo, destino, principal = false) => `<button type="button" class="boton${principal ? ' boton-primario' : ''}" data-destino-tablero="${destino}">${titulo}</button>`;
const indicador = (nombre, valor, detalle, destino) => `<button type="button" class="tablero-indicador" data-destino-tablero="${destino}"><span>${nombre}</span><strong>${valor}</strong><small>${detalle}</small></button>`;
const vacio = (mensaje, titulo, destino) => `<div class="tablero-vacio"><p>${mensaje}</p>${boton(titulo, destino)}</div>`;
const recientes = (elementos) => [...elementos].sort((a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)).slice(0, 5);

function distribucion(procesos) {
  const total = Object.values(procesos).reduce((suma, cantidad) => suma + cantidad, 0);
  return `<div class="tablero-distribucion">${estadosProcesos.map((estado) => `<div><div class="tablero-fila-estado"><span class="etiqueta-cuadrada">${estado}</span><strong>${procesos[estado]}</strong></div><progress max="${Math.max(1, total)}" value="${procesos[estado]}" aria-label="${estado}: ${procesos[estado]} de ${total}"></progress></div>`).join('')}</div>`;
}

function contenidoCandidato(datos) {
  const resumen = resumirCandidato(datos);
  const perfil = datos.perfil || {};
  const postulaciones = datos.postulaciones || [];
  return `<div class="tablero-indicadores">
    ${indicador('Postulaciones enviadas', resumen.postulaciones, 'Consulta todos tus procesos', 'POSTULACIONES_CANDIDATO')}
    ${indicador('Entrevistas', resumen.procesos.Entrevista, 'Procesos en etapa de entrevista', 'POSTULACIONES_CANDIDATO')}
    ${indicador('Perfil profesional', `${resumen.porcentajePerfil}%`, 'Datos de contacto y presentación', 'P07')}
    ${indicador('Currículum', resumen.tieneCurriculum ? 'Listo' : 'Falta subir', resumen.tieneCurriculum ? 'Tu PDF está listo para postularte' : 'Sube un PDF para enviar postulaciones', 'P07')}
  </div>
  <div class="tablero-columnas">
    <div class="tablero-columna">
    <section class="tarjeta tarjeta-espaciado"><div class="tablero-seccion-cabecera"><h2>Mis postulaciones recientes</h2>${boton('Ver todas', 'POSTULACIONES_CANDIDATO')}</div>
      ${postulaciones.length ? `<ul class="tablero-lista">${recientes(postulaciones).map((postulacion) => `<li><div><strong>${escaparHtml(postulacion.vacante?.titulo || 'Oferta de empleo')}</strong><p>${[escaparHtml(postulacion.vacante?.modalidad || ''), fecha(postulacion.creado_en)].filter(Boolean).join(' · ')}</p></div><span class="etiqueta-cuadrada">${escaparHtml(postulacion.estado)}</span>${boton('Ver proceso', 'POSTULACIONES_CANDIDATO')}</li>`).join('')}</ul>` : vacio('Todavía no has enviado postulaciones. Encuentra una oportunidad para comenzar.', 'Buscar empleos', 'P01')}
    </section>
    <section class="tarjeta tarjeta-espaciado"><h2>Estado de mis procesos</h2>${distribucion(resumen.procesos)}</section>
    </div><div class="tablero-columna">
    <section class="tarjeta tarjeta-espaciado"><h2>Tu siguiente paso</h2><ul class="tablero-pasos">
      <li><strong>${resumen.tieneCurriculum ? 'Tu CV está preparado' : 'Sube tu currículum'}</strong><p>${resumen.tieneCurriculum ? escaparHtml(perfil.curriculum_nombre) : 'Adjunta tu PDF para que las empresas conozcan tu experiencia.'}</p>${boton(resumen.tieneCurriculum ? 'Revisar mi CV' : 'Subir CV', 'P07')}</li>
      <li><strong>${resumen.porcentajePerfil === 100 ? 'Tu presentación está completa' : 'Completa tu presentación'}</strong><p>Datos de contacto y presentación: ${resumen.porcentajePerfil}% completado.</p><progress max="100" value="${resumen.porcentajePerfil}" aria-label="Perfil profesional completado"></progress>${boton('Editar mi perfil', 'P07')}</li>
      <li><strong>Alertas laborales</strong><p>${resumen.alertasActivas} ${resumen.alertasActivas === 1 ? 'alerta activa' : 'alertas activas'} en tu perfil.</p>${boton('Gestionar alertas', 'P07')}</li>
    </ul></section>
    <section class="tarjeta tarjeta-espaciado"><h2>Prepárate para tu próximo empleo</h2><p>Encuentra consejos para tu CV y entrevistas, o comparte tus dudas con la comunidad.</p><div class="grupo-acciones">${boton('Leer recursos', 'P17')}${boton('Ir a foros', 'P05')}</div></section>
    </div></div>`;
}

function contenidoEmpresa(perfil, vacantes, postulaciones) {
  const resumen = resumirEmpresa(vacantes, postulaciones);
  const estado = perfil.empresa?.estado_verificacion || 'Pendiente';
  const mensajes = {
    Pendiente: 'Un administrador debe aprobar tu empresa. Puedes preparar ofertas, pero aún no aparecerán en el portal público.',
    Suspendida: 'Tu empresa está suspendida y sus ofertas no son visibles al público. Contacta con administración.',
    Verificada: 'Tu empresa está aprobada. Las ofertas activas pueden recibir postulaciones.'
  };
  return `<section class="tablero-aprobacion"><span class="etiqueta-cuadrada">${escaparHtml(estado)}</span><p>${mensajes[estado] || mensajes.Pendiente}</p>${boton('Ver mi empresa', 'P08')}</section>
  <div class="tablero-indicadores">
    ${indicador('Ofertas activas', resumen.activas, `${resumen.ofertas} ${resumen.ofertas === 1 ? 'oferta' : 'ofertas'} en total`, 'P08')}
    ${indicador('Postulaciones recibidas', resumen.postulaciones, 'Candidatos en tus ofertas', 'P10')}
    ${indicador('Nuevas postulaciones', resumen.procesos.Nueva, 'Pendientes de primera revisión', 'P10')}
    ${indicador('Entrevistas', resumen.procesos.Entrevista, 'Candidatos en etapa de entrevista', 'P10')}
  </div>
  <div class="tablero-columnas">
    <div class="tablero-columna">
    <section class="tarjeta tarjeta-espaciado"><div class="tablero-seccion-cabecera"><h2>Candidatos recientes</h2>${boton('Ver postulaciones', 'P10')}</div>
      ${postulaciones.length ? `<ul class="tablero-lista">${recientes(postulaciones).map((postulacion) => `<li>${renderizarAvatar({ nombre: postulacion.candidato?.nombre || 'Candidato/a', fotoUrl: postulacion.candidato?.foto_url })}<div><strong>${escaparHtml(postulacion.candidato?.nombre || 'Candidato/a')}</strong><p>${escaparHtml(postulacion.vacante?.titulo || 'Oferta de empleo')}</p><p>${fecha(postulacion.creado_en)}</p></div><span class="etiqueta-cuadrada">${escaparHtml(postulacion.estado)}</span></li>`).join('')}</ul>` : vacio('Aún no hay postulaciones recibidas. Las ofertas activas de empresas aprobadas pueden recibir candidatos.', 'Revisar mis ofertas', 'P08')}
    </section>
    <section class="tarjeta tarjeta-espaciado"><div class="tablero-seccion-cabecera"><h2>Mis ofertas recientes</h2>${boton('Gestionar ofertas', 'P08')}</div>
      ${vacantes.length ? `<ul class="tablero-lista">${recientes(vacantes).map((vacante) => `<li><div><strong>${escaparHtml(vacante.titulo)}</strong><p>${escaparHtml(vacante.municipio || vacante.departamento || '')} · ${fecha(vacante.creado_en)}</p></div><span class="etiqueta-cuadrada">${escaparHtml(vacante.estado)}</span></li>`).join('')}</ul>` : vacio('Publica tu primera oportunidad laboral y comienza a conectar con candidatos.', 'Publicar vacante', 'P09')}
    </section>
    </div><div class="tablero-columna">
    <section class="tarjeta tarjeta-espaciado"><h2>Proceso de selección</h2>${distribucion(resumen.procesos)}<p class="texto-secundario">${resumen.procesos.Contratada} contrataciones registradas.</p></section>
    <section class="tarjeta tarjeta-espaciado"><h2>Accesos rápidos</h2><p>Gestiona tu perfil y mantén actualizadas tus oportunidades laborales.</p><div class="grupo-acciones">${boton('Publicar vacante', 'P09', true)}${boton('Editar mi empresa', 'P08')}${boton('Leer recursos', 'P17')}</div></section>
    </div></div>`;
}

export async function renderizarTableroCuenta(contenedor, usuario, rolEsperado, alNavegarCuenta, alNavegar) {
  contenedor.innerHTML = '<section class="tablero-cuenta" aria-busy="true"><p class="tarjeta tarjeta-espaciado" role="status">Cargando tu resumen...</p></section>';
  const raiz = contenedor.firstElementChild;
  if (!usuario || usuario.rol !== rolEsperado || !['candidato', 'empresa'].includes(rolEsperado)) {
    raiz.setAttribute('aria-busy', 'false');
    mostrarAvisoContextual(raiz, { mensaje: 'Inicia sesión con la cuenta correspondiente para ver este resumen.' });
    return;
  }
  const cargar = async () => {
    raiz.setAttribute('aria-busy', 'true');
    const actualizar = raiz.querySelector('[data-actualizar-tablero]');
    if (actualizar) actualizar.disabled = true;
    try {
      const esEmpresa = rolEsperado === 'empresa';
      const datos = esEmpresa ? await Promise.all([
        consultar('/api/empresa/perfil'), consultar('/api/empresa/vacantes'), consultar('/api/empresa/postulaciones')
      ]) : [await consultar('/api/candidato/perfil')];
      if (!raiz.isConnected) return;
      const perfil = datos[0];
      const nombre = esEmpresa ? perfil.empresa?.nombre_comercial || usuario.nombre : perfil.perfil?.nombre || usuario.nombre;
      const foto = esEmpresa ? perfil.empresa?.logo_url || perfil.usuario?.foto_url : perfil.perfil?.foto_url;
      raiz.className = 'tablero-cuenta';
      raiz.removeAttribute('role');
      raiz.removeAttribute('tabindex');
      raiz.innerHTML = `<header class="tablero-cabecera"><div class="celda-identidad">${renderizarAvatar({ nombre, fotoUrl: foto, cuadrado: esEmpresa, grande: true })}<div><p class="tablero-etiqueta">${esEmpresa ? 'PANEL DE EMPRESA' : 'MI BÚSQUEDA DE EMPLEO'}</p><h1>${esEmpresa ? 'Resumen de tu empresa' : `Hola, ${escaparHtml(nombre)}`}</h1><p>${esEmpresa ? escaparHtml(nombre) : 'Tu perfil, tus postulaciones y tus próximos pasos, en un solo lugar.'}</p></div></div><div class="grupo-acciones">${boton(esEmpresa ? 'Publicar vacante' : 'Buscar empleos', esEmpresa ? 'P09' : 'P01', true)}<button type="button" class="boton" data-actualizar-tablero>Actualizar resumen</button></div></header>
        ${esEmpresa ? contenidoEmpresa(perfil, datos[1].vacantes || [], datos[2].postulaciones || []) : contenidoCandidato(perfil)}`;
      raiz.querySelectorAll('[data-destino-tablero]').forEach((elemento) => elemento.addEventListener('click', () => {
        const destino = elemento.dataset.destinoTablero;
        if (['P07', 'P08', 'P09', 'P10', 'POSTULACIONES_CANDIDATO'].includes(destino)) alNavegarCuenta(destino);
        else alNavegar(destino);
      }));
      raiz.querySelector('[data-actualizar-tablero]').addEventListener('click', cargar);
    } catch (error) {
      if (raiz.isConnected) mostrarAvisoContextual(raiz, { titulo: 'No se pudo cargar tu resumen', mensaje: error.message, accion: 'Reintentar', alAccionar: cargar });
    } finally {
      raiz.setAttribute('aria-busy', 'false');
      const botonActualizar = raiz.querySelector('[data-actualizar-tablero]');
      if (botonActualizar) botonActualizar.disabled = false;
    }
  };
  await cargar();
}
