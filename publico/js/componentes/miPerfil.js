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
const estadosPostulacion = ['Nueva', 'En revisión', 'Entrevista', 'Finalista', 'Descartada'];
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
  // Todo el flujo de navegación se gestiona ahora de forma unificada desde el Navbar superior y pestañas internas
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
    <button type="button" class="boton boton-primario mi-perfil-enlace-boton btn-volver-portal">Volver al portal</button>
  </section>`;
}

function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
    const entidades = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entidades[caracter];
  });
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
        id="tab-btn-perfil"
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
        id="tab-btn-postulaciones"
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
        <span id="badge-total-postulaciones" class="insignia-conteo-tab" hidden>0</span>
      </button>
    </div>

    <!-- Panel 1: Perfil profesional -->
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
            <input id="perfil-foto" type="file" accept="image/jpeg,image/png,image/webp" />
            <small>JPG, PNG o WebP. Máximo 10 MB.</small>
            <p id="perfil-foto-mensaje" class="mi-perfil-ayuda" role="status"></p>
          </div>
          <form class="mi-perfil-formulario" data-formulario="perfil">
            <div class="mi-perfil-campos">
              ${campo('Nombre completo', 'perfil-nombre', 'text', { requerido: true, atributo: 'autocomplete="name" readonly' })}
              ${campo('Correo electrónico', 'perfil-correo', 'email', { requerido: true, atributo: 'autocomplete="email" readonly' })}
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

    <!-- Panel 2: Mis postulaciones -->
    <div id="panel-candidato-postulaciones" class="mi-perfil-panel-postulaciones" ${esPostulaciones ? '' : 'hidden'}>
      <section class="mi-perfil-tarjeta postulaciones-hero-tarjeta">
        <div class="postulaciones-hero-cabecera">
          <div>
            <span class="mi-perfil-etiqueta-superior">SEGUIMIENTO DE POSTULACIONES</span>
            <h2 style="margin: 0.25rem 0 0.4rem; font-size: 1.4rem;">Mis postulaciones laborales</h2>
            <p style="margin:0; color: var(--color-texto-secundario); font-size: 0.88rem;">
              Revisa el estado de tus procesos de selección y consulta los detalles de tus postulaciones en WorkConnect.
            </p>
          </div>
          <button type="button" class="boton boton-primario" id="btn-ir-buscar-empleos" style="flex-shrink:0;">
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

async function solicitarApiCandidato(ruta, opciones = {}) {
  const respuesta = await fetch(`/api/candidato${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  });
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo guardar la información.');
  return resultado;
}

function mostrarEstadoAccion(id, mensaje, error = false) {
  const elemento = contenido.querySelector(`#${id}`);
  if (!elemento) return;
  elemento.textContent = mensaje;
  elemento.classList.toggle('mi-perfil-error-inline', error);
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

async function cargarPerfilCandidato(alCambiarPantalla = () => {}, activarTab = () => {}) {
  const datos = await solicitarApiCandidato('/perfil');
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
    contenido.querySelector(`#${campoId}`).value = valor || '';
  }
  contenido.querySelector('#perfil-nombre-resumen').textContent = datos.perfil.nombre || 'Mi perfil';
  contenido.querySelector('#perfil-titulo-resumen').textContent =
    datos.perfil.titulo_profesional || 'Completa tu información profesional';
  contenido.querySelector('#perfil-resumen-correo').textContent = datos.perfil.email || '—';
  contenido.querySelector('#perfil-resumen-telefono').textContent = datos.perfil.telefono || '—';
  contenido.querySelector('#perfil-resumen-ubicacion').textContent = datos.perfil.ubicacion || '—';
  contenido.querySelector('#perfil-resumen-texto').textContent = datos.perfil.resumen_laboral || '—';
  const foto = contenido.querySelector('#perfil-foto-vista');
  const avatar = contenido.querySelector('#perfil-foto-avatar');
  if (datos.perfil.foto_url) {
    foto.src = datos.perfil.foto_url;
    foto.classList.remove('oculto');
    avatar.classList.add('oculto');
  }
  const curriculumGuardado = Boolean(datos.perfil.curriculum_nombre);
  contenido.querySelector('#perfil-cv-mensaje').textContent = curriculumGuardado
    ? `Currículum guardado: ${datos.perfil.curriculum_nombre}.`
    : 'Ningún currículum cargado.';
  contenido.querySelector('#perfil-cv-resumen').textContent = curriculumGuardado
    ? datos.perfil.curriculum_nombre
    : 'Sin currículum cargado';
  const enlaceCurriculum = contenido.querySelector('#perfil-cv-descargar');
  enlaceCurriculum.classList.toggle('boton', curriculumGuardado);
  enlaceCurriculum.hidden = !curriculumGuardado;

  for (const [tipo, propiedad] of [
    ['experiencia', 'experiencias'],
    ['estudios', 'estudios'],
    ['habilidades', 'habilidades'],
    ['alertas', 'alertas']
  ]) {
    renderizarListaCandidato(tipo, datos[propiedad] || []);
  }
  // Postulaciones handling
  const postulaciones = Array.isArray(datos.postulaciones) ? datos.postulaciones : [];
  const totalPostulaciones = postulaciones.length;
  const nuevas = postulaciones.filter((p) => p.estado === 'Nueva').length;
  const revision = postulaciones.filter((p) => p.estado === 'En revisión').length;
  const entrevista = postulaciones.filter((p) => p.estado === 'Entrevista').length;
  const contratada = postulaciones.filter((p) => p.estado === 'Contratada').length;

  const setKpi = (id, val) => {
    const el = contenido.querySelector(`#${id}`);
    if (el) el.textContent = String(val);
  };
  setKpi('kpi-postulaciones-total', totalPostulaciones);
  setKpi('kpi-postulaciones-nuevas', nuevas);
  setKpi('kpi-postulaciones-revision', revision);
  setKpi('kpi-postulaciones-entrevista', entrevista);
  setKpi('kpi-postulaciones-contratada', contratada);

  const badgeTab = contenido.querySelector('#badge-total-postulaciones');
  if (badgeTab) {
    badgeTab.textContent = String(totalPostulaciones);
    badgeTab.hidden = totalPostulaciones === 0;
  }
  const conteoTexto = contenido.querySelector('#postulaciones-conteo-texto');
  if (conteoTexto) {
    conteoTexto.textContent = totalPostulaciones === 1 ? '1 postulación registrada' : `${totalPostulaciones} postulaciones registradas`;
  }

  const statsEl = contenido.querySelector('#perfil-estadisticas');
  if (statsEl) {
    statsEl.innerHTML = [
      ['experiencias', (datos.experiencias || []).length, null],
      ['estudios', (datos.estudios || []).length, null],
      ['habilidades', (datos.habilidades || []).length, null],
      ['alertas guardadas', (datos.alertas || []).length, null],
      ['postulaciones', totalPostulaciones, 'postulaciones']
    ]
      .map(
        ([etiqueta, cant, tabAccion]) =>
          `<div class="mi-perfil-estadistica ${tabAccion ? 'estadistica-interactiva' : ''}" ${tabAccion ? `data-ir-tab="${tabAccion}" title="Ver mis postulaciones"` : ''}><strong>${cant}</strong><span>${etiqueta}</span></div>`
      )
      .join('');

    statsEl.querySelectorAll('[data-ir-tab]').forEach((caja) => {
      caja.addEventListener('click', () => {
        activarTab(caja.dataset.irTab);
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
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.75" style="margin-bottom:0.75rem;">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
        <p style="margin:0 0 0.35rem; font-weight:700; color:var(--color-carbon); font-size:1rem;">Aún no te has postulado a ninguna vacante</p>
        <p style="margin:0 0 1rem; color:var(--color-texto-atenuado); font-size:0.83rem; max-width:28rem;">Explora las vacantes disponibles en WorkConnect y postúlate a las ofertas que coincidan con tu experiencia.</p>
        <button type="button" class="boton boton-primario btn-explorar-vacantes">Explorar vacantes de empleo</button>
      `;
      vacio.querySelector('.btn-explorar-vacantes')?.addEventListener('click', () => {
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

  const total = [...formulario.querySelectorAll('input:not([readonly]), textarea')];
  const llenos = total.filter((entrada) => entrada.value.trim()).length;
  const valor = total.length ? Math.round((llenos / total.length) * 100) : 0;
  contenido.querySelector('#perfil-progreso').value = valor;
  contenido.querySelector('#perfil-porcentaje').textContent = `${valor}%`;
}

function enlazarPerfilCandidato(alCambiarPantalla = () => {}, alCambiarSeccion = () => {}) {
  const formPerfil = contenido.querySelector('[data-formulario="perfil"]');
  const edicionDatos = contenido.querySelector('#perfil-edicion-datos');
  const tabPerfil = contenido.querySelector('#tab-btn-perfil');
  const tabPostulaciones = contenido.querySelector('#tab-btn-postulaciones');
  const panelPerfil = contenido.querySelector('#panel-candidato-perfil');
  const panelPostulaciones = contenido.querySelector('#panel-candidato-postulaciones');

  const activarTab = (tab) => {
    if (tab === 'postulaciones') {
      tabPerfil?.classList.remove('activa');
      tabPerfil?.setAttribute('aria-selected', 'false');
      tabPostulaciones?.classList.add('activa');
      tabPostulaciones?.setAttribute('aria-selected', 'true');
      if (panelPerfil) panelPerfil.hidden = true;
      if (panelPostulaciones) panelPostulaciones.hidden = false;
      alCambiarSeccion('postulaciones');
    } else {
      tabPerfil?.classList.add('activa');
      tabPerfil?.setAttribute('aria-selected', 'true');
      tabPostulaciones?.classList.remove('activa');
      tabPostulaciones?.setAttribute('aria-selected', 'false');
      if (panelPerfil) panelPerfil.hidden = false;
      if (panelPostulaciones) panelPostulaciones.hidden = true;
      alCambiarSeccion('perfil');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  tabPerfil?.addEventListener('click', () => activarTab('perfil'));
  tabPostulaciones?.addEventListener('click', () => activarTab('postulaciones'));
  contenido.querySelector('#btn-ir-buscar-empleos')?.addEventListener('click', () => alCambiarPantalla('P01'));

  contenido.querySelector('#perfil-editar-datos')?.addEventListener('click', () => {
    edicionDatos.hidden = !edicionDatos.hidden;
  });
  contenido.querySelectorAll('[data-editar-seccion]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const formulario = contenido.querySelector(`[data-lista="${boton.dataset.editarSeccion}"]`);
      formulario.hidden = false;
      formulario.querySelector('input, select, textarea')?.focus();
    });
  });
  contenido.querySelector('#perfil-editar-curriculum').addEventListener('click', () => {
    contenido.querySelector('[data-edicion-curriculum]').hidden = false;
    contenido.querySelector('#perfil-cv').focus();
  });
  contenido.querySelectorAll('[data-descartar-edicion]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const tipo = boton.dataset.descartarEdicion;
      if (tipo === 'perfil') {
        for (const [nombre, valor] of Object.entries(perfilOriginal)) {
          formPerfil.elements.namedItem(nombre).value = valor;
        }
        edicionDatos.hidden = true;
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
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > 10 * 1024 * 1024) {
      selectorFoto.value = '';
      estadoFoto.textContent = 'Selecciona una imagen JPG, PNG o WebP de máximo 10 MB.';
      return;
    }
    vistaFoto.src = URL.createObjectURL(archivo);
    vistaFoto.classList.remove('oculto');
    avatarFoto.classList.add('oculto');
    estadoFoto.textContent = 'Guardando foto…';
    try {
      const respuesta = await fetch('/api/candidato/foto', {
        method: 'POST',
        headers: { 'Content-Type': archivo.type },
        body: archivo
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo guardar la foto.');
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
  const enlaceCurriculum = contenido.querySelector('#perfil-cv-descargar');
  const botonCurriculum = contenido.querySelector('#perfil-cv-guardar');
  selectorCurriculum.addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) {
      return;
    } else if (archivo.type !== 'application/pdf' || archivo.size > 5 * 1024 * 1024) {
      evento.target.value = '';
      estadoCurriculum.textContent = 'Selecciona un archivo PDF de máximo 5 MB.';
      estadoCurriculum.classList.add('mi-perfil-error-inline');
    } else {
      estadoCurriculum.textContent = `${archivo.name} seleccionado. Presiona “Guardar currículum” para almacenarlo.`;
      estadoCurriculum.classList.remove('mi-perfil-error-inline');
    }
  });
  botonCurriculum.addEventListener('click', async () => {
    const archivo = selectorCurriculum.files[0];
    if (!archivo) {
      estadoCurriculum.textContent = 'Selecciona primero un archivo PDF.';
      estadoCurriculum.classList.add('mi-perfil-error-inline');
      return;
    }
    if (archivo.type !== 'application/pdf' || archivo.size > 5 * 1024 * 1024) {
      estadoCurriculum.textContent = 'Selecciona un archivo PDF de máximo 5 MB.';
      estadoCurriculum.classList.add('mi-perfil-error-inline');
      return;
    }

    botonCurriculum.disabled = true;
    estadoCurriculum.textContent = 'Guardando currículum…';
    estadoCurriculum.classList.remove('mi-perfil-error-inline');
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
      estadoCurriculum.textContent = `Currículum guardado: ${resultado.curriculum_nombre}.`;
      enlaceCurriculum.classList.add('boton');
      enlaceCurriculum.hidden = false;
      contenido.querySelector('[data-edicion-curriculum]').hidden = true;
    } catch (error) {
      estadoCurriculum.textContent = error.message || 'No se pudo guardar el currículum.';
      estadoCurriculum.classList.add('mi-perfil-error-inline');
    } finally {
      botonCurriculum.disabled = false;
    }
  });

  contenido.querySelector('#experiencia-actual').addEventListener('change', (evento) => {
    const fechaFin = contenido.querySelector('#experiencia-fecha-fin');
    if (evento.target.checked) fechaFin.value = '';
    fechaFin.disabled = evento.target.checked;
  });
  cargarPerfilCandidato(alCambiarPantalla, activarTab).catch((error) => {
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
          <button id="btn-guardar-empresa" class="boton boton-primario" type="submit">Guardar perfil de empresa</button>
        </div>
      </form>
    </section>
    <section class="mi-perfil-tarjeta">
      <h3>Vista previa corporativa</h3>
      <div class="mi-perfil-vista-previa">
        <div id="empresa-previa-avatar" style="width: 56px; height: 56px; font-size: 1.25rem; margin-bottom: 0.5rem; display: inline-flex; align-items: center; justify-content: center; background: #873044; color: white; border-radius: 50%; font-weight: bold;">WC</div>
        <strong id="empresa-previa-nombre">Nombre comercial</strong>
        <p id="empresa-previa-sector" class="mi-perfil-ayuda">Sector · Ubicación</p>
        <p id="empresa-previa-descripcion" class="mi-perfil-ayuda">La descripción de la empresa aparecerá aquí.</p>
      </div>
      <div class="mi-perfil-estadisticas">
        <div class="mi-perfil-estadistica"><strong id="stat-vacantes-conteo">0</strong><span>Vacantes publicadas</span></div>
        <div class="mi-perfil-estadistica"><strong id="stat-postulaciones-conteo">0</strong><span>Postulaciones recibidas</span></div>
      </div>
      <p id="empresa-previa-verificacion" class="mi-perfil-ayuda" style="margin-top: 1rem;">
        <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #166534; font-weight: 600;">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
          Empresa activa y verificada en WorkConnect
        </span>
      </p>
      <div class="mi-perfil-acciones">
        <button type="button" class="boton mi-perfil-enlace-boton btn-ir-publicar-vacante">Publicar vacante</button>
        <button type="button" class="boton mi-perfil-enlace-boton btn-ir-postulaciones">Revisar postulaciones</button>
      </div>
    </section>
  </div>`;
}

async function enlazarEmpresa(alCambiarPantalla = () => {}) {
  const formulario = contenido.querySelector('[data-formulario="empresa"]');
  contenido.querySelector('.btn-ir-publicar-vacante')?.addEventListener('click', () => {
    alCambiarPantalla('P09');
  });
  contenido.querySelector('.btn-ir-postulaciones')?.addEventListener('click', () => {
    alCambiarPantalla('P10');
  });

  const selectDepto = contenido.querySelector('#empresa-departamento');
  const selectMuni = contenido.querySelector('#empresa-municipio');
  const mensajeEstado = contenido.querySelector('#empresa-mensaje-estado');
  const btnGuardar = contenido.querySelector('#btn-guardar-empresa');

  // Inicializar sincronización geográfica
  sincronizarMunicipios(selectDepto, selectMuni, 'San Salvador');

  // Auto-formato de NIT y teléfono
  const inputNit = contenido.querySelector('#empresa-nit');
  inputNit?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 13) v = `${v.slice(0, 4)}-${v.slice(4, 10)}-${v.slice(10, 13)}-${v.slice(13)}`;
    else if (v.length > 10) v = `${v.slice(0, 4)}-${v.slice(4, 10)}-${v.slice(10)}`;
    else if (v.length > 4) v = `${v.slice(0, 4)}-${v.slice(4)}`;
    e.target.value = v;
  });

  const inputTel = contenido.querySelector('#empresa-telefono');
  inputTel?.addEventListener('input', (e) => {
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

    const elNombre = contenido.querySelector('#empresa-previa-nombre');
    const elSector = contenido.querySelector('#empresa-previa-sector');
    const elDesc = contenido.querySelector('#empresa-previa-descripcion');
    const elAvatar = contenido.querySelector('#empresa-previa-avatar');

    if (elNombre) elNombre.textContent = nombre || 'Nombre comercial';
    if (elSector) {
      elSector.textContent = `${sector || 'Sector'} · ${direccion ? `${direccion}, ` : ''}${municipio || 'Municipio'}${departamento ? `, ${departamento}` : ''}`;
    }
    if (elDesc) {
      elDesc.textContent = descripcion || 'La descripción de la empresa aparecerá aquí.';
    }
    if (elAvatar && nombre) {
      const palabras = nombre.trim().split(/\s+/);
      const iniciales = (palabras[0]?.[0] || 'E') + (palabras[1]?.[0] || '');
      elAvatar.textContent = iniciales.toUpperCase();
    }
  };

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

  // Cargar datos actuales de la empresa
  try {
    const res = await fetch('/api/empresa/perfil', { cache: 'no-store' });
    const datos = await res.json().catch(() => ({}));
    if (res.ok && datos.empresa) {
      const emp = datos.empresa;
      const setValor = (id, val) => {
        const el = contenido.querySelector(`#${id}`);
        if (el && val !== undefined && val !== null) el.value = val;
      };

      setValor('empresa-nombre', emp.nombre_comercial || '');
      setValor('empresa-razon-social', emp.razon_social || '');
      setValor('empresa-nit', emp.nit || '');
      setValor('empresa-sector', emp.sector || '');
      setValor('empresa-departamento', emp.departamento || 'San Salvador');

      sincronizarMunicipios(selectDepto, selectMuni, emp.municipio || 'San Salvador');

      setValor('empresa-direccion', emp.direccion || '');
      setValor('empresa-tamano', emp.tamano || '51-200 empleados');
      setValor('empresa-correo', emp.contacto_email || datos.usuario?.email || '');
      setValor('empresa-telefono', emp.telefono || datos.usuario?.telefono || '');
      setValor('empresa-web', emp.sitio_web || '');
      setValor('empresa-descripcion', emp.descripcion || '');

      const statVac = contenido.querySelector('#stat-vacantes-conteo');
      const statPost = contenido.querySelector('#stat-postulaciones-conteo');
      if (statVac) statVac.textContent = datos.conteoVacantes ?? 0;
      if (statPost) statPost.textContent = datos.conteoPostulaciones ?? 0;

      actualizarPrevia();
    }
  } catch (errorCarga) {
    console.error('Error al cargar perfil de empresa:', errorCarga);
  }

  formulario?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;

    if (btnGuardar) btnGuardar.disabled = true;
    if (mensajeEstado) {
      mensajeEstado.classList.add('oculto');
      mensajeEstado.className = 'mi-perfil-ayuda oculto';
    }

    const payload = {
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
      const res = await fetch('/api/empresa/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const respuesta = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(respuesta.error || 'No se pudo guardar el perfil.');

      if (mensajeEstado) {
        mensajeEstado.textContent = '✓ Perfil de empresa guardado exitosamente en la base de datos.';
        mensajeEstado.className = 'mi-perfil-ayuda';
        mensajeEstado.style.color = '#166534';
        mensajeEstado.style.fontWeight = '600';
        mensajeEstado.classList.remove('oculto');
      }
      actualizarPrevia();
    } catch (error) {
      if (mensajeEstado) {
        mensajeEstado.textContent = error.message || 'Error al guardar el perfil.';
        mensajeEstado.className = 'mi-perfil-error-inline';
        mensajeEstado.style.color = '#dc2626';
        mensajeEstado.classList.remove('oculto');
      }
    } finally {
      if (btnGuardar) btnGuardar.disabled = false;
    }
  });
}

function renderizarVacante() {
  return `<div class="mi-perfil-contenedor">
    <section class="mi-perfil-tarjeta">
      <h2>Publicar vacante</h2>
      <p>Publica una nueva oportunidad laboral. Quedará activa inmediatamente para que los candidatos puedan postularse.</p>
      <form class="mi-perfil-formulario" data-formulario="vacante">
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
          ${campo('Salario mínimo (USD) *', 'vacante-salario-min', 'number', { requerido: true, atributo: 'min="0" step="50" placeholder="Ej. 600"' })}
          ${campo('Salario máximo (USD) *', 'vacante-salario-max', 'number', { requerido: true, atributo: 'min="0" step="50" placeholder="Ej. 1000"' })}
          ${campo('Fecha límite de postulación (opcional)', 'vacante-fecha-limite', 'date')}
        </div>
        <div class="mi-perfil-campos">
          ${campo('Descripción general del puesto *', 'vacante-descripcion', 'textarea', { requerido: true, completo: true, atributo: 'rows="3" placeholder="Resumen del puesto y de la oportunidad laboral..."' })}
          ${campo('Funciones y responsabilidades *', 'vacante-funciones', 'textarea', { requerido: true, completo: true, atributo: 'rows="3" placeholder="Escribe una función por línea o separadas por viñetas..."' })}
          ${campo('Requisitos del candidato *', 'vacante-requisitos', 'textarea', { requerido: true, completo: true, atributo: 'rows="3" placeholder="Escribe un requisito por línea..."' })}
          ${campo('Beneficios ofrecidos (opcional)', 'vacante-beneficios', 'textarea', { completo: true, atributo: 'rows="3" placeholder="Escribe los beneficios por línea (seguro médico, horarios flexibles, etc.)..."' })}
        </div>
        <p id="vacante-mensaje-estado" class="mi-perfil-ayuda oculto" role="status"></p>
        <div class="mi-perfil-acciones">
          <button id="btn-publicar-vacante" class="boton boton-primario" type="submit">Publicar vacante</button>
          <button class="boton" type="reset">Limpiar formulario</button>
        </div>
      </form>
    </section>
  </div>`;
}

function enlazarVacante(alCambiarPantalla = () => {}) {
  const formulario = contenido.querySelector('[data-formulario="vacante"]');
  if (!formulario) return;

  const selectDepto = formulario.querySelector('#vacante-departamento');
  const selectMuni = formulario.querySelector('#vacante-municipio');
  const minimo = formulario.querySelector('#vacante-salario-min');
  const maximo = formulario.querySelector('#vacante-salario-max');
  const mensajeEstado = formulario.querySelector('#vacante-mensaje-estado');
  const btnPublicar = formulario.querySelector('#btn-publicar-vacante');

  sincronizarMunicipios(selectDepto, selectMuni, 'San Salvador');

  const validarSalario = () => {
    const min = minimo.value === '' ? null : Number(minimo.value);
    const max = maximo.value === '' ? null : Number(maximo.value);
    maximo.setCustomValidity(min !== null && max !== null && max < min
      ? 'El salario máximo no puede ser menor que el salario mínimo.'
      : '');
  };
  minimo.addEventListener('input', validarSalario);
  maximo.addEventListener('input', validarSalario);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    validarSalario();
    if (!formulario.reportValidity()) return;

    if (btnPublicar) btnPublicar.disabled = true;
    if (mensajeEstado) mensajeEstado.classList.add('oculto');

    const datos = {
      titulo: formulario.querySelector('#vacante-titulo').value.trim(),
      sector: formulario.querySelector('#vacante-sector').value.trim(),
      departamento: formulario.querySelector('#vacante-departamento').value.trim(),
      municipio: formulario.querySelector('#vacante-municipio').value.trim(),
      modalidad: formulario.querySelector('#vacante-modalidad').value.trim(),
      tipo_contrato: formulario.querySelector('#vacante-contrato').value.trim(),
      plazas: Number(formulario.querySelector('#vacante-plazas').value) || 1,
      salario_min: Number(formulario.querySelector('#vacante-salario-min').value),
      salario_max: Number(formulario.querySelector('#vacante-salario-max').value),
      fecha_limite: formulario.querySelector('#vacante-fecha-limite').value || null,
      descripcion: formulario.querySelector('#vacante-descripcion').value.trim(),
      funciones: formulario.querySelector('#vacante-funciones').value.trim(),
      requisitos: formulario.querySelector('#vacante-requisitos').value.trim(),
      beneficios: formulario.querySelector('#vacante-beneficios').value.trim()
    };

    try {
      const res = await fetch('/api/empresa/vacantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      const resultado = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resultado.error || 'No se pudo publicar la vacante.');

      if (mensajeEstado) {
        mensajeEstado.textContent = `✓ Vacante "${datos.titulo}" publicada exitosamente y visible para candidatos.`;
        mensajeEstado.className = 'mi-perfil-ayuda';
        mensajeEstado.style.color = '#166534';
        mensajeEstado.style.fontWeight = '600';
        mensajeEstado.classList.remove('oculto');
      }
      formulario.reset();
      maximo.setCustomValidity('');
      sincronizarMunicipios(selectDepto, selectMuni, 'San Salvador');
    } catch (error) {
      if (mensajeEstado) {
        mensajeEstado.textContent = error.message || 'Error al publicar la vacante.';
        mensajeEstado.className = 'mi-perfil-error-inline';
        mensajeEstado.style.color = '#dc2626';
        mensajeEstado.classList.remove('oculto');
      }
    } finally {
      if (btnPublicar) btnPublicar.disabled = false;
    }
  });

  formulario.addEventListener('reset', () => {
    maximo.setCustomValidity('');
    if (mensajeEstado) mensajeEstado.classList.add('oculto');
  });
}

function renderizarPostulaciones() {
  return `<div class="mi-perfil-contenedor">
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
          <tbody id="tbody-postulaciones-empresa">
            <tr><td colspan="5" class="mi-perfil-vacio">Cargando postulaciones recibidas...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>`;
}

async function enlazarPostulaciones() {
  const tbody = contenido.querySelector('#tbody-postulaciones-empresa');
  const inputBusqueda = contenido.querySelector('#postulacion-busqueda');
  const selectFiltroEstado = contenido.querySelector('#postulacion-filtro-estado');

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
    if (!tbody) return;
    const busqueda = (inputBusqueda?.value || '').trim().toLowerCase();
    const filtroEstado = selectFiltroEstado?.value || '';

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
      tbody.innerHTML = `<tr><td colspan="5" class="mi-perfil-vacio">No se encontraron postulaciones con los filtros seleccionados.</td></tr>`;
      return;
    }

    const formatoFecha = new Intl.DateTimeFormat('es-SV', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    tbody.innerHTML = filtradas
      .map((p) => {
        const fecha = p.creado_en ? formatoFecha.format(new Date(p.creado_en)) : '—';
        const iniciales = (p.candidato?.nombre || 'C')
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
          .toUpperCase();

        return `
          <tr data-postulacion-fila="${p.id}">
            <td>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #873044; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: bold; flex-shrink: 0;">
                  ${iniciales}
                </div>
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
              <select class="select-estado-postulacion" data-postulacion-id="${p.id}" style="padding: 0.35rem 0.6rem; border-radius: 0.375rem; border: 1px solid #d8d2cd; font-size: 0.82rem; font-weight: 500;">
                ${estadosPostulacion
                  .map((e) => `<option value="${e}" ${e === p.estado ? 'selected' : ''}>${escaparHtml(e)}</option>`)
                  .join('')}
              </select>
            </td>
            <td>
              ${p.curriculum_url ? `<span class="mi-perfil-ayuda" style="color: #166534; font-weight: 600;">✓ CV en perfil</span>` : '<span class="mi-perfil-ayuda">Sin CV</span>'}
            </td>
          </tr>
        `;
      })
      .join('');

    // Conectar cambios de estado
    tbody.querySelectorAll('.select-estado-postulacion').forEach((select) => {
      select.addEventListener('change', async () => {
        const id = select.dataset.postulacionId;
        const nuevoEstado = select.value;
        select.disabled = true;

        try {
          const res = await fetch(`/api/empresa/postulaciones/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
          });
          const resJson = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(resJson.error || 'No se pudo actualizar.');

          const post = postulacionesCargadas.find((x) => x.id === id);
          if (post) post.estado = nuevoEstado;
          actualizarConteoEstados();
        } catch (errorUpdate) {
          alert(errorUpdate.message || 'Error al cambiar estado.');
        } finally {
          select.disabled = false;
        }
      });
    });
  };

  inputBusqueda?.addEventListener('input', renderizarFilas);
  selectFiltroEstado?.addEventListener('change', renderizarFilas);

  try {
    const res = await fetch('/api/empresa/postulaciones', { cache: 'no-store' });
    const datos = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(datos.postulaciones)) {
      postulacionesCargadas = datos.postulaciones;
      actualizarConteoEstados();
      renderizarFilas();
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="mi-perfil-vacio">No se pudieron cargar las postulaciones.</td></tr>`;
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="mi-perfil-vacio">Error al consultar postulaciones recibidas.</td></tr>`;
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
  const [render, enlazar] = pantallas[pantalla] || [renderizarEmpresa, enlazarEmpresa];
  contenido.innerHTML = render();
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
    contenido.querySelector('.btn-volver-portal')?.addEventListener('click', () => {
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
  const [render, enlazar] = pantallas[pantalla] || [renderizarEmpresa, enlazarEmpresa];
  contenido.innerHTML = render();
  if (enlazar) enlazar(alCambiarPantalla);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

if (contenido) {
  renderizarPantalla();
  window.addEventListener('hashchange', renderizarPantalla);
  window.addEventListener('pageshow', renderizarPantalla);
}
