const contenido = document.querySelector('#persona2-contenido');
const navegacion = document.querySelector('.persona2-navegacion');
const estadosPostulacion = ['Nueva', 'En revisión', 'Entrevista', 'Contratada', 'Rechazada'];
let secuenciaBorrador = 0;

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
  const control =
    tipo === 'textarea'
      ? `<textarea id="${id}" name="${id}" ${requerido} ${atributo}></textarea>`
      : `<input id="${id}" name="${id}" type="${tipo}" ${requerido} ${atributo} />`;

  return `<div class="persona2-campo${etiquetaClase}">
    <label for="${id}">${etiqueta}${opciones.requerido ? ' *' : ''}</label>
    ${control}
  </div>`;
}

function avisoAccion() {
  return '<p class="persona2-mensaje" role="status">No se guardó ni envió información: falta una sesión autenticada y una API autorizada para este módulo.</p>';
}

function renderizarAcceso() {
  return `<div class="persona2-contenedor">
    <section class="persona2-tarjeta">
      <h2>Tu próximo paso empieza aquí</h2>
      <p>Inicia sesión o crea una cuenta de candidato o empresa. Esta pantalla valida los campos, pero el proyecto aún no tiene un proveedor de autenticación configurado.</p>
      <div class="persona2-navegacion" role="tablist" aria-label="Acceso">
        <a href="#P06" role="tab" data-acceso="entrar" aria-selected="true">Iniciar sesión</a>
        <a href="#P06" role="tab" data-acceso="crear" aria-selected="false">Crear cuenta</a>
      </div>
      <div id="persona2-formulario-acceso"></div>
    </section>
  </div>`;
}

function formularioAcceso(tipo) {
  if (tipo === 'crear') {
    return `<form class="persona2-formulario" data-formulario="registro">
      <div class="persona2-campos">
        ${campo('Nombre completo o nombre comercial', 'registro-nombre', 'text', { requerido: true, atributo: 'minlength="2" autocomplete="name"' })}
        ${campo('Correo electrónico', 'registro-correo', 'email', { requerido: true, atributo: 'autocomplete="email"' })}
      </div>
      <div class="persona2-campo">
        <label for="registro-rol">Tipo de cuenta *</label>
        <select id="registro-rol" name="rol" required>
          <option value="">Selecciona un perfil</option>
          <option value="Candidato/a">Candidato/a</option>
          <option value="Empresa">Empresa</option>
        </select>
      </div>
      <div class="persona2-campos">
        ${campo('Contraseña', 'registro-clave', 'password', { requerido: true, atributo: 'minlength="8" autocomplete="new-password"' })}
        ${campo('Confirmar contraseña', 'registro-confirmacion', 'password', { requerido: true, atributo: 'minlength="8" autocomplete="new-password"' })}
      </div>
      <label class="persona2-opcion"><input id="registro-terminos" type="checkbox" required /> Acepto los términos y condiciones *</label>
      <div class="persona2-acciones"><button class="boton boton-primario" type="submit">Crear cuenta</button></div>
      <div data-mensaje-formulario></div>
    </form>`;
  }

  return `<form class="persona2-formulario" data-formulario="acceso">
    <div class="persona2-campos">
      ${campo('Correo electrónico', 'acceso-correo', 'email', { requerido: true, atributo: 'autocomplete="email"' })}
      ${campo('Contraseña', 'acceso-clave', 'password', { requerido: true, atributo: 'autocomplete="current-password"' })}
    </div>
    <div class="persona2-campo">
      <label for="acceso-rol">Tipo de cuenta</label>
      <select id="acceso-rol" name="rol" required>
        <option value="Candidato/a">Candidato/a</option>
        <option value="Empresa">Empresa</option>
      </select>
    </div>
    <div class="persona2-acciones"><button class="boton boton-primario" type="submit">Iniciar sesión</button></div>
    <div data-mensaje-formulario></div>
  </form>`;
}

function enlazarAcceso() {
  const formulario = document.querySelector('#persona2-formulario-acceso');
  formulario.innerHTML = formularioAcceso('entrar');

  contenido.querySelectorAll('[data-acceso]').forEach((pestana) => {
    pestana.addEventListener('click', (evento) => {
      evento.preventDefault();
      const tipo = pestana.getAttribute('data-acceso');
      formulario.innerHTML = formularioAcceso(tipo);
      contenido.querySelectorAll('[data-acceso]').forEach((elemento) => {
        elemento.setAttribute('aria-selected', String(elemento === pestana));
      });
      enlazarFormularioAcceso();
    });
  });

  enlazarFormularioAcceso();
}

function enlazarFormularioAcceso() {
  const form = contenido.querySelector('[data-formulario]');
  const confirmarClave = () => {
    const confirmacion = form.querySelector('#registro-confirmacion');
    const clave = form.querySelector('#registro-clave');
    if (!confirmacion || !clave) return;
    confirmacion.setCustomValidity(
      confirmacion.value && confirmacion.value !== clave.value
        ? 'Las contraseñas no coinciden.'
        : ''
    );
  };
  form.querySelector('#registro-confirmacion')?.addEventListener('input', confirmarClave);
  form.querySelector('#registro-clave')?.addEventListener('input', confirmarClave);
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    confirmarClave();
    if (!form.reportValidity()) return;
    form.querySelector('[data-mensaje-formulario]').innerHTML = avisoAccion();
  });
}

function renderizarPerfilCandidato() {
  return `<div class="persona2-contenedor">
    <section class="persona2-tarjeta">
      <h2>Mi perfil candidato</h2>
      <p>Completa tus datos personales y profesionales. El progreso se calcula solo con los campos de este formulario y no representa un perfil guardado.</p>
      <div class="persona2-avance"><strong>Avance del formulario</strong><span id="perfil-porcentaje">0%</span></div>
      <progress id="perfil-progreso" class="persona2-progreso" max="100" value="0">0%</progress>
      <form class="persona2-formulario" data-formulario="perfil">
        <div class="persona2-campos">
          ${campo('Nombre completo', 'perfil-nombre', 'text', { requerido: true, atributo: 'autocomplete="name"' })}
          ${campo('Correo electrónico', 'perfil-correo', 'email', { requerido: true, atributo: 'autocomplete="email"' })}
          ${campo('Teléfono', 'perfil-telefono', 'tel', { atributo: 'autocomplete="tel"' })}
          ${campo('Ubicación (municipio y departamento)', 'perfil-ubicacion')}
          ${campo('Profesión o título profesional', 'perfil-titulo')}
          ${campo('Resumen profesional', 'perfil-resumen', 'textarea', { completo: true })}
        </div>
        <div class="persona2-acciones"><button class="boton boton-primario" type="submit">Guardar perfil</button></div>
        <div data-mensaje-formulario></div>
      </form>
    </section>
    <section class="persona2-tarjeta">
      <h3>Experiencia laboral</h3>
      <p>Los elementos de esta lista son borradores locales y no se guardan en la base.</p>
      <form class="persona2-formulario" data-lista="experiencia">
        <div class="persona2-campos">
          ${campo('Puesto', 'experiencia-puesto', 'text', { requerido: true })}
          ${campo('Empresa', 'experiencia-empresa', 'text', { requerido: true })}
          ${campo('Fecha de inicio', 'experiencia-fecha-inicio', 'date', { requerido: true })}
          ${campo('Fecha de fin (opcional)', 'experiencia-fecha-fin', 'date')}
        </div>
        <div class="persona2-acciones"><button class="boton" type="submit">Agregar experiencia</button></div>
      </form>
      <ul class="persona2-lista" data-lista-items="experiencia"><li class="persona2-vacio">Aún no agregas experiencia.</li></ul>
    </section>
    <section class="persona2-tarjeta">
      <h3>Estudios</h3>
      <p>Los datos requeridos corresponden a carrera/programa, institución, nivel académico y año de inicio. Estos elementos son borradores locales.</p>
      <form class="persona2-formulario" data-lista="estudios">
        <div class="persona2-campos">
          ${campo('Carrera o programa', 'estudio-programa', 'text', { requerido: true })}
          ${campo('Institución', 'estudio-institucion', 'text', { requerido: true })}
          ${campo('Nivel académico', 'estudio-nivel', 'text', { requerido: true })}
          ${campo('Año de inicio', 'estudio-anio-inicio', 'number', { requerido: true, atributo: 'min="1900" step="1"' })}
          ${campo('Año de finalización (opcional)', 'estudio-anio-fin', 'number', { atributo: 'min="1900" step="1"' })}
        </div>
        <div class="persona2-acciones"><button class="boton" type="submit">Agregar estudio</button></div>
      </form>
      <ul class="persona2-lista" data-lista-items="estudios"><li class="persona2-vacio">Aún no agregas estudios.</li></ul>
    </section>
    <section class="persona2-tarjeta">
      <h3>Habilidades</h3>
      <p>Las habilidades que agregues aquí son borradores locales; no se guardan.</p>
      <form class="persona2-formulario" data-lista="habilidades">
        ${campo('Habilidad', 'habilidad-nombre', 'text', { requerido: true })}
        <div class="persona2-acciones"><button class="boton" type="submit">Registrar habilidad</button></div>
      </form>
      <ul class="persona2-lista" data-lista-items="habilidades"><li class="persona2-vacio">Aún no agregas habilidades.</li></ul>
    </section>
    <section class="persona2-tarjeta">
      <h3>Currículum</h3>
      <p>No se encontró una configuración de almacenamiento. Elegir un archivo solo muestra su nombre; no lo carga.</p>
      <div class="persona2-campo"><label for="perfil-cv">Seleccionar archivo PDF (máximo 5 MB)</label><input id="perfil-cv" type="file" accept="application/pdf,.pdf" /></div>
      <p id="perfil-cv-mensaje" class="persona2-ayuda" aria-live="polite">Ningún currículum cargado.</p>
    </section>
    <section class="persona2-tarjeta">
      <h3>Postulaciones y alertas laborales</h3>
      <p>No hay una sesión ni datos de postulaciones disponibles para consultar.</p>
      <div class="persona2-vacio">Las postulaciones guardadas y su historial aparecerán cuando exista una conexión autenticada.</div>
      <p>La tabla existente no tiene un campo de ubicación; esta pantalla usa los filtros disponibles en el esquema.</p>
      <form class="persona2-formulario" data-formulario="alertas">
        <div class="persona2-campos">
          ${campo('Nombre de la alerta', 'alerta-nombre', 'text', { requerido: true })}
          ${campo('Sector', 'alerta-sector', 'text', { requerido: true })}
          <div class="persona2-campo">
            <label for="alerta-modalidad">Modalidad (opcional)</label>
            <select id="alerta-modalidad" name="alerta-modalidad">
              <option value="">Cualquier modalidad</option>
              <option value="Presencial">Presencial</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Remoto">Remoto</option>
            </select>
          </div>
          ${campo('Salario mínimo (USD, opcional)', 'alerta-salario-minimo', 'number', { atributo: 'min="0" step="0.01"' })}
          ${campo('Frecuencia', 'alerta-frecuencia', 'text', { atributo: 'value="Semanal"' })}
        </div>
        <label class="persona2-opcion"><input id="alerta-activa" type="checkbox" checked /> Alerta activa</label>
        <div class="persona2-acciones"><button class="boton" type="submit">Configurar alerta</button></div>
        <div data-mensaje-formulario></div>
      </form>
    </section>
    <section class="persona2-tarjeta">
      <h3>Estadísticas del perfil</h3>
      <p>No hay datos de cuenta con los que calcular estadísticas.</p>
    </section>
  </div>`;
}

function enlazarPerfilCandidato() {
  const formPerfil = contenido.querySelector('[data-formulario="perfil"]');
  const progreso = contenido.querySelector('#perfil-progreso');
  const porcentaje = contenido.querySelector('#perfil-porcentaje');
  const camposPerfil = [...formPerfil.querySelectorAll('input, textarea')];
  const actualizarProgreso = () => {
    const llenos = camposPerfil.filter((elemento) => elemento.value.trim()).length;
    const valor = Math.round((llenos / camposPerfil.length) * 100);
    progreso.value = valor;
    porcentaje.textContent = `${valor}%`;
  };
  formPerfil.addEventListener('input', actualizarProgreso);
  formPerfil.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!formPerfil.reportValidity()) return;
    formPerfil.querySelector('[data-mensaje-formulario]').innerHTML = avisoAccion();
  });

  const validarRangos = (form) => {
    const tipo = form.getAttribute('data-lista');
    const inicio = form.querySelector(
      tipo === 'experiencia' ? '#experiencia-fecha-inicio' : '#estudio-anio-inicio'
    );
    const fin = form.querySelector(
      tipo === 'experiencia' ? '#experiencia-fecha-fin' : '#estudio-anio-fin'
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
    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      validarRangos(form);
      if (!form.reportValidity()) return;
      const tipo = form.getAttribute('data-lista');
      const controles = [...form.querySelectorAll('input, select, textarea')];
      const valores = controles.map((elemento) => elemento.value.trim());
      const etiqueta = valores.filter(Boolean).join(' · ');
      const lista = contenido.querySelector(`[data-lista-items="${tipo}"]`);
      if (lista.querySelector('.persona2-vacio')) lista.innerHTML = '';
      const idEdicion = form.dataset.editando;
      const elemento = idEdicion
        ? [...lista.children].find((item) => item.dataset.id === idEdicion)
        : null;
      if (elemento) {
        elemento.querySelector('[data-etiqueta]').textContent = etiqueta;
        elemento.dataset.valores = JSON.stringify(valores);
      } else {
        const nuevoElemento = document.createElement('li');
        const id = `borrador-${++secuenciaBorrador}`;
        nuevoElemento.dataset.id = id;
        nuevoElemento.dataset.valores = JSON.stringify(valores);
        const botonEditar =
          tipo === 'habilidades'
            ? ''
            : `<button type="button" data-editar aria-label="Editar ${escaparHtml(etiqueta)}">Editar</button>`;
        nuevoElemento.innerHTML = `
          <span data-etiqueta>${escaparHtml(etiqueta)}</span>
          <span>
            ${botonEditar}
            <button type="button" data-eliminar aria-label="Eliminar ${escaparHtml(etiqueta)}">Eliminar</button>
          </span>
        `;
        nuevoElemento.querySelector('[data-editar]')?.addEventListener('click', () => {
          const entradas = form.querySelectorAll('input, select, textarea');
          JSON.parse(nuevoElemento.dataset.valores).forEach((valor, indice) => {
            entradas[indice].value = valor;
          });
          form.dataset.editando = id;
          form.querySelector('[type="submit"]').textContent = 'Guardar cambios';
          entradas[0].focus();
        });
        nuevoElemento.querySelector('[data-eliminar]').addEventListener('click', () => {
          if (form.dataset.editando === id) {
            delete form.dataset.editando;
            form.reset();
            form.querySelector('[type="submit"]').textContent =
              tipo === 'experiencia'
                ? 'Agregar experiencia'
                : tipo === 'estudios'
                  ? 'Agregar estudio'
                  : 'Registrar habilidad';
          }
          nuevoElemento.remove();
          if (!lista.children.length) {
            const vacio = document.createElement('li');
            vacio.className = 'persona2-vacio';
            vacio.textContent = 'No hay elementos en este borrador.';
            lista.append(vacio);
          }
        });
        lista.append(nuevoElemento);
      }
      delete form.dataset.editando;
      form.querySelector('[type="submit"]').textContent =
        tipo === 'experiencia'
          ? 'Agregar experiencia'
          : tipo === 'estudios'
            ? 'Agregar estudio'
            : 'Registrar habilidad';
      form.reset();
    });
  });

  contenido.querySelector('#perfil-cv').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    const mensaje = contenido.querySelector('#perfil-cv-mensaje');
    if (!archivo) {
      mensaje.textContent = 'Ningún currículum cargado.';
    } else if (archivo.type !== 'application/pdf' || archivo.size > 5 * 1024 * 1024) {
      evento.target.value = '';
      mensaje.textContent = 'Selecciona un archivo PDF de máximo 5 MB.';
    } else {
      mensaje.textContent = `Archivo seleccionado localmente: ${archivo.name}. Aún no se ha cargado.`;
    }
  });

  contenido.querySelector('[data-formulario="alertas"]').addEventListener('submit', (evento) => {
    evento.preventDefault();
    evento.currentTarget.querySelector('[data-mensaje-formulario]').innerHTML = avisoAccion();
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
          <span class="persona2-ayuda">Vista previa local; no hay almacenamiento conectado.</span>
        </div>
        <div class="persona2-acciones"><button class="boton boton-primario" type="submit">Guardar perfil de empresa</button></div>
        <div data-mensaje-formulario></div>
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
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;
    formulario.querySelector('[data-mensaje-formulario]').innerHTML = avisoAccion();
  });

  contenido.querySelector('#empresa-logo').addEventListener('change', (evento) => {
    const archivo = evento.target.files[0];
    const imagen = contenido.querySelector('#empresa-logo-previa');
    if (!archivo) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type) || archivo.size > 2 * 1024 * 1024) {
      evento.target.value = '';
      mostrarMensaje('Selecciona una imagen PNG, JPG o WebP de máximo 2 MB.');
      return;
    }
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
        </div>
        <div data-mensaje-formulario></div>
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
    formulario.querySelector('[data-mensaje-formulario]').innerHTML = avisoAccion();
  });
  formulario.addEventListener('reset', () => {
    maximo.setCustomValidity('');
    formulario.querySelector('[data-mensaje-formulario]').replaceChildren();
  });
}

function renderizarPostulaciones() {
  return `<div class="persona2-contenedor">
    <section class="persona2-tarjeta">
      <h2>Postulaciones recibidas</h2>
      <p>Los estados corresponden a los valores usados por el dashboard. No se consultan postulaciones mientras no exista una sesión de empresa autorizada.</p>
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
          <tbody><tr><td colspan="5" class="persona2-vacio">No hay postulaciones disponibles. Conecta una API autenticada para consultar datos reales.</td></tr></tbody>
        </table>
      </div>
    </section>
  </div>`;
}

function mostrarMensaje(mensaje) {
  const nodo = document.createElement('p');
  nodo.className = 'persona2-mensaje';
  nodo.setAttribute('role', 'status');
  nodo.textContent = mensaje;
  contenido.prepend(nodo);
  window.setTimeout(() => nodo.remove(), 5000);
}

function renderizarPantalla() {
  const pantalla = /^#P(06|07|08|09|10)$/.test(window.location.hash)
    ? window.location.hash.slice(1)
    : 'P06';
  const pantallas = {
    P06: [renderizarAcceso, enlazarAcceso],
    P07: [renderizarPerfilCandidato, enlazarPerfilCandidato],
    P08: [renderizarEmpresa, enlazarEmpresa],
    P09: [renderizarVacante, enlazarVacante],
    P10: [renderizarPostulaciones, null]
  };
  const [render, enlazar] = pantallas[pantalla];
  contenido.innerHTML = render();
  navegacion.querySelectorAll('[data-pantalla]').forEach((enlace) => {
    const activo = enlace.getAttribute('data-pantalla') === pantalla;
    enlace.classList.toggle('activo', activo);
    if (activo) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  });
  if (enlazar) enlazar();
}

renderizarPantalla();
window.addEventListener('hashchange', renderizarPantalla);
