localStorage.removeItem('workconnect-cuentas');

const contenido = document.querySelector('#persona2-contenido');
const navegacion = document.querySelector('.persona2-navegacion');
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
  const opciones =
    rol === 'candidato'
      ? [
          { href: '#P07', pantalla: 'P07', etiqueta: 'Perfil candidato' },
          {
            href: '/persona2.html?seccion=postulaciones#P07',
            pantalla: 'P07',
            seccion: 'postulaciones',
            etiqueta: 'Mis postulaciones'
          }
        ]
      : rol === 'empresa'
        ? [
            { href: '#P08', pantalla: 'P08', etiqueta: 'Empresa' },
            { href: '#P09', pantalla: 'P09', etiqueta: 'Publicar vacante' },
            { href: '#P10', pantalla: 'P10', etiqueta: 'Postulaciones recibidas' }
          ]
        : [];
  const seccionActual = new URLSearchParams(window.location.search).get('seccion');

  navegacion.innerHTML = opciones
    .map(
      (opcion) => `<a
        href="${opcion.href}"
        data-pantalla="${opcion.pantalla}"
        ${opcion.seccion ? `data-seccion="${opcion.seccion}"` : ''}
        ${opcion.pantalla === pantalla && (opcion.seccion || '') === (seccionActual || '') ? 'class="activo" aria-current="page"' : ''}
      >${opcion.etiqueta}</a>`
    )
    .join('');
  navegacion.hidden = opciones.length === 0;
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
  return `<section class="persona2-tarjeta" role="alert">
    <h2>Sección no disponible para esta cuenta</h2>
    <p>Esta sección es para cuentas de ${rolRequerido}. Tu sesión actual corresponde a ${mensajeRol}.</p>
    <a class="boton boton-primario persona2-enlace-boton" href="/">Volver al portal</a>
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

  return `<div class="persona2-campo${etiquetaClase}">
    <label for="${id}">${etiqueta}${opciones.requerido ? ' *' : ''}</label>
    ${control}
  </div>`;
}

function avisoNoPersistido(mensaje) {
  return `<span class="persona2-aviso-accion" role="note">${mensaje}</span>`;
}

function estadoAccion(id) {
  return `<span id="${id}" class="persona2-aviso-accion" role="status" aria-live="polite"></span>`;
}

function renderizarPerfilCandidato() {
  return `<div class="persona2-contenedor">
    <section class="persona2-tarjeta">
      <h2>Mi perfil candidato</h2>
      <p>Tu nombre y correo provienen de la cuenta autenticada. Actualiza aquí tus datos personales y profesionales.</p>
      <div class="persona2-avance"><strong>Avance del formulario</strong><span id="perfil-porcentaje">0%</span></div>
      <progress id="perfil-progreso" class="persona2-progreso" max="100" value="0">0%</progress>
      <form class="persona2-formulario" data-formulario="perfil">
        <div class="persona2-campos">
          ${campo('Nombre completo', 'perfil-nombre', 'text', { requerido: true, atributo: 'autocomplete="name" readonly' })}
          ${campo('Correo electrónico', 'perfil-correo', 'email', { requerido: true, atributo: 'autocomplete="email" readonly' })}
          ${campo('Teléfono', 'perfil-telefono', 'tel', { nombre: 'telefono', atributo: 'autocomplete="tel"' })}
          ${campo('Ubicación (municipio y departamento)', 'perfil-ubicacion', 'text', { nombre: 'ubicacion' })}
          ${campo('Profesión o título profesional', 'perfil-titulo', 'text', { nombre: 'titulo_profesional' })}
          ${campo('Resumen profesional', 'perfil-resumen', 'textarea', { nombre: 'resumen_laboral', completo: true })}
        </div>
        <div class="persona2-acciones">
          <button class="boton boton-primario" type="submit">Guardar perfil</button>
          ${estadoAccion('perfil-estado')}
        </div>
      </form>
    </section>
    <section class="persona2-tarjeta">
      <h3>Experiencia laboral</h3>
      <form class="persona2-formulario" data-lista="experiencia">
        <div class="persona2-campos">
          ${campo('Puesto', 'experiencia-puesto', 'text', { nombre: 'puesto', requerido: true })}
          ${campo('Empresa', 'experiencia-empresa', 'text', { nombre: 'empresa', requerido: true })}
          ${campo('Fecha de inicio', 'experiencia-fecha-inicio', 'date', { nombre: 'fecha_inicio', requerido: true })}
          ${campo('Fecha de fin (opcional)', 'experiencia-fecha-fin', 'date', { nombre: 'fecha_fin' })}
          ${campo('Descripción (opcional)', 'experiencia-descripcion', 'textarea', { nombre: 'descripcion', completo: true })}
        </div>
        <label class="persona2-opcion"><input id="experiencia-actual" name="es_trabajo_actual" type="checkbox" value="true" /> Trabajo actual</label>
        <div class="persona2-acciones">
          <button class="boton" type="submit">Agregar experiencia</button>
          ${estadoAccion('experiencia-estado')}
        </div>
      </form>
      <ul class="persona2-lista" data-lista-items="experiencia"><li class="persona2-vacio">Aún no agregas experiencia.</li></ul>
    </section>
    <section class="persona2-tarjeta">
      <h3>Estudios</h3>
      <form class="persona2-formulario" data-lista="estudios">
        <div class="persona2-campos">
          ${campo('Carrera o programa', 'estudio-programa', 'text', { nombre: 'carrera_programa', requerido: true })}
          ${campo('Institución', 'estudio-institucion', 'text', { nombre: 'institucion', requerido: true })}
          ${campo('Nivel académico', 'estudio-nivel', 'text', { nombre: 'nivel_academico', requerido: true })}
          ${campo('Año de inicio', 'estudio-anio-inicio', 'number', { nombre: 'anio_inicio', requerido: true, atributo: 'min="1900" step="1"' })}
          ${campo('Año de finalización (opcional)', 'estudio-anio-fin', 'number', { nombre: 'anio_fin', atributo: 'min="1900" step="1"' })}
        </div>
        <div class="persona2-acciones">
          <button class="boton" type="submit">Agregar estudio</button>
          ${estadoAccion('estudios-estado')}
        </div>
      </form>
      <ul class="persona2-lista" data-lista-items="estudios"><li class="persona2-vacio">Aún no agregas estudios.</li></ul>
    </section>
    <section class="persona2-tarjeta">
      <h3>Habilidades</h3>
      <form class="persona2-formulario" data-lista="habilidades">
        ${campo('Habilidad', 'habilidad-nombre', 'text', { nombre: 'habilidad', requerido: true })}
        <div class="persona2-campo">
          <label for="habilidad-nivel">Nivel de dominio</label>
          <select id="habilidad-nivel" name="nivel_dominio">
            <option>Básico</option><option selected>Intermedio</option><option>Avanzado</option>
          </select>
        </div>
        <div class="persona2-acciones">
          <button class="boton" type="submit">Registrar habilidad</button>
          ${estadoAccion('habilidades-estado')}
        </div>
      </form>
      <ul class="persona2-lista" data-lista-items="habilidades"><li class="persona2-vacio">Aún no agregas habilidades.</li></ul>
    </section>
    <section class="persona2-tarjeta">
      <h3>Currículum</h3>
      <p>Guarda tu currículum como un archivo PDF privado de máximo 5 MB.</p>
      <div class="persona2-campo"><label for="perfil-cv">Seleccionar archivo PDF (máximo 5 MB)</label><input id="perfil-cv" type="file" accept="application/pdf,.pdf" /></div>
      <p id="perfil-cv-mensaje" class="persona2-ayuda" aria-live="polite">Ningún currículum cargado.</p>
      <div class="persona2-acciones">
        <button id="perfil-cv-guardar" class="boton" type="button">Guardar currículum</button>
        <a id="perfil-cv-descargar" href="/api/candidato/curriculum" hidden>Descargar currículum</a>
      </div>
    </section>
    <section id="postulaciones-candidato" class="persona2-tarjeta" tabindex="-1" aria-labelledby="titulo-postulaciones-candidato">
      <h3 id="titulo-postulaciones-candidato">Mis postulaciones</h3>
      <ul class="persona2-lista" id="postulaciones-candidato-lista"><li class="persona2-vacio">Cargando postulaciones...</li></ul>
    </section>
    <section class="persona2-tarjeta">
      <h3>Alertas laborales</h3>
      <p>Guarda preferencias de búsqueda. Las alertas no envían correos.</p>
      <form class="persona2-formulario" data-formulario="alertas" data-lista="alertas">
        <div class="persona2-campos">
          ${campo('Nombre de la alerta', 'alerta-nombre', 'text', { nombre: 'nombre_alerta', requerido: true })}
          ${campo('Sector', 'alerta-sector', 'text', { nombre: 'sector', requerido: true })}
          <div class="persona2-campo">
            <label for="alerta-modalidad">Modalidad (opcional)</label>
            <select id="alerta-modalidad" name="modalidad">
              <option value="">Cualquier modalidad</option>
              <option value="Presencial">Presencial</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Remoto">Remoto</option>
            </select>
          </div>
          ${campo('Salario mínimo (USD, opcional)', 'alerta-salario-minimo', 'number', { nombre: 'salario_minimo', atributo: 'min="0" step="0.01"' })}
          <div class="persona2-campo">
            <label for="alerta-frecuencia">Frecuencia</label>
            <select id="alerta-frecuencia" name="frecuencia">
              <option>Diaria</option><option selected>Semanal</option><option>Mensual</option>
            </select>
          </div>
        </div>
        <label class="persona2-opcion"><input id="alerta-activa" name="activa" type="checkbox" value="true" checked /> Alerta activa</label>
        <div class="persona2-acciones">
          <button class="boton" type="submit">Configurar alerta</button>
          ${estadoAccion('alertas-estado')}
        </div>
      </form>
      <ul class="persona2-lista" data-lista-items="alertas"><li class="persona2-vacio">Cargando alertas...</li></ul>
    </section>
    <section class="persona2-tarjeta">
      <h3>Estadísticas del perfil</h3>
      <div id="perfil-estadisticas" class="persona2-estadisticas"></div>
    </section>
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
  elemento.classList.toggle('persona2-error-inline', error);
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
    vacio.className = 'persona2-vacio';
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

async function cargarPerfilCandidato() {
  const datos = await solicitarApiCandidato('/perfil');
  const formulario = contenido.querySelector('[data-formulario="perfil"]');
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
  const curriculumGuardado = Boolean(datos.perfil.curriculum_nombre);
  contenido.querySelector('#perfil-cv-mensaje').textContent = curriculumGuardado
    ? `Currículum guardado: ${datos.perfil.curriculum_nombre}.`
    : 'Ningún currículum cargado.';
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
  contenido.querySelector('#perfil-estadisticas').innerHTML = [
    ['experiencias', datos.experiencias.length],
    ['estudios', datos.estudios.length],
    ['habilidades', datos.habilidades.length],
    ['alertas guardadas', datos.alertas.length],
    ['postulaciones', datos.postulaciones.length]
  ]
    .map(
      ([etiqueta, total]) =>
        `<div class="persona2-estadistica"><strong>${total}</strong><span>${etiqueta}</span></div>`
    )
    .join('');
  const postulaciones = contenido.querySelector('#postulaciones-candidato-lista');
  postulaciones.replaceChildren();
  if (!datos.postulaciones.length) {
    const vacio = document.createElement('li');
    vacio.className = 'persona2-vacio';
    vacio.textContent = 'Aún no tienes postulaciones.';
    postulaciones.append(vacio);
  } else {
    for (const postulacion of datos.postulaciones) {
      const elemento = document.createElement('li');
      const texto = document.createElement('span');
      texto.textContent = `${postulacion.vacante.titulo} · ${postulacion.estado}`;
      elemento.append(texto);
      if (postulacion.vacante.id) {
        const enlace = document.createElement('a');
        enlace.className = 'persona2-ver-detalle';
        enlace.textContent = 'Ver detalle';
        enlace.href = '/?vacante=' + encodeURIComponent(postulacion.vacante.id);
        elemento.append(enlace);
      }
      postulaciones.append(elemento);
    }
  }
  const total = [...formulario.querySelectorAll('input:not([readonly]), textarea')];
  const llenos = total.filter((entrada) => entrada.value.trim()).length;
  const valor = total.length ? Math.round((llenos / total.length) * 100) : 0;
  contenido.querySelector('#perfil-progreso').value = valor;
  contenido.querySelector('#perfil-porcentaje').textContent = `${valor}%`;
}

function enlazarPerfilCandidato() {
  const formPerfil = contenido.querySelector('[data-formulario="perfil"]');
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
      estadoCurriculum.classList.add('persona2-error-inline');
    } else {
      estadoCurriculum.textContent = `${archivo.name} seleccionado. Presiona “Guardar currículum” para almacenarlo.`;
      estadoCurriculum.classList.remove('persona2-error-inline');
    }
  });
  botonCurriculum.addEventListener('click', async () => {
    const archivo = selectorCurriculum.files[0];
    if (!archivo) {
      estadoCurriculum.textContent = 'Selecciona primero un archivo PDF.';
      estadoCurriculum.classList.add('persona2-error-inline');
      return;
    }
    if (archivo.type !== 'application/pdf' || archivo.size > 5 * 1024 * 1024) {
      estadoCurriculum.textContent = 'Selecciona un archivo PDF de máximo 5 MB.';
      estadoCurriculum.classList.add('persona2-error-inline');
      return;
    }

    botonCurriculum.disabled = true;
    estadoCurriculum.textContent = 'Guardando currículum…';
    estadoCurriculum.classList.remove('persona2-error-inline');
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
    } catch (error) {
      estadoCurriculum.textContent = error.message || 'No se pudo guardar el currículum.';
      estadoCurriculum.classList.add('persona2-error-inline');
    } finally {
      botonCurriculum.disabled = false;
    }
  });

  contenido.querySelector('#experiencia-actual').addEventListener('change', (evento) => {
    const fechaFin = contenido.querySelector('#experiencia-fecha-fin');
    if (evento.target.checked) fechaFin.value = '';
    fechaFin.disabled = evento.target.checked;
  });
  cargarPerfilCandidato().catch((error) => {
    contenido.querySelectorAll('.persona2-vacio').forEach((elemento) => {
      elemento.textContent = 'No se pudo cargar la información. Intenta de nuevo.';
    });
    mostrarEstadoAccion('perfil-estado', error.message, true);
  });
}

function renderizarEmpresa() {
  return `<div class="persona2-contenedor">
    <section class="persona2-tarjeta">
      <h2>Perfil de empresa</h2>
      <p>Completa un borrador de perfil y revisa cómo se vería. Los datos no se guardan ni consultan en Supabase.</p>
      <form class="persona2-formulario" data-formulario="empresa">
        <div class="persona2-campos">
          ${campo('Nombre comercial', 'empresa-nombre', 'text', { requerido: true })}
          ${campo('Razón social', 'empresa-razon-social', 'text', { requerido: true })}
          ${campo('NIT', 'empresa-nit', 'text', { requerido: true })}
          ${campo('Sector', 'empresa-sector', 'text', { requerido: true })}
          ${campo('Departamento', 'empresa-departamento', 'text', { requerido: true })}
          ${campo('Municipio', 'empresa-municipio', 'text', { requerido: true })}
          ${campo('Dirección (opcional)', 'empresa-direccion')}
          ${campo('Correo de contacto', 'empresa-correo', 'email', { requerido: true })}
          ${campo('Teléfono', 'empresa-telefono', 'tel', { requerido: true })}
          ${campo('Sitio web', 'empresa-web', 'url')}
          ${campo('Descripción', 'empresa-descripcion', 'textarea', { completo: true })}
        </div>
        <div class="persona2-campo">
          <label for="empresa-tamano">Tamaño de empresa</label>
          <select id="empresa-tamano" name="tamano">
            <option value="51-200 empleados" selected>51-200 empleados (predeterminado)</option>
            <option value="1-10 empleados">1-10 empleados</option>
            <option value="11-50 empleados">11-50 empleados</option>
            <option value="Más de 200 empleados">Más de 200 empleados</option>
          </select>
        </div>
        <div class="persona2-campo">
          <label for="empresa-logo">Logotipo</label>
          <input id="empresa-logo" type="file" accept="image/png,image/jpeg,image/webp" />
          ${avisoNoPersistido('La vista previa del logotipo es local; no se carga.')}
          <span id="empresa-logo-mensaje" class="persona2-error-inline" role="status"></span>
        </div>
        <div class="persona2-acciones">
          <button class="boton boton-primario" type="submit">Guardar perfil de empresa</button>
          ${avisoNoPersistido('El perfil de empresa todavía no se guarda en la base de datos.')}
        </div>
      </form>
    </section>
    <section class="persona2-tarjeta">
      <h3>Vista previa</h3>
      <div class="persona2-vista-previa">
        <img id="empresa-logo-previa" class="oculto" alt="Vista previa del logotipo" />
        <strong id="empresa-previa-nombre">Nombre comercial</strong>
        <p id="empresa-previa-sector" class="persona2-ayuda">Sector · Ubicación</p>
        <p id="empresa-previa-descripcion" class="persona2-ayuda">La descripción de la empresa aparecerá aquí.</p>
      </div>
      <div class="persona2-estadisticas">
        <div class="persona2-estadistica"><strong>—</strong><span>Vacantes · datos no disponibles</span></div>
        <div class="persona2-estadistica"><strong>—</strong><span>Postulaciones · datos no disponibles</span></div>
      </div>
      <p class="persona2-ayuda">Verificación: no consultada. El estado actual de esta empresa no está disponible.</p>
      <div class="persona2-acciones">
        <a class="boton persona2-enlace-boton" href="#P09">Publicar vacante</a>
        <a class="boton persona2-enlace-boton" href="#P10">Revisar postulaciones</a>
      </div>
    </section>
  </div>`;
}

function enlazarEmpresa() {
  const formulario = contenido.querySelector('[data-formulario="empresa"]');
  const controles = [
    'empresa-nombre',
    'empresa-sector',
    'empresa-departamento',
    'empresa-municipio',
    'empresa-direccion',
    'empresa-descripcion'
  ];
  const actualizarPrevia = () => {
    const nombre = contenido.querySelector('#empresa-nombre').value.trim();
    const sector = contenido.querySelector('#empresa-sector').value.trim();
    const departamento = contenido.querySelector('#empresa-departamento').value.trim();
    const municipio = contenido.querySelector('#empresa-municipio').value.trim();
    const direccion = contenido.querySelector('#empresa-direccion').value.trim();
    const descripcion = contenido.querySelector('#empresa-descripcion').value.trim();
    contenido.querySelector('#empresa-previa-nombre').textContent = nombre || 'Nombre comercial';
    contenido.querySelector('#empresa-previa-sector').textContent =
      `${sector || 'Sector'} · ${direccion ? `${direccion}, ` : ''}${municipio || 'Municipio'}${departamento ? `, ${departamento}` : ''}`;
    contenido.querySelector('#empresa-previa-descripcion').textContent =
      descripcion || 'La descripción de la empresa aparecerá aquí.';
  };
  controles.forEach((id) => contenido.querySelector(`#${id}`).addEventListener('input', actualizarPrevia));
  formulario.addEventListener('submit', (evento) => evento.preventDefault());

  contenido.querySelector('#empresa-logo').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    const imagen = contenido.querySelector('#empresa-logo-previa');
    const mensaje = contenido.querySelector('#empresa-logo-mensaje');
    if (!archivo) {
      mensaje.textContent = '';
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type) || archivo.size > 2 * 1024 * 1024) {
      evento.target.value = '';
      mensaje.textContent = 'Selecciona una imagen PNG, JPG o WebP de máximo 2 MB.';
      return;
    }
    mensaje.textContent = '';
    if (imagen.dataset.urlPrevia) URL.revokeObjectURL(imagen.dataset.urlPrevia);
    const url = URL.createObjectURL(archivo);
    imagen.dataset.urlPrevia = url;
    imagen.src = url;
    imagen.classList.remove('oculto');
  });
}

function renderizarVacante() {
  return `<div class="persona2-contenedor">
    <section class="persona2-tarjeta">
      <h2>Publicar vacante</h2>
      <p>La base requiere ambos salarios y deja las vacantes nuevas en <strong>Pendiente</strong>. Esta pantalla solo valida un borrador; todavía no lo crea ni lo envía.</p>
      <form class="persona2-formulario" data-formulario="vacante">
        <div class="persona2-campos">
          ${campo('Título del puesto', 'vacante-titulo', 'text', { requerido: true })}
          ${campo('Sector', 'vacante-sector', 'text', { requerido: true })}
          ${campo('Departamento', 'vacante-departamento', 'text', { requerido: true })}
          ${campo('Municipio', 'vacante-municipio', 'text', { requerido: true })}
        </div>
        <div class="persona2-campos">
          <div class="persona2-campo"><label for="vacante-modalidad">Modalidad *</label><select id="vacante-modalidad" name="modalidad" required><option value="">Selecciona modalidad</option><option value="Presencial">Presencial</option><option value="Híbrido">Híbrido</option><option value="Remoto">Remoto</option></select></div>
          <div class="persona2-campo"><label for="vacante-contrato">Tipo de contrato *</label><select id="vacante-contrato" name="tipo_contrato" required><option value="">Selecciona tipo de contrato</option><option value="Tiempo completo">Tiempo completo</option><option value="Medio tiempo">Medio tiempo</option><option value="Servicios profesionales">Servicios profesionales</option></select></div>
          ${campo('Número de plazas', 'vacante-plazas', 'number', { requerido: true, atributo: 'min="1" step="1" value="1"' })}
        </div>
        <div class="persona2-campos">
          ${campo('Salario mínimo (USD)', 'vacante-salario-min', 'number', { requerido: true, atributo: 'min="0" step="0.01"' })}
          ${campo('Salario máximo (USD)', 'vacante-salario-max', 'number', { requerido: true, atributo: 'min="0" step="0.01"' })}
        </div>
        <div class="persona2-campos">
          ${campo('Descripción', 'vacante-descripcion', 'textarea', { requerido: true, completo: true })}
          ${campo('Funciones', 'vacante-funciones', 'textarea', { requerido: true, completo: true })}
          ${campo('Requisitos', 'vacante-requisitos', 'textarea', { requerido: true, completo: true })}
          ${campo('Beneficios', 'vacante-beneficios', 'textarea', { completo: true })}
        </div>
        <p class="persona2-ayuda">Los campos con * son obligatorios. Los salarios son en dólares estadounidenses; el máximo debe ser igual o mayor al mínimo.</p>
        <div class="persona2-acciones">
          <button class="boton boton-primario" type="submit">Enviar a revisión</button>
          <button class="boton" type="reset">Cancelar</button>
          ${avisoNoPersistido('La vacante todavía no se crea ni se envía a revisión.')}
        </div>
      </form>
    </section>
  </div>`;
}

function enlazarVacante() {
  const formulario = contenido.querySelector('[data-formulario="vacante"]');
  const minimo = formulario.querySelector('#vacante-salario-min');
  const maximo = formulario.querySelector('#vacante-salario-max');
  const validarSalario = () => {
    const min = minimo.value === '' ? null : Number(minimo.value);
    const max = maximo.value === '' ? null : Number(maximo.value);
    maximo.setCustomValidity(min !== null && max !== null && max < min
      ? 'El salario máximo no puede ser menor que el salario mínimo.'
      : '');
  };
  minimo.addEventListener('input', validarSalario);
  maximo.addEventListener('input', validarSalario);
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    validarSalario();
    if (!formulario.reportValidity()) return;
  });
  formulario.addEventListener('reset', () => {
    maximo.setCustomValidity('');
  });
}

function renderizarPostulaciones() {
  return `<div class="persona2-contenedor">
    <section class="persona2-tarjeta">
      <h2>Postulaciones recibidas</h2>
      <p>Esta tabla todavía no consulta postulaciones de una empresa.</p>
      <div class="persona2-estadisticas">
        ${estadosPostulacion.map((estado) => `<div class="persona2-estadistica"><strong>—</strong><span>${escaparHtml(estado)}</span></div>`).join('')}
      </div>
    </section>
    <section class="persona2-tarjeta">
      <div class="persona2-filtros">
        <div class="persona2-campo"><label for="postulacion-busqueda">Candidato o vacante</label><input id="postulacion-busqueda" type="search" placeholder="Buscar candidato o puesto" /></div>
        <div class="persona2-campo"><label for="postulacion-vacante">Vacante</label><input id="postulacion-vacante" type="search" placeholder="Buscar vacante" /></div>
        <div class="persona2-campo"><label for="postulacion-estado">Estado</label><select id="postulacion-estado"><option value="">Todos los estados</option>${estadosPostulacion.map((estado) => `<option>${escaparHtml(estado)}</option>`).join('')}</select></div>
      </div>
      <div class="persona2-desplazamiento">
        <table class="persona2-tabla">
          <thead><tr><th>CANDIDATO</th><th>PUESTO</th><th>FECHA</th><th>ESTADO</th><th>PERFIL</th></tr></thead>
          <tbody><tr><td colspan="5" class="persona2-vacio">Los datos aparecerán cuando se conecte una consulta autenticada a la base de datos.</td></tr></tbody>
        </table>
      </div>
    </section>
  </div>`;
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
    contenido.innerHTML = `<section class="persona2-tarjeta" role="alert">No se pudo verificar la sesión. Intenta de nuevo.</section>`;
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

  const pantallas = {
    P07: [renderizarPerfilCandidato, enlazarPerfilCandidato],
    P08: [renderizarEmpresa, enlazarEmpresa],
    P09: [renderizarVacante, enlazarVacante],
    P10: [renderizarPostulaciones, null]
  };
  const [render, enlazar] = pantallas[pantalla];
  contenido.innerHTML = render();
  if (enlazar) enlazar();
  if (pantalla === 'P07' && new URLSearchParams(window.location.search).get('seccion') === 'postulaciones') {
    const postulacionesCandidato = contenido.querySelector('#postulaciones-candidato');
    postulacionesCandidato?.scrollIntoView({ block: 'start' });
    postulacionesCandidato?.focus({ preventScroll: true });
  }
}

renderizarPantalla();
window.addEventListener('hashchange', renderizarPantalla);
window.addEventListener('pageshow', renderizarPantalla);
