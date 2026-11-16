import { formatosFoto, subirFoto } from '../utilidades/fotos.js';
import { enlazarVistaPreviaVacante } from '../utilidades/vistaPreviaVacante.js';
import { renderizarAvatar } from '../utilidades/avatar.js';
import { enlazarValidacionVacante } from '../utilidades/validacionFormularioVacante.js';
import { mostrarAvisoContextual } from './avisoContextual.js';
import { confirmarAccion, mostrarAviso } from './dialogos.js';
import { reportarContenido } from '../utilidades/reportes.js';
import { escaparHtml } from '../utilidades/formato.js';
import { solicitarApi } from '../utilidades/solicitudes.js';
import { abrirModal } from './modal.js';
import { filtrarOfertas } from '../utilidades/ofertas.js';
import {
  DEPARTAMENTOS_EL_SALVADOR,
  SECTORES_ECONOMICOS,
  TAMANOS_EMPRESA,
  MODALIDADES_TRABAJO,
  TIPOS_CONTRATO,
  sincronizarMunicipios
} from '../utilidades/ubicaciones.js';

let contenido = document.querySelector('#mi-perfil-contenido');
let navegacion = document.querySelector('.mi-perfil-navegacion');
let perfilOriginal = {};
const estadosPostulacion = ['Nueva', 'En revisión', 'Entrevista', 'Contratada', 'Rechazada'];
const rolesPorPantalla = {
  P07: 'candidato',
  P08: 'empresa',
  P09: 'empresa',
  P10: 'empresa'
};
let secuenciaPantalla = 0;

async function leerSesionActual() {
  const respuesta = await fetch('/api/auth/sesion', { cache: 'no-store' });
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(resultado.error || 'No se pudo verificar la sesión.');
    error.status = respuesta.status;
    throw error;
  }
  return resultado.autenticado ? resultado.usuario : null;
}

function actualizarNavegacion(rol, pantalla) {
  if (!navegacion) return;
  navegacion.innerHTML = '';
  navegacion.hidden = true;
}

function irAInicioSesion(pantalla) {
  const seccionSolicitada = new URLSearchParams(window.location.search).get('seccion');
  const destino =
    pantalla === 'P07' && seccionSolicitada === 'postulaciones'
      ? 'POSTULACIONES_CANDIDATO'
      : pantalla;
  window.location.replace(`/?acceso=login&destino=${encodeURIComponent(destino)}`);
}

function renderizarAccesoDenegado(rolRequerido, rolActual) {
  const nombresRol = {
    candidato: 'candidato',
    empresa: 'empresa',
    administrador: 'administrador'
  };
  const mensajeRol = nombresRol[rolActual] || 'visitante';
  return `<section class="mi-perfil-tarjeta" role="alert">
    <h2>Sección no disponible para esta cuenta</h2>
    <p>Esta sección es para cuentas de ${rolRequerido}. Tu sesión actual corresponde a ${mensajeRol}.</p>
    <button type="button" class="boton boton-primario mi-perfil-enlace-boton boton-volver-portal">Volver al portal</button>
  </section>`;
}

function campo(etiqueta, id, tipo = 'text', opciones = {}) {
  const requerido = opciones.requerido ? 'required' : '';
  const atributo = opciones.atributo || '';
  const etiquetaClase = opciones.completo ? ' completo' : '';
  const nombre = opciones.nombre || id;
  const control =
    tipo === 'textarea'
      ? `<textarea id="${id}" name="${nombre}" ${requerido} ${atributo}></textarea>`
      : `<input id="${id}" name="${nombre}" type="${tipo}" ${requerido} ${atributo} />`;

  return `<div class="mi-perfil-campo${etiquetaClase}">
    <label for="${id}">${etiqueta}${opciones.requerido ? ' *' : ''}</label>
    ${control}
  </div>`;
}

function avisoNoPersistido(mensaje) {
  return `<span class="mi-perfil-aviso-accion" role="note">${mensaje}</span>`;
}

function estadoAccion(id) {
  return `<span id="${id}" class="mi-perfil-aviso-accion" role="status" aria-live="polite"></span>`;
}

function renderizarPerfilCandidato(seccion = null) {
  const esPostulaciones = seccion === 'postulaciones';
  return `<div class="mi-perfil-candidato-contenedor">
    <div class="mi-perfil-pestanas" role="tablist" aria-label="Secciones del candidato">
      <button
        type="button"
        role="tab"
        id="tab-boton-perfil"
        class="mi-perfil-pestana ${esPostulaciones ? '' : 'activa'}"
        aria-selected="${!esPostulaciones}"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        Mi perfil profesional
      </button>
      <button
        type="button"
        role="tab"
        id="tab-boton-postulaciones"
        class="mi-perfil-pestana ${esPostulaciones ? 'activa' : ''}"
        aria-selected="${esPostulaciones}"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        Mis postulaciones
        <span id="insignia-total-postulaciones" class="insignia-conteo-pestana" hidden>0</span>
      </button>
    </div>

    <div id="panel-candidato-perfil" class="mi-perfil-contenedor" ${esPostulaciones ? 'hidden' : ''}>
      <section class="mi-perfil-tarjeta mi-perfil-perfil-principal">
        <div class="mi-perfil-perfil-cabecera">
          <img id="perfil-foto-vista" class="oculto" alt="Foto de perfil" />
          <div id="perfil-foto-avatar" class="mi-perfil-avatar">--</div>
          <div class="mi-perfil-identidad">
            <span class="mi-perfil-etiqueta-superior">PERFIL DEL CANDIDATO</span>
            <h2 id="perfil-nombre-resumen">Mi perfil</h2>
            <p id="perfil-titulo-resumen">Completa tu información profesional</p>
            <div class="mi-perfil-completitud"><span id="perfil-porcentaje">0%</span> del perfil completo</div>
          </div>
          <button id="perfil-editar-datos" class="boton mi-perfil-editar-perfil" type="button">Editar datos</button>
        </div>
        <div class="mi-perfil-avance" hidden>
          <strong>Avance del formulario</strong><span>0%</span>
        </div>
        <progress id="perfil-progreso" class="mi-perfil-progreso" max="100" value="0" hidden>0%</progress>
        <div id="perfil-edicion-datos" class="mi-perfil-edicion" hidden>
          <div class="mi-perfil-foto">
            <label for="perfil-foto">Foto de perfil</label>
            <input id="perfil-foto" type="file" accept="${formatosFoto}" />
            <small>JPG, PNG, WebP, GIF, BMP o AVIF. Máximo 10 MB. Se guarda sin animación.</small>
            <p id="perfil-foto-mensaje" class="mi-perfil-ayuda" role="status"></p>
          </div>
          <form class="mi-perfil-formulario" data-formulario="perfil">
            <div class="mi-perfil-campos">
              ${campo('Nombre completo', 'perfil-nombre', 'text', { requerido: true, atributo: 'autocomplete="name" readonly' })}
              ${campo('Correo electrónico', 'perfil-correo', 'email', { requerido: true, atributo: 'autocomplete="email" readonly' })}
              ${campo('Teléfono de contacto', 'perfil-telefono', 'tel', { nombre: 'telefono', atributo: 'maxlength="20" placeholder="Ej. 7000-0000"' })}
              ${campo('Ubicación (departamento o municipio)', 'perfil-ubicacion', 'text', { nombre: 'ubicacion', atributo: 'maxlength="120" list="lista-departamentos-perfil" placeholder="Ej. San Salvador, La Libertad..."' })}
              <datalist id="lista-departamentos-perfil">
                <option value="San Salvador">
                <option value="La Libertad">
                <option value="Santa Ana">
                <option value="San Miguel">
                <option value="Sonsonate">
                <option value="Ahuachapán">
                <option value="Usulután">
                <option value="La Paz">
                <option value="Chalatenango">
                <option value="Cuscatlán">
                <option value="Morazán">
                <option value="San Vicente">
                <option value="Cabañas">
                <option value="La Unión">
              </datalist>
              ${campo('Profesión o título profesional', 'perfil-titulo', 'text', { nombre: 'titulo_profesional', atributo: 'maxlength="120"' })}
              ${campo('Resumen profesional', 'perfil-resumen', 'textarea', { nombre: 'resumen_laboral', atributo: 'maxlength="1000"', completo: true })}
            </div>
            <div class="mi-perfil-acciones">
              <button class="boton boton-primario" type="submit">Guardar perfil</button>
              <button class="boton boton-secundario" type="button" data-descartar-edicion="perfil">Descartar</button>
              ${estadoAccion('perfil-estado')}
            </div>
          </form>
        </div>
        <div id="perfil-estadisticas" class="mi-perfil-estadisticas"></div>
        <div class="mi-perfil-resumen-personal">
          <h3>Información personal</h3>
          <dl>
            <div><dt>Correo</dt><dd id="perfil-resumen-correo">—</dd></div>
            <div><dt>Teléfono</dt><dd id="perfil-resumen-telefono">—</dd></div>
            <div><dt>Ubicación</dt><dd id="perfil-resumen-ubicacion">—</dd></div>
            <div><dt>Resumen</dt><dd id="perfil-resumen-texto">—</dd></div>
          </dl>
        </div>
      </section>
      <section class="mi-perfil-tarjeta mi-perfil-seccion-experiencia">
        <h3>Experiencia laboral</h3>
        <button class="boton mi-perfil-agregar" type="button" data-editar-seccion="experiencia">Agregar</button>
        <form class="mi-perfil-formulario mi-perfil-formulario-edicion" data-lista="experiencia" hidden>
          <div class="mi-perfil-campos">
            ${campo('Puesto', 'experiencia-puesto', 'text', { nombre: 'puesto', requerido: true, atributo: 'maxlength="120"' })}
            ${campo('Empresa', 'experiencia-empresa', 'text', { nombre: 'empresa', requerido: true, atributo: 'maxlength="120"' })}
            ${campo('Fecha de inicio', 'experiencia-fecha-inicio', 'date', { nombre: 'fecha_inicio', requerido: true })}
            ${campo('Fecha de fin (opcional)', 'experiencia-fecha-fin', 'date', { nombre: 'fecha_fin' })}
            ${campo('Descripción (opcional)', 'experiencia-descripcion', 'textarea', { nombre: 'descripcion', atributo: 'maxlength="1000"', completo: true })}
          </div>
          <label class="mi-perfil-opcion"><input id="experiencia-actual" name="es_trabajo_actual" type="checkbox" value="true" /> Trabajo actual</label>
          <div class="mi-perfil-acciones">
            <button class="boton" type="submit">Agregar experiencia</button>
            <button class="boton boton-secundario" type="button" data-descartar-edicion="experiencia">Descartar</button>
            ${estadoAccion('experiencia-estado')}
          </div>
        </form>
        <ul class="mi-perfil-lista" data-lista-items="experiencia"><li class="mi-perfil-vacio">Aún no agregas experiencia.</li></ul>
      </section>
      <section class="mi-perfil-tarjeta mi-perfil-seccion-estudios">
        <h3>Estudios</h3>
        <button class="boton mi-perfil-agregar" type="button" data-editar-seccion="estudios">Agregar</button>
        <form class="mi-perfil-formulario mi-perfil-formulario-edicion" data-lista="estudios" hidden>
          <div class="mi-perfil-campos">
            ${campo('Carrera o programa', 'estudio-programa', 'text', { nombre: 'carrera_programa', requerido: true, atributo: 'maxlength="160"' })}
            ${campo('Institución', 'estudio-institucion', 'text', { nombre: 'institucion', requerido: true, atributo: 'maxlength="160"' })}
            <div class="mi-perfil-campo">
              <label for="estudio-nivel">Nivel académico / educativo *</label>
              <select id="estudio-nivel" name="nivel_academico" required>
                <option value="">Selecciona tu nivel educativo</option>
                <option value="Licenciatura / Ingeniería">Licenciatura / Ingeniería</option>
                <option value="Técnico / Tecnólogo">Técnico / Tecnólogo</option>
                <option value="Bachillerato / Media">Bachillerato / Educación Media</option>
                <option value="Maestría / Posgrado">Maestría / Posgrado</option>
                <option value="Doctorado">Doctorado</option>
                <option value="Diplomado / Certificación">Diplomado / Certificación</option>
                <option value="Educación Básica">Educación Básica / Primaria</option>
                <option value="Otro">Otro nivel educativo</option>
              </select>
            </div>
            ${campo('Año de inicio', 'estudio-anio-inicio', 'number', { nombre: 'anio_inicio', requerido: true, atributo: 'min="1900" max="2200" step="1"' })}
            ${campo('Año de finalización (opcional)', 'estudio-anio-fin', 'number', { nombre: 'anio_fin', atributo: 'min="1900" max="2200" step="1"' })}
          </div>
          <div class="mi-perfil-acciones">
            <button class="boton" type="submit">Agregar estudio</button>
            <button class="boton boton-secundario" type="button" data-descartar-edicion="estudios">Descartar</button>
            ${estadoAccion('estudios-estado')}
          </div>
        </form>
        <ul class="mi-perfil-lista" data-lista-items="estudios"><li class="mi-perfil-vacio">Aún no agregas estudios.</li></ul>
      </section>
      <section class="mi-perfil-tarjeta mi-perfil-seccion-habilidades">
        <h3>Habilidades</h3>
        <button class="boton mi-perfil-agregar" type="button" data-editar-seccion="habilidades">Agregar</button>
        <form class="mi-perfil-formulario mi-perfil-formulario-edicion" data-lista="habilidades" hidden>
          ${campo('Habilidad', 'habilidad-nombre', 'text', { nombre: 'habilidad', requerido: true, atributo: 'maxlength="80"' })}
          <div class="mi-perfil-campo">
            <label for="habilidad-nivel">Nivel de dominio</label>
            <select id="habilidad-nivel" name="nivel_dominio">
              <option>Básico</option><option selected>Intermedio</option><option>Avanzado</option>
            </select>
          </div>
          <div class="mi-perfil-acciones">
            <button class="boton" type="submit">Registrar habilidad</button>
            <button class="boton boton-secundario" type="button" data-descartar-edicion="habilidades">Descartar</button>
            ${estadoAccion('habilidades-estado')}
          </div>
        </form>
        <ul class="mi-perfil-lista" data-lista-items="habilidades"><li class="mi-perfil-vacio">Aún no agregas habilidades.</li></ul>
      </section>
      <section class="mi-perfil-tarjeta mi-perfil-seccion-curriculum">
        <h3>Currículum</h3>
        <div class="mi-perfil-curriculum-resumen"><strong id="perfil-cv-resumen">Sin currículum cargado</strong><span id="perfil-cv-tamano"></span></div>
        <button id="perfil-editar-curriculum" class="boton mi-perfil-agregar" type="button">Reemplazar</button>
        <div class="mi-perfil-edicion" data-edicion-curriculum hidden>
          <p>Sube un archivo PDF privado de máximo 5 MB.</p>
          <div class="mi-perfil-campo"><label for="perfil-cv">Seleccionar archivo PDF (máximo 5 MB)</label><input id="perfil-cv" type="file" accept="application/pdf,.pdf" /></div>
          <p id="perfil-cv-mensaje" class="mi-perfil-ayuda" aria-live="polite">Ningún currículum cargado.</p>
          <div class="mi-perfil-acciones">
            <button id="perfil-cv-guardar" class="boton" type="button">Guardar currículum</button>
            <button class="boton boton-secundario" type="button" data-descartar-edicion="curriculum">Descartar</button>
          </div>
        </div>
        <div class="mi-perfil-acciones">
          <a id="perfil-cv-descargar" href="/api/candidato/curriculum" hidden>Descargar currículum</a>
          <button id="perfil-cv-quitar" class="boton boton-peligro" type="button" hidden>Quitar CV</button>
        </div>
      </section>
      <section class="mi-perfil-tarjeta mi-perfil-seccion-alertas">
        <h3>Alertas laborales</h3>
        <p>Guarda preferencias de búsqueda. Las alertas no envían correos.</p>
        <button class="boton mi-perfil-agregar" type="button" data-editar-seccion="alertas">Nueva alerta</button>
        <form class="mi-perfil-formulario mi-perfil-formulario-edicion" data-formulario="alertas" data-lista="alertas" hidden>
          <div class="mi-perfil-campos">
            ${campo('Nombre de la alerta', 'alerta-nombre', 'text', { nombre: 'nombre_alerta', requerido: true, atributo: 'maxlength="100"' })}
            <div class="mi-perfil-campo">
              <label for="alerta-sector">Sector de interés *</label>
              <select id="alerta-sector" name="sector" required>
                <option value="">Selecciona sector</option>
                <option value="Tecnología">Tecnología y Software</option>
                <option value="Finanzas">Banca y Finanzas</option>
                <option value="Servicios">Servicios Profesionales</option>
                <option value="Comercio">Comercio y Retail</option>
                <option value="Industria">Industria y Manufactura</option>
                <option value="Educación">Educación</option>
                <option value="Salud">Salud y Farmacia</option>
                <option value="Logística">Logística y Transporte</option>
                <option value="Construcción">Construcción e Inmobiliaria</option>
                <option value="Cualquier sector">Cualquier sector</option>
              </select>
            </div>
            <div class="mi-perfil-campo">
              <label for="alerta-modalidad">Modalidad (opcional)</label>
              <select id="alerta-modalidad" name="modalidad">
                <option value="">Cualquier modalidad</option>
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>
            ${campo('Salario mínimo (USD, opcional)', 'alerta-salario-minimo', 'number', { nombre: 'salario_minimo', atributo: 'min="0" step="0.01"' })}
            <div class="mi-perfil-campo">
              <label for="alerta-frecuencia">Frecuencia</label>
              <select id="alerta-frecuencia" name="frecuencia">
                <option>Diaria</option><option selected>Semanal</option><option>Mensual</option>
              </select>
            </div>
          </div>
          <label class="mi-perfil-opcion"><input id="alerta-activa" name="activa" type="checkbox" value="true" checked /> Alerta activa</label>
          <div class="mi-perfil-acciones">
            <button class="boton" type="submit">Configurar alerta</button>
            <button class="boton boton-secundario" type="button" data-descartar-edicion="alertas">Descartar</button>
            ${estadoAccion('alertas-estado')}
          </div>
        </form>
        <ul class="mi-perfil-lista" data-lista-items="alertas"><li class="mi-perfil-vacio">Cargando alertas...</li></ul>
      </section>
    </div>

    <div id="panel-candidato-postulaciones" class="mi-perfil-panel-postulaciones" ${esPostulaciones ? '' : 'hidden'}>
      <section class="mi-perfil-tarjeta postulaciones-presentacion-tarjeta">
        <div class="postulaciones-presentacion-cabecera">
          <div>
            <span class="mi-perfil-etiqueta-superior">SEGUIMIENTO DE POSTULACIONES</span>
            <h2 style="margin: 0.25rem 0 0.4rem; font-size: 1.4rem;">Mis postulaciones laborales</h2>
            <p style="margin:0; color: var(--color-texto-secundario); font-size: 0.88rem;">
              Revisa el estado de tus procesos de selección y consulta los detalles de tus postulaciones en WorkConnect.
            </p>
          </div>
          <button type="button" class="boton boton-primario" id="boton-ir-buscar-empleos" style="flex-shrink:0;">
            Explorar empleos
          </button>
        </div>

        <div class="postulaciones-resumen-metricas">
          <div class="postulacion-kpi-caja">
            <span class="postulacion-kpi-num" id="kpi-postulaciones-total">0</span>
            <span class="postulacion-kpi-etiqueta">Total enviadas</span>
          </div>
          <div class="postulacion-kpi-caja">
            <span class="postulacion-kpi-num" id="kpi-postulaciones-nuevas">0</span>
            <span class="postulacion-kpi-etiqueta">Nuevas</span>
          </div>
          <div class="postulacion-kpi-caja">
            <span class="postulacion-kpi-num" id="kpi-postulaciones-revision">0</span>
            <span class="postulacion-kpi-etiqueta">En revisión</span>
          </div>
          <div class="postulacion-kpi-caja">
            <span class="postulacion-kpi-num" id="kpi-postulaciones-entrevista">0</span>
            <span class="postulacion-kpi-etiqueta">En entrevista</span>
          </div>
          <div class="postulacion-kpi-caja">
            <span class="postulacion-kpi-num" id="kpi-postulaciones-contratada">0</span>
            <span class="postulacion-kpi-etiqueta">Contratada</span>
          </div>
        </div>
      </section>

      <section class="mi-perfil-tarjeta">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.15rem; border-bottom: 1px solid var(--color-borde-suave); padding-bottom: 0.75rem;">
          <h3 style="margin:0; font-size: 1.05rem;">Historial de postulaciones</h3>
          <span id="postulaciones-conteo-texto" style="font-size:0.8rem; color:var(--color-texto-atenuado);">Consultando...</span>
        </div>
        <ul class="lista-postulaciones-candidato" id="postulaciones-candidato-lista">
          <li class="mi-perfil-vacio">Cargando postulaciones...</li>
        </ul>
      </section>
    </div>
  </div>`;
}

function solicitarApiCandidato(ruta, opciones = {}) {
  return solicitarApi(`/api/candidato${ruta}`, opciones);
}

function mostrarEstadoAccion(id, mensaje, error = false) {
  const elemento = contenido.querySelector(`#${id}`);
  if (!elemento) return;
  elemento.textContent = mensaje;
  elemento.classList.toggle('mi-perfil-error-en-linea', error);
}

function etiquetaRegistro(tipo, registro) {
  if (tipo === 'experiencia') {
    return `${registro.puesto} · ${registro.empresa}${registro.es_trabajo_actual ? ' · Actual' : ''}`;
  }
  if (tipo === 'estudios') {
    return `${registro.carrera_programa} · ${registro.institucion} · ${registro.nivel_academico}`;
  }
  if (tipo === 'habilidades') return `${registro.habilidad} · ${registro.nivel_dominio || 'Intermedio'}`;
  return `${registro.nombre_alerta} · ${registro.sector} · ${registro.activa ? 'Activa' : 'Inactiva'}`;
}

function tipoApiCandidato(tipo) {
  return tipo === 'experiencia' ? 'experiencias' : tipo;
}

function renderizarListaCandidato(tipo, registros) {
  const lista = contenido.querySelector(`[data-lista-items="${tipo}"]`);
  lista.replaceChildren();
  if (!registros.length) {
    const vacio = document.createElement('li');
    vacio.className = 'mi-perfil-vacio';
    vacio.textContent = 'Aún no hay elementos guardados.';
    lista.append(vacio);
    return;
  }

  for (const registro of registros) {
    const elemento = document.createElement('li');
    elemento.dataset.id = registro.id;
    const etiqueta = document.createElement('span');
    etiqueta.textContent = etiquetaRegistro(tipo, registro);
    const acciones = document.createElement('span');
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.textContent = 'Editar';
    editar.addEventListener('click', () => {
      const formulario = contenido.querySelector(`[data-lista="${tipo}"]`);
      formulario.hidden = false;
      for (const [clave, valor] of Object.entries(registro)) {
        const entrada = formulario.elements.namedItem(clave);
        if (!entrada) continue;
        if (entrada.type === 'checkbox') entrada.checked = Boolean(valor);
        else entrada.value = valor ?? '';
      }
        if (tipo === 'experiencia') {
          const fechaFin = formulario.querySelector('[name="fecha_fin"]');
          fechaFin.disabled = Boolean(registro.es_trabajo_actual);
        }
      formulario.dataset.editando = registro.id;
      formulario.querySelector('[type="submit"]').textContent = 'Guardar cambios';
      formulario.querySelector('[type="submit"]').scrollIntoView({ block: 'nearest' });
    });
    const eliminar = document.createElement('button');
    eliminar.type = 'button';
    eliminar.textContent = 'Eliminar';
    eliminar.addEventListener('click', async () => {
      try {
        await solicitarApiCandidato(
          `/${tipoApiCandidato(tipo)}/${encodeURIComponent(registro.id)}`,
          { method: 'DELETE' }
        );
        await cargarPerfilCandidato();
        mostrarEstadoAccion(`${tipo}-estado`, 'Elemento eliminado.');
      } catch (error) {
        mostrarEstadoAccion(`${tipo}-estado`, error.message, true);
      }
    });
    acciones.append(editar, eliminar);
    elemento.append(etiqueta, acciones);
    lista.append(elemento);
  }
}

function actualizarResumenCandidato(perfil) {
  const campos = {
    nombre: ['perfil-nombre-resumen', 'Mi perfil'],
    titulo_profesional: ['perfil-titulo-resumen', 'Completa tu información profesional'],
    email: ['perfil-resumen-correo', '—'], telefono: ['perfil-resumen-telefono', '—'],
    ubicacion: ['perfil-resumen-ubicacion', '—'], resumen_laboral: ['perfil-resumen-texto', '—']
  };
  for (const [clave, [id, predeterminado]] of Object.entries(campos)) {
    if (!Object.hasOwn(perfil, clave)) continue;
    const elemento = contenido.querySelector(`#${id}`);
    if (elemento) elemento.textContent = String(perfil[clave] || '').trim() || predeterminado;
  }
}

function actualizarCurriculumCandidato(nombre = '') {
  const guardado = Boolean(nombre);
  contenido.querySelector('#perfil-cv-resumen').textContent = nombre || 'Sin currículum cargado';
  const mensaje = contenido.querySelector('#perfil-cv-mensaje');
  mensaje.textContent = guardado ? `Currículum guardado: ${nombre}.` : 'Ningún currículum cargado.';
  mensaje.classList.remove('mi-perfil-error-en-linea');
  const enlace = contenido.querySelector('#perfil-cv-descargar');
  enlace.classList.toggle('boton', guardado);
  enlace.hidden = !guardado;
  contenido.querySelector('#perfil-cv-quitar').hidden = !guardado;
  contenido.querySelector('#perfil-editar-curriculum').textContent = guardado ? 'Reemplazar' : 'Agregar CV';
}

async function cargarPerfilCandidato(alCambiarPantalla = () => {}, activarPestana = () => {}) {
  const datos = await solicitarApiCandidato('/perfil');
  if (!datos || !datos.perfil) return;
  const formulario = contenido.querySelector('[data-formulario="perfil"]');
  perfilOriginal = {
    telefono: datos.perfil.telefono || '',
    ubicacion: datos.perfil.ubicacion || '',
    titulo_profesional: datos.perfil.titulo_profesional || '',
    resumen_laboral: datos.perfil.resumen_laboral || ''
  };
  for (const [campoId, valor] of Object.entries({
    'perfil-nombre': datos.perfil.nombre,
    'perfil-correo': datos.perfil.email,
    'perfil-telefono': datos.perfil.telefono,
    'perfil-ubicacion': datos.perfil.ubicacion,
    'perfil-titulo': datos.perfil.titulo_profesional,
    'perfil-resumen': datos.perfil.resumen_laboral
  })) {
    const el = contenido.querySelector(`#${campoId}`);
    if (el) el.value = valor || '';
  }
  actualizarResumenCandidato(datos.perfil);

  const foto = contenido.querySelector('#perfil-foto-vista');
  const avatar = contenido.querySelector('#perfil-foto-avatar');
  if (datos.perfil.foto_url) {
    if (foto) {
      foto.src = datos.perfil.foto_url;
      foto.classList.remove('oculto');
    }
    if (avatar) avatar.classList.add('oculto');
  } else {
    if (foto) foto.classList.add('oculto');
    if (avatar) avatar.classList.remove('oculto');
  }
  actualizarCurriculumCandidato(datos.perfil.curriculum_nombre);

  for (const [tipo, propiedad] of [
    ['experiencia', 'experiencias'],
    ['estudios', 'estudios'],
    ['habilidades', 'habilidades'],
    ['alertas', 'alertas']
  ]) {
    renderizarListaCandidato(tipo, datos[propiedad] || []);
  }
  const postulaciones = Array.isArray(datos.postulaciones) ? datos.postulaciones : [];
  const totalPostulaciones = postulaciones.length;
  const nuevas = postulaciones.filter((p) => p.estado === 'Nueva').length;
  const revision = postulaciones.filter((p) => p.estado === 'En revisión').length;
  const entrevista = postulaciones.filter((p) => p.estado === 'Entrevista').length;
  const contratada = postulaciones.filter((p) => p.estado === 'Contratada').length;

  const establecerIndicador = (id, val) => {
    const el = contenido.querySelector(`#${id}`);
    if (el) el.textContent = String(val);
  };
  establecerIndicador('kpi-postulaciones-total', totalPostulaciones);
  establecerIndicador('kpi-postulaciones-nuevas', nuevas);
  establecerIndicador('kpi-postulaciones-revision', revision);
  establecerIndicador('kpi-postulaciones-entrevista', entrevista);
  establecerIndicador('kpi-postulaciones-contratada', contratada);

  const insigniaPestana = contenido.querySelector('#insignia-total-postulaciones');
  if (insigniaPestana) {
    insigniaPestana.textContent = String(totalPostulaciones);
    insigniaPestana.hidden = totalPostulaciones === 0;
  }
  const conteoTexto = contenido.querySelector('#postulaciones-conteo-texto');
  if (conteoTexto) {
    conteoTexto.textContent = totalPostulaciones === 1 ? '1 postulación registrada' : `${totalPostulaciones} postulaciones registradas`;
  }

  const elementoEstadisticas = contenido.querySelector('#perfil-estadisticas');
  if (elementoEstadisticas) {
    elementoEstadisticas.innerHTML = [
      ['experiencias', (datos.experiencias || []).length, null],
      ['estudios', (datos.estudios || []).length, null],
      ['habilidades', (datos.habilidades || []).length, null],
      ['alertas guardadas', (datos.alertas || []).length, null],
      ['postulaciones', totalPostulaciones, 'postulaciones']
    ]
      .map(
        ([etiqueta, cant, pestanaAccion]) =>
          `<div class="mi-perfil-estadistica ${pestanaAccion ? 'estadistica-interactiva' : ''}" ${pestanaAccion ? `data-ir-tab="${pestanaAccion}" title="Ver mis postulaciones"` : ''}><strong>${cant}</strong><span>${etiqueta}</span></div>`
      )
      .join('');

    elementoEstadisticas.querySelectorAll('[data-ir-tab]').forEach((caja) => {
      caja.addEventListener('click', () => {
        activarPestana(caja.dataset.irTab);
      });
    });
  }

  const listaPostulaciones = contenido.querySelector('#postulaciones-candidato-lista');
  if (listaPostulaciones) {
    listaPostulaciones.replaceChildren();
    if (!postulaciones.length) {
      const vacio = document.createElement('li');
      vacio.className = 'postulacion-vacia-tarjeta';
      vacio.innerHTML = `
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-texto-sutil)" stroke-width="1.75" style="margin-bottom:0.75rem;">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
        <p style="margin:0 0 0.35rem; font-weight:700; color:var(--color-texto); font-size:1rem;">Aún no te has postulado a ninguna vacante</p>
        <p style="margin:0 0 1rem; color:var(--color-texto-atenuado); font-size:0.83rem; max-width:28rem;">Explora las vacantes disponibles en WorkConnect y postúlate a las ofertas que coincidan con tu experiencia.</p>
        <button type="button" class="boton boton-primario boton-explorar-vacantes">Explorar vacantes de empleo</button>
      `;
      vacio.querySelector('.boton-explorar-vacantes')?.addEventListener('click', () => {
        alCambiarPantalla('P01');
      });
      listaPostulaciones.append(vacio);
    } else {
      for (const postulacion of postulaciones) {
        const vacante = Array.isArray(postulacion.vacante) ? postulacion.vacante[0] : (postulacion.vacante || {});
        const titulo = vacante.titulo || 'Vacante laboral';
        const modalidad = vacante.modalidad || 'Modalidad no especificada';
        const vacanteId = vacante.id;

        let fechaStr = '';
        if (postulacion.creado_en) {
          try {
            fechaStr = new Intl.DateTimeFormat('es-SV', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }).format(new Date(postulacion.creado_en));
          } catch {
            fechaStr = String(postulacion.creado_en).slice(0, 10);
          }
        }

        const estadoClases = {
          'Nueva': 'insignia-estado-nueva',
          'En revisión': 'insignia-estado-revision',
          'Entrevista': 'insignia-estado-entrevista',
          'Contratada': 'insignia-estado-contratada',
          'Rechazada': 'insignia-estado-rechazada'
        };
        const claseEstado = estadoClases[postulacion.estado] || 'insignia-estado-defecto';

        const tarjeta = document.createElement('li');
        tarjeta.className = 'tarjeta-postulacion-candidato';
        tarjeta.innerHTML = `
          <div class="tarjeta-postulacion-info">
            <div class="tarjeta-postulacion-titulo-linea">
              <strong class="tarjeta-postulacion-titulo">${escaparHtml(titulo)}</strong>
              <span class="insignia-estado-postulacion ${claseEstado}">${escaparHtml(postulacion.estado || 'Enviada')}</span>
            </div>
            <div class="tarjeta-postulacion-detalles">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:0.25rem; vertical-align:middle;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                ${escaparHtml(modalidad)}
              </span>
              ${fechaStr ? `<span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:0.25rem; vertical-align:middle;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Postulado el ${escaparHtml(fechaStr)}
              </span>` : ''}
            </div>
          </div>
          <div class="tarjeta-postulacion-acciones">
            ${vacanteId ? `<button type="button" class="boton boton-secundario boton-ver-oferta">Ver oferta</button>` : ''}
          </div>
        `;
        if (vacanteId) {
          tarjeta.querySelector('.boton-ver-oferta')?.addEventListener('click', () => {
            alCambiarPantalla('P03', vacanteId);
          });
        }
        listaPostulaciones.append(tarjeta);
      }
    }
  }

  if (formulario) {
    const total = [...formulario.querySelectorAll('input:not([readonly]), textarea')];
    const llenos = total.filter((entrada) => entrada.value.trim()).length;
    const valor = total.length ? Math.round((llenos / total.length) * 100) : 0;
    const progreso = contenido.querySelector('#perfil-progreso');
    if (progreso) progreso.value = valor;
    const porcentaje = contenido.querySelector('#perfil-porcentaje');
    if (porcentaje) porcentaje.textContent = `${valor}%`;
  }
}

function enlazarPerfilCandidato(alCambiarPantalla = () => {}, alCambiarSeccion = () => {}, seccionInicial = null) {
  const formPerfil = contenido.querySelector('[data-formulario="perfil"]');
  const edicionDatos = contenido.querySelector('#perfil-edicion-datos');
  const pestanaPerfil = contenido.querySelector('#tab-boton-perfil');
  const pestanaPostulaciones = contenido.querySelector('#tab-boton-postulaciones');
  const panelPerfil = contenido.querySelector('#panel-candidato-perfil');
  const panelPostulaciones = contenido.querySelector('#panel-candidato-postulaciones');

  const activarPestana = (pestanaElemento) => {
    if (pestanaElemento === 'postulaciones') {
      pestanaPerfil?.classList.remove('activa');
      pestanaPerfil?.setAttribute('aria-selected', 'false');
      pestanaPostulaciones?.classList.add('activa');
      pestanaPostulaciones?.setAttribute('aria-selected', 'true');
      if (panelPerfil) panelPerfil.hidden = true;
      if (panelPostulaciones) panelPostulaciones.hidden = false;
      alCambiarSeccion('postulaciones');
    } else {
      pestanaPerfil?.classList.add('activa');
      pestanaPerfil?.setAttribute('aria-selected', 'true');
      pestanaPostulaciones?.classList.remove('activa');
      pestanaPostulaciones?.setAttribute('aria-selected', 'false');
      if (panelPerfil) panelPerfil.hidden = false;
      if (panelPostulaciones) panelPostulaciones.hidden = true;
      alCambiarSeccion('perfil');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (seccionInicial === 'postulaciones') {
    activarPestana('postulaciones');
  }

  pestanaPerfil?.addEventListener('click', () => activarPestana('perfil'));
  pestanaPostulaciones?.addEventListener('click', () => activarPestana('postulaciones'));
  contenido.querySelector('#boton-ir-buscar-empleos')?.addEventListener('click', () => alCambiarPantalla('P01'));

  contenido.querySelector('#perfil-editar-datos')?.addEventListener('click', () => {
    if (edicionDatos) edicionDatos.hidden = !edicionDatos.hidden;
  });
  contenido.querySelectorAll('[data-editar-seccion]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const form = contenido.querySelector(`[data-lista="${boton.dataset.editarSeccion}"]`);
      if (form) {
        form.hidden = false;
        form.querySelector('input, select, textarea')?.focus();
      }
    });
  });
  contenido.querySelector('#perfil-editar-curriculum')?.addEventListener('click', () => {
    const edicionCurriculum = contenido.querySelector('[data-edicion-curriculum]');
    if (edicionCurriculum) edicionCurriculum.hidden = false;
    contenido.querySelector('#perfil-cv')?.focus();
  });
  contenido.querySelectorAll('[data-descartar-edicion]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const tipo = boton.dataset.descartarEdicion;
      if (tipo === 'perfil') {
        for (const [nombre, valor] of Object.entries(perfilOriginal)) {
          const el = formPerfil?.elements?.namedItem(nombre);
          if (el) el.value = valor;
        }
        if (edicionDatos) edicionDatos.hidden = true;
        return;
      }
      if (tipo === 'curriculum') {
        contenido.querySelector('#perfil-cv').value = '';
        contenido.querySelector('[data-edicion-curriculum]').hidden = true;
        return;
      }
      const formulario = contenido.querySelector(`[data-lista="${tipo}"]`);
      formulario.reset();
      delete formulario.dataset.editando;
      formulario.hidden = true;
      const botonGuardar = formulario.querySelector('[type="submit"]');
      botonGuardar.textContent =
        tipo === 'experiencia' ? 'Agregar experiencia' :
        tipo === 'estudios' ? 'Agregar estudio' :
        tipo === 'habilidades' ? 'Registrar habilidad' : 'Configurar alerta';
    });
  });
  const selectorFoto = contenido.querySelector('#perfil-foto');
  const vistaFoto = contenido.querySelector('#perfil-foto-vista');
  const avatarFoto = contenido.querySelector('#perfil-foto-avatar');
  const estadoFoto = contenido.querySelector('#perfil-foto-mensaje');
  selectorFoto.addEventListener('change', async () => {
    const archivo = selectorFoto.files[0];
    if (!archivo) return;
    selectorFoto.disabled = true;
    estadoFoto.textContent = 'Guardando foto...';
    try {
      const resultado = await subirFoto('/api/candidato/foto', archivo);
      vistaFoto.classList.remove('oculto');
      avatarFoto.classList.add('oculto');
      vistaFoto.src = resultado.foto_url;
      const avatarEncabezado = document.querySelector('#boton-menu-usuario .avatar-circular');
      if (avatarEncabezado && resultado.foto_url) {
        if (avatarEncabezado instanceof HTMLImageElement) {
          avatarEncabezado.src = resultado.foto_url;
        } else {
          const imagenEncabezado = document.createElement('img');
          imagenEncabezado.className = 'avatar-circular';
          imagenEncabezado.alt = '';
          imagenEncabezado.src = resultado.foto_url;
          avatarEncabezado.replaceWith(imagenEncabezado);
        }
      }
      estadoFoto.textContent = 'Foto guardada correctamente.';
    } catch (error) {
      estadoFoto.textContent = error.message || 'No se pudo guardar la foto.';
    } finally {
      selectorFoto.disabled = false;
      selectorFoto.value = '';
    }
  });
  const actualizarProgreso = () => {
    const campos = [...formPerfil.querySelectorAll('input:not([readonly]), textarea')];
    const llenos = campos.filter((elemento) => elemento.value.trim()).length;
    const valor = campos.length ? Math.round((llenos / campos.length) * 100) : 0;
    contenido.querySelector('#perfil-progreso').value = valor;
    contenido.querySelector('#perfil-porcentaje').textContent = `${valor}%`;
  };
  formPerfil.addEventListener('input', actualizarProgreso);
  formPerfil.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const boton = formPerfil.querySelector('[type="submit"]');
    boton.disabled = true;
    try {
      const datos = Object.fromEntries(new FormData(formPerfil).entries());
      await solicitarApiCandidato('/perfil', { method: 'PUT', body: JSON.stringify(datos) });
      actualizarResumenCandidato(datos);
      actualizarProgreso();
      perfilOriginal = {
        telefono: datos.telefono || '',
        ubicacion: datos.ubicacion || '',
        titulo_profesional: datos.titulo_profesional || '',
        resumen_laboral: datos.resumen_laboral || ''
      };
      edicionDatos.hidden = true;
      mostrarEstadoAccion('perfil-estado', 'Perfil guardado correctamente.');
    } catch (error) {
      mostrarEstadoAccion('perfil-estado', error.message, true);
    } finally {
      boton.disabled = false;
    }
  });

  const validarRangos = (form) => {
    const tipo = form.getAttribute('data-lista');
    const inicio = form.querySelector(
      tipo === 'experiencia' ? '[name="fecha_inicio"]' : '[name="anio_inicio"]'
    );
    const fin = form.querySelector(
      tipo === 'experiencia' ? '[name="fecha_fin"]' : '[name="anio_fin"]'
    );
    if (!inicio || !fin) return;
    const finAnterior =
      tipo === 'experiencia'
        ? fin.value < inicio.value
        : Number(fin.value) < Number(inicio.value);
    fin.setCustomValidity(
      inicio.value && fin.value && finAnterior
        ? tipo === 'experiencia'
          ? 'La fecha de fin no puede ser anterior a la fecha de inicio.'
          : 'El año de finalización no puede ser anterior al año de inicio.'
        : ''
    );
  };

  contenido.querySelectorAll('[data-lista]').forEach((form) => {
    form.querySelectorAll('input').forEach((entrada) => {
      entrada.addEventListener('input', () => validarRangos(form));
    });
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (form.dataset.lista !== 'habilidades' && form.dataset.lista !== 'alertas') validarRangos(form);
      if (!form.reportValidity()) return;
      const tipo = form.getAttribute('data-lista');
      const boton = form.querySelector('[type="submit"]');
      const registro = Object.fromEntries(new FormData(form).entries());
      for (const casilla of form.querySelectorAll('input[type="checkbox"]')) {
        registro[casilla.name] = casilla.checked;
      }
      if (tipo === 'experiencia' && !registro.es_trabajo_actual) registro.es_trabajo_actual = false;
      if (tipo === 'alertas' && !registro.activa) registro.activa = false;
      boton.disabled = true;
      try {
        const id = form.dataset.editando;
        const tipoApi = tipoApiCandidato(tipo);
        await solicitarApiCandidato(
          id ? `/${tipoApi}/${encodeURIComponent(id)}` : `/${tipoApi}`,
          { method: id ? 'PUT' : 'POST', body: JSON.stringify(registro) }
        );
        delete form.dataset.editando;
        form.reset();
        if (tipo === 'experiencia') {
          form.querySelector('[name="fecha_fin"]').disabled = false;
        }
        form.hidden = true;
        boton.textContent =
          tipo === 'experiencia' ? 'Agregar experiencia' :
          tipo === 'estudios' ? 'Agregar estudio' :
          tipo === 'habilidades' ? 'Registrar habilidad' : 'Configurar alerta';
        await cargarPerfilCandidato();
        mostrarEstadoAccion(`${tipo}-estado`, 'Información guardada correctamente.');
      } catch (error) {
        mostrarEstadoAccion(`${tipo}-estado`, error.message, true);
      } finally {
        boton.disabled = false;
      }
    });
  });

  const selectorCurriculum = contenido.querySelector('#perfil-cv');
  const estadoCurriculum = contenido.querySelector('#perfil-cv-mensaje');
  const botonCurriculum = contenido.querySelector('#perfil-cv-guardar');
  const botonQuitarCurriculum = contenido.querySelector('#perfil-cv-quitar');
  botonQuitarCurriculum.addEventListener('click', async () => {
    if (!await confirmarAccion('¿Quitar el CV de tu perfil? Las postulaciones ya enviadas conservarán su archivo.')) return;
    botonQuitarCurriculum.disabled = true;
    botonCurriculum.disabled = true;
    selectorCurriculum.disabled = true;
    try {
      await solicitarApiCandidato('/curriculum', { method: 'DELETE' });
      selectorCurriculum.value = '';
      actualizarCurriculumCandidato();
      contenido.querySelector('[data-edicion-curriculum]').hidden = true;
    } catch (error) {
      await mostrarAviso(error.message || 'No se pudo quitar el CV.');
    } finally {
      botonQuitarCurriculum.disabled = false;
      botonCurriculum.disabled = false;
      selectorCurriculum.disabled = false;
    }
  });
  selectorCurriculum.addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) {
      return;
    } else if (archivo.type !== 'application/pdf' || archivo.size > 5 * 1024 * 1024) {
      evento.target.value = '';
      estadoCurriculum.textContent = 'Selecciona un archivo PDF de máximo 5 MB.';
      estadoCurriculum.classList.add('mi-perfil-error-en-linea');
    } else {
      estadoCurriculum.textContent = `${archivo.name} seleccionado. Presiona “Guardar currículum” para almacenarlo.`;
      estadoCurriculum.classList.remove('mi-perfil-error-en-linea');
    }
  });
  botonCurriculum.addEventListener('click', async () => {
    const archivo = selectorCurriculum.files[0];
    if (!archivo) {
      estadoCurriculum.textContent = 'Selecciona primero un archivo PDF.';
      estadoCurriculum.classList.add('mi-perfil-error-en-linea');
      return;
    }
    if (archivo.type !== 'application/pdf' || archivo.size > 5 * 1024 * 1024) {
      estadoCurriculum.textContent = 'Selecciona un archivo PDF de máximo 5 MB.';
      estadoCurriculum.classList.add('mi-perfil-error-en-linea');
      return;
    }

    botonCurriculum.disabled = true;
    botonQuitarCurriculum.disabled = true;
    selectorCurriculum.disabled = true;
    estadoCurriculum.textContent = 'Guardando currículum…';
    estadoCurriculum.classList.remove('mi-perfil-error-en-linea');
    try {
      const respuesta = await fetch('/api/candidato/curriculum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-File-Name': encodeURIComponent(archivo.name)
        },
        body: archivo
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo guardar el currículum.');
      selectorCurriculum.value = '';
      actualizarCurriculumCandidato(resultado.curriculum_nombre);
      contenido.querySelector('[data-edicion-curriculum]').hidden = true;
    } catch (error) {
      estadoCurriculum.textContent = error.message || 'No se pudo guardar el currículum.';
      estadoCurriculum.classList.add('mi-perfil-error-en-linea');
    } finally {
      botonCurriculum.disabled = false;
      botonQuitarCurriculum.disabled = false;
      selectorCurriculum.disabled = false;
    }
  });

  contenido.querySelector('#experiencia-actual').addEventListener('change', (evento) => {
    const fechaFin = contenido.querySelector('#experiencia-fecha-fin');
    if (evento.target.checked) fechaFin.value = '';
    fechaFin.disabled = evento.target.checked;
  });
  cargarPerfilCandidato(alCambiarPantalla, activarPestana).catch((error) => {
    contenido.querySelectorAll('.mi-perfil-vacio').forEach((elemento) => {
      elemento.textContent = 'No se pudo cargar la información. Intenta de nuevo.';
    });
    mostrarEstadoAccion('perfil-estado', error.message, true);
  });
}

function renderizarEmpresa() {
  return `<div class="mi-perfil-contenedor">
    <section class="mi-perfil-tarjeta">
      <h2>Perfil de empresa</h2>
      <p>Completa la información de tu empresa para presentar un perfil profesional ante candidatos y en el portal.</p>
      <form class="mi-perfil-formulario" data-formulario="empresa">
        <div class="mi-perfil-campos">
          ${campo('Nombre comercial *', 'empresa-nombre', 'text', { requerido: true })}
          ${campo('Razón social *', 'empresa-razon-social', 'text', { requerido: true })}
          ${campo('NIT *', 'empresa-nit', 'text', { requerido: true, atributo: 'placeholder="0000-000000-000-0"' })}
          <div class="mi-perfil-campo">
            <label for="empresa-sector">Sector económico *</label>
            <select id="empresa-sector" required>
              <option value="">Selecciona sector</option>
              ${SECTORES_ECONOMICOS.map((s) => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="mi-perfil-campo">
            <label for="empresa-departamento">Departamento *</label>
            <select id="empresa-departamento" required>
              <option value="">Selecciona departamento</option>
              ${DEPARTAMENTOS_EL_SALVADOR.map((d) => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>
          <div class="mi-perfil-campo">
            <label for="empresa-municipio">Municipio *</label>
            <select id="empresa-municipio" required>
              <option value="">Selecciona municipio</option>
            </select>
          </div>
          ${campo('Dirección (opcional)', 'empresa-direccion')}
          <div class="mi-perfil-campo">
            <label for="empresa-tamano">Tamaño de empresa *</label>
            <select id="empresa-tamano" name="tamano" required>
              ${TAMANOS_EMPRESA.map((t) => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          ${campo('Correo de contacto *', 'empresa-correo', 'email', { requerido: true })}
          ${campo('Teléfono *', 'empresa-telefono', 'tel', { requerido: true, atributo: 'placeholder="2200-0000"' })}
          ${campo('Sitio web (opcional)', 'empresa-web', 'url', { atributo: 'placeholder="https://..."' })}
          ${campo('Descripción de la empresa', 'empresa-descripcion', 'textarea', { completo: true, atributo: 'rows="4" placeholder="Breve reseña sobre la empresa..."' })}
        </div>
        <p id="empresa-mensaje-estado" class="mi-perfil-ayuda oculto" role="status"></p>
        <div class="mi-perfil-acciones">
          <button id="boton-guardar-empresa" class="boton boton-primario" type="submit">Guardar perfil de empresa</button>
        </div>
      </form>
    </section>
    <section class="mi-perfil-tarjeta">
      <h3>Vista previa corporativa</h3>
      <div class="mi-perfil-vista-previa">
        <div id="empresa-previa-avatar" style="width: 64px; height: 64px; font-size: 1.25rem; margin: 0 auto 0.75rem auto; display: flex; align-items: center; justify-content: center; background: var(--color-acento-solido); color: white; border-radius: 50%; font-weight: bold; overflow: hidden; border: 2px solid var(--color-borde);">
          <span id="empresa-previa-iniciales">WC</span>
          <img id="empresa-previa-img" src="" alt="Logo de la empresa" style="width: 100%; height: 100%; object-fit: cover; display: none;" />
        </div>
        <div style="margin-bottom: 0.75rem; text-align: center;">
          <label for="empresa-logo-entrada" class="boton boton-secundario" style="cursor: pointer; font-size: 0.8rem; padding: 0.35rem 0.75rem; display: inline-block;">
            Cambiar logo
          </label>
          <input id="empresa-logo-entrada" type="file" accept="${formatosFoto}" style="display: none;" />
          <p id="empresa-logo-mensaje" class="mi-perfil-ayuda" style="margin: 0.35rem 0 0; font-size: 0.75rem;">JPG, PNG, WebP, GIF, BMP o AVIF. Máximo 10 MB. Se guarda sin animación.</p>
        </div>
        <strong id="empresa-previa-nombre">Nombre comercial</strong>
        <p id="empresa-previa-sector" class="mi-perfil-ayuda">Sector · Ubicación</p>
        <p id="empresa-previa-descripcion" class="mi-perfil-ayuda">La descripción de la empresa aparecerá aquí.</p>
      </div>
      <div class="mi-perfil-estadisticas">
        <div class="mi-perfil-estadistica"><strong id="estadistica-vacantes-conteo">0</strong><span>Vacantes publicadas</span></div>
        <div class="mi-perfil-estadistica"><strong id="estadistica-postulaciones-conteo">0</strong><span>Postulaciones recibidas</span></div>
      </div>
      <p id="empresa-previa-verificacion" class="mi-perfil-ayuda" style="margin-top: 1rem;">
        Consultando estado de aprobación...
      </p>
      <div class="mi-perfil-acciones">
        <button type="button" class="boton mi-perfil-enlace-boton boton-ir-publicar-vacante">Publicar vacante</button>
        <button type="button" class="boton mi-perfil-enlace-boton boton-ir-postulaciones">Revisar postulaciones</button>
      </div>
    </section>
    <section class="mi-perfil-tarjeta" style="grid-column: 1 / -1; margin-top: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3 style="margin: 0; font-size: 1.15rem;">Mis ofertas de empleo publicadas</h3>
          <p class="mi-perfil-ayuda" style="margin: 0.2rem 0 0;">Busca, edita y administra tus ofertas de empleo.</p>
        </div>
        <button type="button" class="boton boton-primario boton-ir-publicar-vacante">+ Publicar nueva vacante</button>
      </div>
      <label class="campo-formulario" for="buscar-ofertas-empresa">
        <span>Buscar en mis ofertas</span>
        <input id="buscar-ofertas-empresa" class="campo-texto" type="search" maxlength="120" placeholder="Puesto, sector, ubicación o estado..." />
      </label>
      <p id="conteo-ofertas-empresa" class="mi-perfil-ayuda" role="status" aria-live="polite"></p>
      <div class="mi-perfil-desplazamiento">
        <table class="mi-perfil-tabla" id="tabla-vacantes-empresa">
          <thead>
            <tr>
              <th>PUESTO / VACANTE</th>
              <th>UBICACIÓN & MODALIDAD</th>
              <th>PLAZAS & SALARIO</th>
              <th>ESTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody id="cuerpo-vacantes-empresa">
            <tr><td colspan="5" class="mi-perfil-vacio">Cargando ofertas publicadas...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>`;
}

async function enlazarEmpresa(alCambiarPantalla = () => {}) {
  const formulario = contenido.querySelector('[data-formulario="empresa"]');
  contenido.querySelectorAll('.boton-ir-publicar-vacante').forEach((botonAccion) => {
    botonAccion.addEventListener('click', () => alCambiarPantalla('P09'));
  });
  contenido.querySelectorAll('.boton-ir-postulaciones').forEach((botonAccion) => {
    botonAccion.addEventListener('click', () => alCambiarPantalla('P10'));
  });

  const selectorDepartamento = contenido.querySelector('#empresa-departamento');
  const selectorMunicipio = contenido.querySelector('#empresa-municipio');
  const mensajeEstado = contenido.querySelector('#empresa-mensaje-estado');
  const botonGuardarEdicion = contenido.querySelector('#boton-guardar-empresa');
  const cuerpoFilasVacantes = contenido.querySelector('#cuerpo-vacantes-empresa');
  sincronizarMunicipios(selectorDepartamento, selectorMunicipio, 'San Salvador');
  const entradaNit = contenido.querySelector('#empresa-nit');
  entradaNit?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 13) v = `${v.slice(0, 4)}-${v.slice(4, 10)}-${v.slice(10, 13)}-${v.slice(13)}`;
    else if (v.length > 10) v = `${v.slice(0, 4)}-${v.slice(4, 10)}-${v.slice(10)}`;
    else if (v.length > 4) v = `${v.slice(0, 4)}-${v.slice(4)}`;
    e.target.value = v;
  });

  const entradaTelefono = contenido.querySelector('#empresa-telefono');
  entradaTelefono?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 4) v = `${v.slice(0, 4)}-${v.slice(4)}`;
    e.target.value = v;
  });

  const actualizarPrevia = () => {
    const nombre = contenido.querySelector('#empresa-nombre')?.value.trim();
    const sector = contenido.querySelector('#empresa-sector')?.value.trim();
    const departamento = contenido.querySelector('#empresa-departamento')?.value.trim();
    const municipio = contenido.querySelector('#empresa-municipio')?.value.trim();
    const direccion = contenido.querySelector('#empresa-direccion')?.value.trim();
    const descripcion = contenido.querySelector('#empresa-descripcion')?.value.trim();

    const elementoNombre = contenido.querySelector('#empresa-previa-nombre');
    const elementoSector = contenido.querySelector('#empresa-previa-sector');
    const elementoDescripcion = contenido.querySelector('#empresa-previa-descripcion');
    const elementoAvatar = contenido.querySelector('#empresa-previa-avatar');

    if (elementoNombre) elementoNombre.textContent = nombre || 'Nombre comercial';
    if (elementoSector) {
      elementoSector.textContent = `${sector || 'Sector'} · ${direccion ? `${direccion}, ` : ''}${municipio || 'Municipio'}${departamento ? `, ${departamento}` : ''}`;
    }
    if (elementoDescripcion) {
      elementoDescripcion.textContent = descripcion || 'La descripción de la empresa aparecerá aquí.';
    }
    if (elementoAvatar && nombre && imgLogo?.style.display !== 'block') {
      const palabras = nombre.trim().split(/\s+/);
      const iniciales = (palabras[0]?.[0] || 'E') + (palabras[1]?.[0] || '');
      if (textoIniciales) textoIniciales.textContent = iniciales.toUpperCase();
    }
  };

  const entradaLogo = contenido.querySelector('#empresa-logo-entrada');
  const mensajeLogo = contenido.querySelector('#empresa-logo-mensaje');
  const imgLogo = contenido.querySelector('#empresa-previa-img');
  const textoIniciales = contenido.querySelector('#empresa-previa-iniciales');

  const aplicarLogo = (url) => {
    if (url && imgLogo && textoIniciales) {
      imgLogo.src = url;
      imgLogo.style.display = 'block';
      textoIniciales.style.display = 'none';
      const avatarMenu = document.querySelector('#boton-menu-usuario .avatar-circular');
      if (avatarMenu) {
        if (avatarMenu instanceof HTMLImageElement) {
          avatarMenu.src = url;
        } else {
          const img = document.createElement('img');
          img.className = 'avatar-circular';
          img.alt = '';
          img.src = url;
          avatarMenu.replaceWith(img);
        }
      }
    }
  };

  entradaLogo?.addEventListener('change', async () => {
    const archivo = entradaLogo.files[0];
    if (!archivo) return;
    entradaLogo.disabled = true;
    if (mensajeLogo) {
      mensajeLogo.textContent = 'Guardando logo...';
      mensajeLogo.style.color = 'var(--color-vino)';
    }
    try {
      const resultadoJson = await subirFoto('/api/empresa/logo', archivo);
      aplicarLogo(resultadoJson.logo_url);
      if (mensajeLogo) {
        mensajeLogo.textContent = 'Logo actualizado correctamente.';
        mensajeLogo.style.color = 'var(--color-esmeralda)';
      }
    } catch (errorLogo) {
      if (mensajeLogo) {
        mensajeLogo.textContent = errorLogo.message || 'Error al guardar el logo.';
        mensajeLogo.style.color = 'var(--color-rosa)';
      }
    } finally {
      entradaLogo.disabled = false;
      entradaLogo.value = '';
    }
  });

  const controlesPrevia = [
    'empresa-nombre',
    'empresa-sector',
    'empresa-departamento',
    'empresa-municipio',
    'empresa-direccion',
    'empresa-descripcion'
  ];
  controlesPrevia.forEach((id) => {
    contenido.querySelector(`#${id}`)?.addEventListener('input', actualizarPrevia);
    contenido.querySelector(`#${id}`)?.addEventListener('change', actualizarPrevia);
  });
  const buscadorOfertas = contenido.querySelector('#buscar-ofertas-empresa');
  const conteoOfertas = contenido.querySelector('#conteo-ofertas-empresa');
  let ofertasCargadas = [];
  const pintarOfertas = () => {
    if (!cuerpoFilasVacantes) return;
    const vacantes = filtrarOfertas(ofertasCargadas, buscadorOfertas?.value || '');
    if (conteoOfertas) conteoOfertas.textContent = `${vacantes.length} de ${ofertasCargadas.length} ofertas`;
    if (!vacantes.length) {
      cuerpoFilasVacantes.innerHTML = `<tr><td colspan="5" class="mi-perfil-vacio">${ofertasCargadas.length ? 'No hay ofertas que coincidan con tu búsqueda.' : 'Todavía no has publicado ofertas de empleo.'}</td></tr>`;
      return;
    }

    cuerpoFilasVacantes.innerHTML = vacantes.map((v) => {
      const esActiva = v.estado === 'Activa';

      return `
        <tr data-vacante-id="${v.id}">
          <td>
            <strong>${escaparHtml(v.titulo)}</strong>
            <div class="mi-perfil-ayuda" style="font-size:0.75rem;">${escaparHtml(v.sector)}</div>
          </td>
          <td>
            <div>${escaparHtml(v.municipio)}, ${escaparHtml(v.departamento)}</div>
            <div class="mi-perfil-ayuda" style="font-size:0.75rem;">${escaparHtml(v.modalidad)} · ${escaparHtml(v.tipo_contrato)}</div>
          </td>
          <td>
            <div>${v.plazas} ${v.plazas === 1 ? 'plaza' : 'plazas'}</div>
            <div class="mi-perfil-ayuda" style="font-size:0.75rem;">$${Number(v.salario_min || 0)} - $${Number(v.salario_max || 0)}</div>
          </td>
          <td>
            <span class="etiqueta-estado">
              ${escaparHtml(v.estado)}
            </span>
          </td>
          <td>
            <div class="grupo-acciones">
              <button type="button" class="boton" data-editar-oferta="${v.id}">Editar</button>
              <button type="button" class="boton boton-cambiar-vacante" data-id="${v.id}" data-estado-actual="${v.estado}">
                ${esActiva ? 'Desactivar' : 'Activar'}
              </button>
              <button type="button" class="boton boton-eliminar-vacante" data-id="${v.id}" data-titulo="${escaparHtml(v.titulo)}">
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    cuerpoFilasVacantes.querySelectorAll('[data-editar-oferta]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const oferta = ofertasCargadas.find((vacante) => vacante.id === boton.dataset.editarOferta);
        if (!oferta) return;
        abrirModal({ titulo: 'Editar oferta', contenidoHtml: renderizarVacante(oferta), alMontar(raiz, cerrar) {
          enlazarVacante(alCambiarPantalla, { raiz, vacante: oferta, alCancelar: cerrar,
            alGuardar: async () => { cerrar(); await cargarOfertasEmpresa(); } });
        } });
      });
    });
    cuerpoFilasVacantes.querySelectorAll('.boton-cambiar-vacante').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const id = boton.dataset.id;
        const estadoActual = boton.dataset.estadoActual;
        const nuevoEstado = estadoActual === 'Activa' ? 'Inactiva' : 'Activa';
        boton.disabled = true;

        try {
          const respuestaHttp = await fetch(`/api/empresa/vacantes/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
          });
          const resultadoJson = await respuestaHttp.json().catch(() => ({}));
          if (!respuestaHttp.ok) throw new Error(resultadoJson.error || 'No se pudo cambiar el estado.');
          await cargarOfertasEmpresa();
        } catch (errorCapturado) {
          mostrarAviso(errorCapturado.message || 'Error al cambiar estado.');
          boton.disabled = false;
        }
      });
    });
    cuerpoFilasVacantes.querySelectorAll('.boton-eliminar-vacante').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const id = boton.dataset.id;
        const titulo = boton.dataset.titulo;
        const confirmar = await confirmarAccion(`¿Estás seguro de que deseas eliminar la oferta "${titulo}"? Se eliminarán también las postulaciones vinculadas a ella.`);
        if (!confirmar) return;

        boton.disabled = true;
        try {
          const respuestaHttp = await fetch(`/api/empresa/vacantes/${id}`, { method: 'DELETE' });
          const resultadoJson = await respuestaHttp.json().catch(() => ({}));
          if (!respuestaHttp.ok) throw new Error(resultadoJson.error || 'No se pudo eliminar la vacante.');
          await cargarOfertasEmpresa();
        } catch (errorCapturado) {
          mostrarAviso(errorCapturado.message || 'Error al eliminar oferta.');
          boton.disabled = false;
        }
      });
    });

  };
  const cargarOfertasEmpresa = async () => {
    if (!cuerpoFilasVacantes) return;
    try {
      const datos = await solicitarApi('/api/empresa/vacantes', { cache: 'no-store' });
      ofertasCargadas = Array.isArray(datos.vacantes) ? datos.vacantes : [];
      const estadisticaVacantes = contenido.querySelector('#estadistica-vacantes-conteo');
      if (estadisticaVacantes) estadisticaVacantes.textContent = ofertasCargadas.length;
      pintarOfertas();
    } catch (error) {
      cuerpoFilasVacantes.innerHTML = '<tr><td colspan="5" class="mi-perfil-vacio">No se pudieron cargar las ofertas de empleo.</td></tr>';
      if (conteoOfertas) conteoOfertas.textContent = error.message;
    }
  };
  buscadorOfertas?.addEventListener('input', pintarOfertas);
  try {
    const respuestaHttp = await fetch('/api/empresa/perfil', { cache: 'no-store' });
    const datos = await respuestaHttp.json().catch(() => ({}));
    if (respuestaHttp.ok && datos.empresa) {
      const emp = datos.empresa;
      const establecerValor = (id, val) => {
        const el = contenido.querySelector(`#${id}`);
        if (el && val !== undefined && val !== null) el.value = val;
      };

      establecerValor('empresa-nombre', emp.nombre_comercial || '');
      establecerValor('empresa-razon-social', emp.razon_social || '');
      establecerValor('empresa-nit', emp.nit || '');
      establecerValor('empresa-sector', emp.sector || '');
      establecerValor('empresa-departamento', emp.departamento || 'San Salvador');

      sincronizarMunicipios(selectorDepartamento, selectorMunicipio, emp.municipio || 'San Salvador');

      establecerValor('empresa-direccion', emp.direccion || '');
      establecerValor('empresa-tamano', emp.tamano || '51-200 empleados');
      establecerValor('empresa-correo', emp.contacto_email || datos.usuario?.email || '');
      establecerValor('empresa-telefono', emp.telefono || datos.usuario?.telefono || '');
      establecerValor('empresa-web', emp.sitio_web || '');
      establecerValor('empresa-descripcion', emp.descripcion || '');

      const verificacion = contenido.querySelector('#empresa-previa-verificacion');
      const estadosEmpresa = {
        Verificada: 'Empresa aprobada por administración. Tus ofertas pueden aparecer públicamente.',
        Pendiente: 'Pendiente de aprobación por un administrador. Tus ofertas aún no son visibles al público.',
        Suspendida: 'Empresa suspendida. Tus ofertas no son visibles al público. Contacta con administración.'
      };
      if (verificacion) {
        const estado = Object.hasOwn(estadosEmpresa, emp.estado_verificacion) ? emp.estado_verificacion : 'Pendiente';
        verificacion.innerHTML = `<span class="etiqueta-cuadrada">${estado}</span> ${estadosEmpresa[estado]}`;
        verificacion.dataset.estadoEmpresa = estado;
      }

      const estadisticaVacantes = contenido.querySelector('#estadistica-vacantes-conteo');
      const estadisticaPostulaciones = contenido.querySelector('#estadistica-postulaciones-conteo');
      if (estadisticaVacantes) estadisticaVacantes.textContent = datos.conteoVacantes ?? 0;
      if (estadisticaPostulaciones) estadisticaPostulaciones.textContent = datos.conteoPostulaciones ?? 0;
      if (emp.logo_url || datos.usuario?.foto_url) {
        aplicarLogo(emp.logo_url || datos.usuario.foto_url);
      }

      actualizarPrevia();
    }
  } catch (errorCarga) {
    console.error('Error al cargar perfil de empresa:', errorCarga);
    const verificacion = contenido.querySelector('#empresa-previa-verificacion');
    if (verificacion) verificacion.textContent = 'No se pudo consultar el estado de aprobación. Recarga la página.';
  }
  await cargarOfertasEmpresa();

  formulario?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;

    if (botonGuardarEdicion) botonGuardarEdicion.disabled = true;
    if (mensajeEstado) {
      mensajeEstado.classList.add('oculto');
      mensajeEstado.className = 'mi-perfil-ayuda oculto';
    }

    const contenidoFirmado = {
      nombre_comercial: contenido.querySelector('#empresa-nombre').value.trim(),
      razon_social: contenido.querySelector('#empresa-razon-social').value.trim(),
      nit: contenido.querySelector('#empresa-nit').value.trim(),
      sector: contenido.querySelector('#empresa-sector').value.trim(),
      departamento: contenido.querySelector('#empresa-departamento').value.trim(),
      municipio: contenido.querySelector('#empresa-municipio').value.trim(),
      direccion: contenido.querySelector('#empresa-direccion').value.trim(),
      tamano: contenido.querySelector('#empresa-tamano').value.trim(),
      contacto_email: contenido.querySelector('#empresa-correo').value.trim().toLowerCase(),
      telefono: contenido.querySelector('#empresa-telefono').value.trim(),
      sitio_web: contenido.querySelector('#empresa-web').value.trim(),
      descripcion: contenido.querySelector('#empresa-descripcion').value.trim()
    };

    try {
      const respuestaHttp = await fetch('/api/empresa/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contenidoFirmado)
      });
      const respuesta = await respuestaHttp.json().catch(() => ({}));
      if (!respuestaHttp.ok) throw new Error(respuesta.error || 'No se pudo guardar el perfil.');

      if (mensajeEstado) {
        mensajeEstado.textContent = '✓ Perfil de empresa guardado exitosamente en la base de datos.';
        mensajeEstado.className = 'mi-perfil-ayuda';
        mensajeEstado.style.color = 'var(--color-esmeralda)';
        mensajeEstado.style.fontWeight = '600';
        mensajeEstado.classList.remove('oculto');
      }
      actualizarPrevia();
    } catch (error) {
      if (mensajeEstado) {
        mensajeEstado.textContent = error.message || 'Error al guardar el perfil.';
        mensajeEstado.className = 'mi-perfil-error-en-linea';
        mensajeEstado.style.color = 'var(--color-rosa)';
        mensajeEstado.classList.remove('oculto');
      }
    } finally {
      if (botonGuardarEdicion) botonGuardarEdicion.disabled = false;
    }
  });
}

function renderizarVacante(vacante = null) {
  return `<div class="mi-perfil-contenedor ${vacante ? 'edicion-vacante-contenedor' : 'publicacion-vacante-contenedor'}">
    <section class="mi-perfil-tarjeta">
      <h2>${vacante ? 'Editar oferta de empleo' : 'Publicar vacante'}</h2>
      <p>${vacante ? 'Actualiza los datos de tu oferta. Su estado de publicación se conserva.' : 'Publica una nueva oportunidad laboral. Las ofertas solo serán visibles cuando un administrador apruebe tu empresa.'}</p>
      <form class="mi-perfil-formulario" data-formulario="vacante">
        <div id="vacante-mensaje-estado" class="oculto" role="alert"></div>
        <div class="mi-perfil-campos">
          ${campo('Título del puesto *', 'vacante-titulo', 'text', { requerido: true, atributo: 'placeholder="Ej. Desarrollador/a Frontend React"' })}
          <div class="mi-perfil-campo">
            <label for="vacante-sector">Sector económico *</label>
            <select id="vacante-sector" required>
              <option value="">Selecciona sector</option>
              ${SECTORES_ECONOMICOS.map((s) => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="mi-perfil-campo">
            <label for="vacante-departamento">Departamento *</label>
            <select id="vacante-departamento" required>
              <option value="">Selecciona departamento</option>
              ${DEPARTAMENTOS_EL_SALVADOR.map((d) => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>
          <div class="mi-perfil-campo">
            <label for="vacante-municipio">Municipio *</label>
            <select id="vacante-municipio" required>
              <option value="">Selecciona municipio</option>
            </select>
          </div>
        </div>
        <div class="mi-perfil-campos">
          <div class="mi-perfil-campo">
            <label for="vacante-modalidad">Modalidad *</label>
            <select id="vacante-modalidad" name="modalidad" required>
              <option value="">Selecciona modalidad</option>
              ${MODALIDADES_TRABAJO.map((m) => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
          <div class="mi-perfil-campo">
            <label for="vacante-contrato">Tipo de contrato *</label>
            <select id="vacante-contrato" name="tipo_contrato" required>
              <option value="">Selecciona tipo de contrato</option>
              ${TIPOS_CONTRATO.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          ${campo('Número de plazas *', 'vacante-plazas', 'number', { requerido: true, atributo: 'min="1" step="1" value="1"' })}
        </div>
        <div class="mi-perfil-campos">
          ${campo('Salario mínimo (USD) *', 'vacante-salario-min', 'number', { requerido: true, atributo: 'min="0" step="0.01" placeholder="Ej. 600"' })}
          ${campo('Salario máximo (USD) *', 'vacante-salario-max', 'number', { requerido: true, atributo: 'min="0" step="0.01" placeholder="Ej. 1000"' })}
          ${campo('Fecha límite de postulación (opcional)', 'vacante-fecha-limite', 'date')}
        </div>
        <div class="mi-perfil-campos">
          ${campo('Descripción general del puesto *', 'vacante-descripcion', 'textarea', { requerido: true, completo: true, atributo: 'rows="3" placeholder="Resumen del puesto y de la oportunidad laboral..."' })}
          ${campo('Funciones y responsabilidades *', 'vacante-funciones', 'textarea', { requerido: true, completo: true, atributo: 'rows="3" placeholder="Escribe una función por línea o separadas por viñetas..."' })}
          ${campo('Requisitos del candidato *', 'vacante-requisitos', 'textarea', { requerido: true, completo: true, atributo: 'rows="3" placeholder="Escribe un requisito por línea..."' })}
          ${campo('Beneficios ofrecidos (opcional)', 'vacante-beneficios', 'textarea', { completo: true, atributo: 'rows="3" placeholder="Escribe los beneficios por línea (seguro médico, horarios flexibles, etc.)..."' })}
        </div>
        <div class="mi-perfil-acciones">
          <button id="boton-publicar-vacante" class="boton boton-primario" type="submit">${vacante ? 'Guardar cambios' : 'Publicar vacante'}</button>
          ${vacante ? '<button class="boton" type="button" data-cancelar-oferta>Cancelar</button>' : '<button class="boton" type="reset">Limpiar formulario</button>'}
        </div>
      </form>
    </section>
    ${vacante ? '' : '<aside class="mi-perfil-tarjeta vacante-vista-previa" aria-label="Vista previa de la vacante"></aside>'}
  </div>`;
}

function enlazarVacante(alCambiarPantalla = () => {}, { raiz = contenido, vacante = null, alGuardar = () => {}, alCancelar = () => {} } = {}) {
  const formulario = raiz.querySelector('[data-formulario="vacante"]');
  if (!formulario) return;

  const selectorDepartamento = formulario.querySelector('#vacante-departamento');
  const selectorMunicipio = formulario.querySelector('#vacante-municipio');
  const mensajeEstado = formulario.querySelector('#vacante-mensaje-estado');
  const botonPublicarTema = formulario.querySelector('#boton-publicar-vacante');

  sincronizarMunicipios(selectorDepartamento, selectorMunicipio, 'San Salvador');
  if (vacante) {
    const valores = { titulo: vacante.titulo, sector: vacante.sector, departamento: vacante.departamento,
      modalidad: vacante.modalidad, contrato: vacante.tipo_contrato, plazas: vacante.plazas,
      'salario-min': vacante.salario_min, 'salario-max': vacante.salario_max,
      'fecha-limite': vacante.fecha_limite?.slice(0, 10) || '', descripcion: vacante.descripcion,
      funciones: Array.isArray(vacante.funciones) ? vacante.funciones.join('\n') : vacante.funciones || '',
      requisitos: Array.isArray(vacante.requisitos) ? vacante.requisitos.join('\n') : vacante.requisitos || '',
      beneficios: Array.isArray(vacante.beneficios) ? vacante.beneficios.join('\n') : vacante.beneficios || '' };
    for (const [campo, valor] of Object.entries(valores)) {
      const entrada = formulario.querySelector(`#vacante-${campo}`);
      if (entrada.tagName === 'SELECT' && valor && ![...entrada.options].some((opcion) => opcion.value === valor)) entrada.add(new Option(valor, valor));
      entrada.value = valor ?? '';
    }
    sincronizarMunicipios(selectorDepartamento, selectorMunicipio, vacante.municipio);
    if (vacante.municipio && ![...selectorMunicipio.options].some((opcion) => opcion.value === vacante.municipio)) selectorMunicipio.add(new Option(vacante.municipio, vacante.municipio));
    selectorMunicipio.value = vacante.municipio || '';
    formulario.querySelector('[data-cancelar-oferta]').addEventListener('click', alCancelar);
  }

  const validacionFormulario = enlazarValidacionVacante(formulario, vacante?.fecha_limite?.slice(0, 10));

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const datos = validacionFormulario.validar();
    if (!datos) return;

    if (botonPublicarTema) botonPublicarTema.disabled = true;
    if (mensajeEstado) mensajeEstado.classList.add('oculto');

    try {
      const respuestaHttp = await fetch(vacante ? `/api/empresa/vacantes/${vacante.id}` : '/api/empresa/vacantes', {
        method: vacante ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      const resultado = await respuestaHttp.json().catch(() => ({}));
      if (!respuestaHttp.ok && resultado.errores) { validacionFormulario.mostrarErrores(resultado.errores); return; }
      if (!respuestaHttp.ok) throw new Error(resultado.error || 'No se pudo publicar la vacante.');
      if (vacante) { await alGuardar(resultado.vacante); return; }

      formulario.reset();
      sincronizarMunicipios(selectorDepartamento, selectorMunicipio, 'San Salvador');
      mostrarAvisoContextual(mensajeEstado, { tipo: 'exito', titulo: 'Vacante guardada', mensaje: `Vacante "${datos.titulo}" guardada. Será visible para candidatos si tu empresa está aprobada.` });
    } catch (error) {
      mostrarAvisoContextual(mensajeEstado, { titulo: 'No se pudo guardar la vacante', mensaje: error.message || 'Intenta de nuevo.' });
    } finally {
      if (botonPublicarTema) botonPublicarTema.disabled = false;
    }
  });

  formulario.addEventListener('reset', () => {
    if (mensajeEstado) mensajeEstado.classList.add('oculto');
  });
  enlazarVistaPreviaVacante(formulario, raiz.querySelector('.vacante-vista-previa'));
}

function renderizarPostulaciones() {
  return `<div class="mi-perfil-contenedor empresa-postulaciones-contenedor">
    <section class="mi-perfil-tarjeta">
      <h2>Postulaciones recibidas</h2>
      <p>Revisa y gestiona los candidatos que se han postulado a las vacantes publicadas por tu empresa.</p>
      <div id="postulaciones-conteo-estados" class="mi-perfil-estadisticas">
        ${estadosPostulacion.map((estado) => `<div class="mi-perfil-estadistica" data-conteo-estado="${estado}"><strong>0</strong><span>${escaparHtml(estado)}</span></div>`).join('')}
      </div>
    </section>
    <section class="mi-perfil-tarjeta">
      <div class="mi-perfil-filtros">
        <div class="mi-perfil-campo">
          <label for="postulacion-busqueda">Candidato o puesto</label>
          <input id="postulacion-busqueda" type="search" placeholder="Buscar por candidato o puesto..." />
        </div>
        <div class="mi-perfil-campo">
          <label for="postulacion-filtro-estado">Estado de postulación</label>
          <select id="postulacion-filtro-estado">
            <option value="">Todos los estados</option>
            ${estadosPostulacion.map((estado) => `<option value="${estado}">${escaparHtml(estado)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="mi-perfil-desplazamiento">
        <table class="mi-perfil-tabla" id="tabla-postulaciones-empresa">
          <thead>
            <tr>
              <th>CANDIDATO</th>
              <th>PUESTO / VACANTE</th>
              <th>FECHA</th>
              <th>ESTADO</th>
              <th>CURRÍCULUM</th>
            </tr>
          </thead>
          <tbody id="cuerpo-postulaciones-empresa">
            <tr><td colspan="5" class="mi-perfil-vacio">Cargando postulaciones recibidas...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>`;
}

async function enlazarPostulaciones() {
  const cuerpoFilas = contenido.querySelector('#cuerpo-postulaciones-empresa');
  const entradaBusqueda = contenido.querySelector('#postulacion-busqueda');
  const selectorFiltroEstado = contenido.querySelector('#postulacion-filtro-estado');

  let postulacionesCargadas = [];

  const actualizarConteoEstados = () => {
    const conteos = {};
    estadosPostulacion.forEach((e) => (conteos[e] = 0));
    postulacionesCargadas.forEach((p) => {
      if (conteos[p.estado] !== undefined) conteos[p.estado]++;
    });
    estadosPostulacion.forEach((e) => {
      const tarjeta = contenido.querySelector(`[data-conteo-estado="${e}"] strong`);
      if (tarjeta) tarjeta.textContent = conteos[e] || 0;
    });
  };

  const renderizarFilas = () => {
    if (!cuerpoFilas) return;
    const busqueda = (entradaBusqueda?.value || '').trim().toLowerCase();
    const filtroEstado = selectorFiltroEstado?.value || '';

    const filtradas = postulacionesCargadas.filter((p) => {
      const coincideEstado = !filtroEstado || p.estado === filtroEstado;
      const coincideBusqueda =
        !busqueda ||
        (p.candidato?.nombre || '').toLowerCase().includes(busqueda) ||
        (p.vacante?.titulo || '').toLowerCase().includes(busqueda) ||
        (p.candidato?.email || '').toLowerCase().includes(busqueda);
      return coincideEstado && coincideBusqueda;
    });

    if (!filtradas.length) {
      cuerpoFilas.innerHTML = `<tr><td colspan="5" class="mi-perfil-vacio">No se encontraron postulaciones con los filtros seleccionados.</td></tr>`;
      return;
    }

    const formatoFecha = new Intl.DateTimeFormat('es-SV', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    cuerpoFilas.innerHTML = filtradas
      .map((p) => {
        const fecha = p.creado_en ? formatoFecha.format(new Date(p.creado_en)) : '—';

        return `
          <tr data-postulacion-fila="${p.id}">
            <td>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                ${renderizarAvatar({ nombre: p.candidato?.nombre || 'Candidato/a', fotoUrl: p.candidato?.foto_url })}
                <div>
                  <strong>${escaparHtml(p.candidato?.nombre || 'Candidato/a')}</strong>
                  <div class="mi-perfil-ayuda" style="font-size: 0.78rem;">
                    ${escaparHtml(p.candidato?.titulo_profesional || 'Perfil registrado')}
                    ${p.candidato?.ubicacion ? ` · ${escaparHtml(p.candidato.ubicacion)}` : ''}
                  </div>
                  <div class="mi-perfil-ayuda" style="font-size: 0.75rem;">
                    ${escaparHtml(p.candidato?.email || '')} ${p.candidato?.telefono ? ` · Tel: ${escaparHtml(p.candidato.telefono)}` : ''}
                  </div>
                </div>
              </div>
            </td>
            <td>
              <strong>${escaparHtml(p.vacante?.titulo || 'Vacante')}</strong>
              <div class="mi-perfil-ayuda" style="font-size: 0.78rem;">
                ${escaparHtml(p.vacante?.modalidad || '')} · ${escaparHtml(p.vacante?.sector || '')}
              </div>
            </td>
            <td>${fecha}</td>
            <td>
              <select class="selector-estado-postulacion" data-postulacion-id="${p.id}" style="padding: 0.35rem 0.6rem; border-radius: 0.375rem; border: 1px solid var(--color-borde); font-size: 0.82rem; font-weight: 500;">
                <option value="Nueva" ${p.estado === 'Nueva' ? 'selected' : ''}>Nueva</option>
                <option value="En revisión" ${p.estado === 'En revisión' ? 'selected' : ''}>En revisión</option>
                <option value="Entrevista" ${p.estado === 'Entrevista' ? 'selected' : ''}>Entrevista</option>
                <option value="Contratada" ${p.estado === 'Contratada' ? 'selected' : ''}>✓ Aceptada / Contratada</option>
                <option value="Rechazada" ${p.estado === 'Rechazada' ? 'selected' : ''}>✗ Denegada / Rechazada</option>
              </select>
            </td>
            <td>
              <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                ${p.curriculum_url ? `<a class="boton" href="${escaparHtml(p.curriculum_url)}" target="_blank" rel="noopener">Ver currículum</a>` : ''}
                <button type="button" class="boton" data-reportar-postulacion="${p.id}">Reportar</button>
                <button type="button" class="boton boton-accion-aceptar" data-id="${p.id}" ${p.estado === 'Contratada' ? 'disabled' : ''} title="Aceptar al candidato">
                  ✓ Aceptar
                </button>
                <button type="button" class="boton boton-accion-denegar" data-id="${p.id}" ${p.estado === 'Rechazada' ? 'disabled' : ''} title="Denegar al postulante">
                  ✗ Denegar
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    cuerpoFilas.querySelectorAll('[data-reportar-postulacion]').forEach((boton) => {
      boton.addEventListener('click', async () => {
        boton.disabled = true;
        try { await reportarContenido('postulaciones', boton.dataset.reportarPostulacion, mostrarAviso); }
        finally { boton.disabled = false; }
      });
    });

    const cambiarEstadoPostulacion = async (id, nuevoEstado) => {
      try {
        const respuestaHttp = await fetch(`/api/empresa/postulaciones/${id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado })
        });
        const resultadoJson = await respuestaHttp.json().catch(() => ({}));
        if (!respuestaHttp.ok) throw new Error(resultadoJson.error || 'No se pudo actualizar.');

        const postulacionRegistro = postulacionesCargadas.find((x) => x.id === id);
        if (postulacionRegistro) postulacionRegistro.estado = nuevoEstado;
        actualizarConteoEstados();
        renderizarFilas();
      } catch (errorActualizacion) {
        mostrarAviso(errorActualizacion.message || 'Error al cambiar estado.');
      }
    };
    cuerpoFilas.querySelectorAll('.selector-estado-postulacion').forEach((selectorEntrada) => {
      selectorEntrada.addEventListener('change', async () => {
        const id = selectorEntrada.dataset.postulacionId;
        const nuevoEstado = selectorEntrada.value;
        selectorEntrada.disabled = true;
        await cambiarEstadoPostulacion(id, nuevoEstado);
        selectorEntrada.disabled = false;
      });
    });
    cuerpoFilas.querySelectorAll('.boton-accion-aceptar').forEach((botonAccion) => {
      botonAccion.addEventListener('click', async () => {
        const id = botonAccion.dataset.id;
        botonAccion.disabled = true;
        await cambiarEstadoPostulacion(id, 'Contratada');
      });
    });
    cuerpoFilas.querySelectorAll('.boton-accion-denegar').forEach((botonAccion) => {
      botonAccion.addEventListener('click', async () => {
        const id = botonAccion.dataset.id;
        botonAccion.disabled = true;
        await cambiarEstadoPostulacion(id, 'Rechazada');
      });
    });
  };

  entradaBusqueda?.addEventListener('input', renderizarFilas);
  selectorFiltroEstado?.addEventListener('change', renderizarFilas);

  try {
    const respuestaHttp = await fetch('/api/empresa/postulaciones', { cache: 'no-store' });
    const datos = await respuestaHttp.json().catch(() => ({}));
    if (respuestaHttp.ok && Array.isArray(datos.postulaciones)) {
      postulacionesCargadas = datos.postulaciones;
      actualizarConteoEstados();
      renderizarFilas();
    } else {
      cuerpoFilas.innerHTML = `<tr><td colspan="5" class="mi-perfil-vacio">No se pudieron cargar las postulaciones.</td></tr>`;
    }
  } catch (error) {
    cuerpoFilas.innerHTML = `<tr><td colspan="5" class="mi-perfil-vacio">Error al consultar postulaciones recibidas.</td></tr>`;
  }
}

async function renderizarPantalla() {
  const secuenciaActual = ++secuenciaPantalla;
  if (window.location.hash === '#P06') {
    window.location.replace('/?acceso=login');
    return;
  }

  const pantalla = /^#P(07|08|09|10)$/.test(window.location.hash)
    ? window.location.hash.slice(1)
    : 'P07';
  let sesion;
  try {
    sesion = await leerSesionActual();
  } catch (error) {
    if (secuenciaActual !== secuenciaPantalla) return;
    if (error.status === 401) {
      irAInicioSesion(pantalla);
      return;
    }
    contenido.innerHTML = `<section class="mi-perfil-tarjeta" role="alert">No se pudo verificar la sesión. Intenta de nuevo.</section>`;
    return;
  }
  if (secuenciaActual !== secuenciaPantalla) return;
  if (!sesion) {
    irAInicioSesion(pantalla);
    return;
  }

  actualizarNavegacion(sesion.rol, pantalla);
  const rolRequerido = rolesPorPantalla[pantalla];
  if (sesion.rol !== rolRequerido) {
    contenido.innerHTML = renderizarAccesoDenegado(rolRequerido, sesion.rol);
    return;
  }

  if (pantalla === 'P07') {
    const seccion = new URLSearchParams(window.location.search).get('seccion');
    contenido.innerHTML = renderizarPerfilCandidato(seccion);
    enlazarPerfilCandidato(() => {}, () => {}, seccion);
    return;
  }

  const pantallas = {
    P08: [renderizarEmpresa, enlazarEmpresa],
    P09: [renderizarVacante, enlazarVacante],
    P10: [renderizarPostulaciones, enlazarPostulaciones]
  };
  const [actualizarVista, enlazar] = pantallas[pantalla] || [renderizarEmpresa, enlazarEmpresa];
  contenido.innerHTML = actualizarVista();
  if (enlazar) enlazar();
}

export async function renderizarCuentaIntegrada(
  contenedorDestino,
  navegacionDestino,
  pantalla,
  seccion,
  sesion,
  alCambiarPantalla = () => {},
  alCambiarSeccion = () => {}
) {
  contenido = contenedorDestino;
  navegacion = navegacionDestino;
  if (navegacion) {
    actualizarNavegacion(sesion.rol, pantalla);
  }
  const rolRequerido = rolesPorPantalla[pantalla];
  if (sesion.rol !== rolRequerido) {
    contenido.innerHTML = renderizarAccesoDenegado(rolRequerido, sesion.rol);
    contenido.querySelector('.boton-volver-portal')?.addEventListener('click', () => {
      alCambiarPantalla('P01');
    });
    return;
  }
  if (pantalla === 'P07') {
    contenido.innerHTML = renderizarPerfilCandidato(seccion);
    enlazarPerfilCandidato(alCambiarPantalla, alCambiarSeccion, seccion);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  const pantallas = {
    P08: [renderizarEmpresa, enlazarEmpresa],
    P09: [renderizarVacante, enlazarVacante],
    P10: [renderizarPostulaciones, enlazarPostulaciones]
  };
  const [actualizarVista, enlazar] = pantallas[pantalla] || [renderizarEmpresa, enlazarEmpresa];
  contenido.innerHTML = actualizarVista();
  if (enlazar) enlazar(alCambiarPantalla);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

if (contenido) {
  renderizarPantalla();
  window.addEventListener('hashchange', renderizarPantalla);
  window.addEventListener('pageshow', renderizarPantalla);
}
