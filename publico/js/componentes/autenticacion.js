import { validarCorreo, validarTexto, valorEnLista } from '../utilidades/formato.js';
import {
  DEPARTAMENTOS_EL_SALVADOR,
  SECTORES_ECONOMICOS,
  TAMANOS_EMPRESA,
  poblarSelectDepartamentos,
  sincronizarMunicipios
} from '../utilidades/ubicaciones.js';

export function renderizarAutenticacion(contenedor, tipo, alCompletar, alCancelar, rolInicial = 'candidato') {
  const esRegistro = tipo === 'registro';
  const esEmpresaInicial = rolInicial === 'empresa';

  contenedor.innerHTML = `
    <div class="auth-contenedor">
      <section class="auth-tarjeta" aria-label="Acceso a WorkConnect">
        <div class="auth-presentacion">
          <span class="auth-etiqueta">WORKCONNECT · ACCESO</span>
          <h1>${esEmpresaInicial ? 'Impulsa el talento de tu empresa.' : 'Tu próximo paso empieza aquí.'}</h1>
          <p>${esEmpresaInicial
            ? 'Crea tu perfil corporativo, publica vacantes verificadas y gestiona postulaciones de candidatos en El Salvador.'
            : 'Crea tu cuenta como candidato o como empresa, o ingresa para continuar donde te quedaste.'}</p>
          <div class="auth-firma" aria-hidden="true">Conectando talento<br />con oportunidades.</div>
        </div>
        <div class="auth-formulario-panel ${esRegistro && esEmpresaInicial ? 'auth-panel-expandido' : ''}">
          <nav class="auth-pestanas" aria-label="Opciones de acceso">
            <button type="button" class="auth-pestana ${!esRegistro ? 'activa' : ''}" data-auth-tipo="login" ${!esRegistro ? 'aria-current="page"' : ''}>Iniciar sesión</button>
            <button type="button" class="auth-pestana ${esRegistro ? 'activa' : ''}" data-auth-tipo="registro" ${esRegistro ? 'aria-current="page"' : ''}>Crear cuenta</button>
          </nav>
          <form id="formulario-autenticacion" class="formulario-publico" novalidate>
            ${esRegistro ? `
              <fieldset class="auth-roles">
                <legend>Quiero registrarme como</legend>
                <div class="auth-roles-opciones">
                  <button type="button" class="auth-rol ${rolInicial !== 'empresa' ? 'seleccionado' : ''}" data-rol="candidato">
                    <strong>Candidato/a</strong><span>Busco empleo</span>
                  </button>
                  <button type="button" class="auth-rol ${rolInicial === 'empresa' ? 'seleccionado' : ''}" data-rol="empresa">
                    <strong>Empresa</strong><span>Quiero contratar</span>
                  </button>
                </div>
                <input id="auth-rol" type="hidden" value="${rolInicial === 'empresa' ? 'empresa' : 'candidato'}" />
              </fieldset>

              <!-- Panel de datos para Candidato -->
              <div id="auth-campos-candidato" class="${rolInicial === 'empresa' ? 'oculto' : ''}">
                <label class="campo-formulario">
                  <span>Nombre completo *</span>
                  <input id="auth-nombre-candidato" autocomplete="name" type="text" minlength="3" maxlength="80" placeholder="Ej. Ana María Torres" />
                </label>
              </div>

              <!-- Panel de datos estructurado para Empresa -->
              <div id="auth-campos-empresa" class="${rolInicial === 'empresa' ? '' : 'oculto'}">
                <div class="auth-seccion-encabezado">
                  <span>1. Datos de la empresa</span>
                </div>
                <div class="auth-fila-doble">
                  <label class="campo-formulario">
                    <span>Nombre comercial *</span>
                    <input id="auth-nombre-empresa" autocomplete="organization" type="text" minlength="3" maxlength="120" placeholder="Ej. Soluciones Digitales" />
                  </label>
                  <label class="campo-formulario">
                    <span>Razón social (opcional)</span>
                    <input id="auth-razon-social" type="text" maxlength="120" placeholder="Ej. Soluciones Digitales S.A. de C.V." />
                  </label>
                </div>

                <div class="auth-fila-doble">
                  <label class="campo-formulario">
                    <span>Sector económico *</span>
                    <select id="auth-sector">
                      <option value="">Selecciona sector</option>
                      ${SECTORES_ECONOMICOS.map((s) => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                  </label>
                  <label class="campo-formulario">
                    <span>Tamaño de empresa *</span>
                    <select id="auth-tamano">
                      ${TAMANOS_EMPRESA.map((t) => `<option value="${t}" ${t === '51-200 empleados' ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                  </label>
                </div>

                <div class="auth-fila-doble">
                  <label class="campo-formulario">
                    <span>NIT de la empresa *</span>
                    <input id="auth-nit" type="text" maxlength="17" placeholder="0000-000000-000-0" />
                  </label>
                  <label class="campo-formulario">
                    <span>Teléfono de contacto *</span>
                    <input id="auth-telefono" type="tel" maxlength="9" placeholder="2200-0000" />
                  </label>
                </div>

                <div class="auth-seccion-encabezado">
                  <span>2. Ubicación en El Salvador</span>
                </div>
                <div class="auth-fila-doble">
                  <label class="campo-formulario">
                    <span>Departamento *</span>
                    <select id="auth-departamento">
                      <option value="">Selecciona departamento</option>
                      ${DEPARTAMENTOS_EL_SALVADOR.map((d) => `<option value="${d}" ${d === 'San Salvador' ? 'selected' : ''}>${d}</option>`).join('')}
                    </select>
                  </label>
                  <label class="campo-formulario">
                    <span>Municipio *</span>
                    <select id="auth-municipio">
                      <option value="">Selecciona municipio</option>
                    </select>
                  </label>
                </div>

                <div class="auth-seccion-encabezado">
                  <span>3. Credenciales de acceso corporativo</span>
                </div>
              </div>
            ` : ''}

            <label class="campo-formulario">
              <span id="auth-correo-etiqueta">${esRegistro && rolInicial === 'empresa' ? 'Correo corporativo *' : 'Correo electrónico *'}</span>
              <input id="auth-correo" autocomplete="email" placeholder="nombre@correo.com" type="email" maxlength="120" required />
            </label>

            <div class="${esRegistro ? 'auth-contrasenas' : ''}">
              <label class="campo-formulario">
                <span>Contraseña *</span>
                <input id="auth-contrasena" autocomplete="${esRegistro ? 'new-password' : 'current-password'}" type="password" minlength="6" maxlength="80" required />
              </label>
              ${esRegistro ? `
                <label class="campo-formulario">
                  <span>Confirmar contraseña *</span>
                  <input id="auth-confirmar-contrasena" autocomplete="new-password" type="password" minlength="6" maxlength="80" required />
                  <small>Mínimo 6 caracteres.</small>
                </label>
              ` : ''}
            </div>

            ${esRegistro ? `
              <label class="auth-terminos">
                <input id="auth-terminos" type="checkbox" required />
                <span>Acepto los términos de uso y la política de privacidad de WorkConnect.</span>
              </label>
            ` : ''}

            <p id="mensaje-autenticacion" class="alerta-error-formulario oculto" role="status"></p>
            <button class="boton-principal ancho-completo" type="submit">
              ${esRegistro ? (rolInicial === 'empresa' ? 'Crear cuenta de empresa' : 'Crear cuenta de candidato') : 'Iniciar sesión'}
            </button>
          </form>
          <div class="auth-alternativa">
            ${esRegistro ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}
            <button type="button" class="enlace-accion-vino auth-cambio">${esRegistro ? 'Inicia sesión' : 'Regístrate'}</button>
          </div>
        </div>
      </section>
    </div>
  `;

  if (esRegistro) {
    const panelFormulario = contenedor.querySelector('.auth-formulario-panel');
    const botonesRol = contenedor.querySelectorAll('[data-rol]');
    const selectDepto = contenedor.querySelector('#auth-departamento');
    const selectMuni = contenedor.querySelector('#auth-municipio');
    const inputNit = contenedor.querySelector('#auth-nit');
    const inputTel = contenedor.querySelector('#auth-telefono');
    const botonSubmit = contenedor.querySelector('#formulario-autenticacion button[type="submit"]');

    // Sincronizar municipios dependientes del departamento
    sincronizarMunicipios(selectDepto, selectMuni, 'San Salvador');

    // Auto-formato de teléfono: 0000-0000
    inputTel?.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 8);
      if (v.length > 4) v = `${v.slice(0, 4)}-${v.slice(4)}`;
      e.target.value = v;
    });

    // Auto-formato de NIT: 0000-000000-000-0
    inputNit?.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 14);
      if (v.length > 13) {
        v = `${v.slice(0, 4)}-${v.slice(4, 10)}-${v.slice(10, 13)}-${v.slice(13)}`;
      } else if (v.length > 10) {
        v = `${v.slice(0, 4)}-${v.slice(4, 10)}-${v.slice(10)}`;
      } else if (v.length > 4) {
        v = `${v.slice(0, 4)}-${v.slice(4)}`;
      }
      e.target.value = v;
    });

    const actualizarRol = (rol) => {
      contenedor.querySelector('#auth-rol').value = rol;
      const esEmp = rol === 'empresa';
      panelFormulario.classList.toggle('auth-panel-expandido', esEmp);
      contenedor.querySelector('#auth-campos-candidato')?.classList.toggle('oculto', esEmp);
      contenedor.querySelector('#auth-campos-empresa')?.classList.toggle('oculto', !esEmp);
      contenedor.querySelector('#auth-correo-etiqueta').textContent =
        esEmp ? 'Correo corporativo *' : 'Correo electrónico *';
      if (botonSubmit) {
        botonSubmit.textContent = esEmp ? 'Crear cuenta de empresa' : 'Crear cuenta de candidato';
      }
      botonesRol.forEach((botonRol) => botonRol.classList.toggle('seleccionado', botonRol.dataset.rol === rol));
    };

    botonesRol.forEach((botonRol) => botonRol.addEventListener('click', () => actualizarRol(botonRol.dataset.rol)));
    actualizarRol(rolInicial === 'empresa' ? 'empresa' : 'candidato');
  }

  // Cambio entre Login y Registro
  contenedor.querySelectorAll('[data-auth-tipo]').forEach((pestana) => {
    pestana.addEventListener('click', () => {
      if (pestana.dataset.authTipo !== (esRegistro ? 'registro' : 'login')) {
        renderizarAutenticacion(contenedor, pestana.dataset.authTipo, alCompletar, alCancelar, rolInicial);
        contenedor.querySelector('.auth-pestana.activa')?.focus();
      }
    });
  });

  contenedor.querySelector('.auth-cambio')?.addEventListener('click', () => {
    renderizarAutenticacion(contenedor, esRegistro ? 'login' : 'registro', alCompletar, alCancelar, rolInicial);
  });

  // Envío del formulario
  contenedor.querySelector('#formulario-autenticacion').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const correo = contenedor.querySelector('#auth-correo').value.trim().toLowerCase();
    const contrasena = contenedor.querySelector('#auth-contrasena').value;

    let datosEnvio = { email: correo, password: contrasena };

    if (esRegistro) {
      const rol = contenedor.querySelector('#auth-rol').value;
      const confirmarContrasena = contenedor.querySelector('#auth-confirmar-contrasena').value;

      if (!validarCorreo(correo)) {
        mostrarError('Escribe un correo electrónico válido.');
        return;
      }
      if (!validarTexto(contrasena, 6, 80)) {
        mostrarError('La contraseña debe tener entre 6 y 80 caracteres.');
        return;
      }
      if (contrasena !== confirmarContrasena) {
        mostrarError('Las contraseñas no coinciden.');
        return;
      }
      if (!valorEnLista(rol, ['candidato', 'empresa'])) {
        mostrarError('Selecciona un tipo de cuenta válido.');
        return;
      }

      if (rol === 'candidato') {
        const nombre = contenedor.querySelector('#auth-nombre-candidato')?.value.trim();
        if (!validarTexto(nombre, 3, 80)) {
          mostrarError('El nombre completo debe tener entre 3 y 80 caracteres.');
          return;
        }
        datosEnvio = {
          nombre,
          email: correo,
          password: contrasena,
          rol: 'candidato'
        };
      } else {
        const nombreEmpresa = contenedor.querySelector('#auth-nombre-empresa')?.value.trim();
        const razonSocial = contenedor.querySelector('#auth-razon-social')?.value.trim() || nombreEmpresa;
        const sector = contenedor.querySelector('#auth-sector')?.value;
        const tamano = contenedor.querySelector('#auth-tamano')?.value || '51-200 empleados';
        const depto = contenedor.querySelector('#auth-departamento')?.value;
        const muni = contenedor.querySelector('#auth-municipio')?.value;
        const nit = contenedor.querySelector('#auth-nit')?.value.trim() || '0000-000000-000-0';
        const tel = contenedor.querySelector('#auth-telefono')?.value.trim();

        if (!validarTexto(nombreEmpresa, 3, 120)) {
          mostrarError('El nombre comercial de la empresa debe tener al menos 3 caracteres.');
          return;
        }
        if (!sector) {
          mostrarError('Selecciona el sector económico de la empresa.');
          return;
        }
        if (!depto) {
          mostrarError('Selecciona el departamento de ubicación.');
          return;
        }
        if (!muni) {
          mostrarError('Selecciona el municipio de ubicación.');
          return;
        }
        if (!tel || tel.length < 8) {
          mostrarError('Escribe un teléfono válido (ej. 2200-0000).');
          return;
        }

        datosEnvio = {
          nombre: nombreEmpresa,
          email: correo,
          password: contrasena,
          rol: 'empresa',
          sector,
          tamano,
          departamento: depto,
          municipio: muni,
          telefono: tel,
          razon_social: razonSocial,
          nit
        };
      }

      if (!contenedor.querySelector('#auth-terminos').checked) {
        mostrarError('Debes aceptar los términos de uso y la política de privacidad.');
        return;
      }
    } else {
      if (!validarCorreo(correo) || !validarTexto(contrasena, 6, 80)) {
        mostrarError('Escribe un correo válido y tu contraseña (mínimo 6 caracteres).');
        return;
      }
    }

    const boton = contenedor.querySelector('#formulario-autenticacion button[type="submit"]');
    boton.disabled = true;
    contenedor.querySelector('#mensaje-autenticacion').classList.add('oculto');

    try {
      const respuesta = await fetch(esRegistro ? '/api/auth/registro' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnvio)
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo completar la autenticación.');

      if (resultado.confirmacionRequerida) {
        mostrarExito('Cuenta creada exitosamente. Redirigiendo...');
      }
      alCompletar(resultado.usuario);
    } catch (error) {
      mostrarError(error.message || 'No se pudo completar la autenticación. Intenta de nuevo.');
    } finally {
      boton.disabled = false;
    }
  });

  function mostrarError(mensaje) {
    const elemento = contenedor.querySelector('#mensaje-autenticacion');
    if (!elemento) return;
    elemento.textContent = mensaje;
    elemento.className = 'alerta-error-formulario';
    elemento.classList.remove('oculto');
  }

  function mostrarExito(mensaje) {
    const elemento = contenedor.querySelector('#mensaje-autenticacion');
    if (!elemento) return;
    elemento.textContent = mensaje;
    elemento.className = 'alerta-exito-formulario';
    elemento.classList.remove('oculto');
  }
}
