import { validarCorreo, validarTexto, valorEnLista } from '../utilidades/formato.js';

export function renderizarAutenticacion(contenedor, tipo, alCompletar, alCancelar) {
  const esRegistro = tipo === 'registro';
  contenedor.innerHTML = `
    <div class="pila-vertical auth-contenedor">
      <button type="button" class="enlace-accion-vino" id="cancelar-autenticacion">← Volver al portal</button>
      <section class="auth-tarjeta" aria-label="Acceso a WorkConnect">
        <div class="auth-presentacion">
          <span class="auth-etiqueta">WORKCONNECT · ACCESO</span>
          <h1>Tu próximo paso empieza aquí</h1>
          <p>Crea tu cuenta o inicia sesión para encontrar nuevas oportunidades como candidato o conectar con el talento que tu empresa necesita.</p>
          <div class="auth-firma" aria-hidden="true"><img src="/multimedia/icono.png" alt="" />Conectando talento<br />con oportunidades.</div>
        </div>
        <div class="auth-formulario-panel">
        <nav class="auth-pestanas" aria-label="Opciones de acceso">
          <button type="button" class="auth-pestana ${!esRegistro ? 'activa' : ''}" data-auth-tipo="login" ${!esRegistro ? 'aria-current="page"' : ''}>Iniciar sesión</button>
          <button type="button" class="auth-pestana ${esRegistro ? 'activa' : ''}" data-auth-tipo="registro" ${esRegistro ? 'aria-current="page"' : ''}>Crear cuenta</button>
        </nav>
        <h2 class="titulo-pantalla">${esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
        <p class="subtitulo-pantalla">${esRegistro ? 'Únete a WorkConnect y conecta con nuevas oportunidades.' : 'Bienvenido de nuevo. Ingresa los datos de tu cuenta.'}</p>
        <form id="formulario-autenticacion" class="formulario-publico">
          ${esRegistro ? '<label class="campo-formulario"><span>Nombre completo *</span><input id="auth-nombre" autocomplete="name" type="text" minlength="3" maxlength="80" required /></label>' : ''}
          <label class="campo-formulario"><span>Correo electrónico *</span><input id="auth-correo" autocomplete="email" placeholder="nombre@correo.com" type="email" maxlength="120" required /></label>
          <label class="campo-formulario"><span>Contraseña *</span><input id="auth-contrasena" autocomplete="${esRegistro ? 'new-password' : 'current-password'}" type="password" minlength="6" maxlength="80" required /></label>
          ${esRegistro ? '<label class="campo-formulario"><span>Tipo de cuenta *</span><select id="auth-rol" required><option value="">Selecciona una opción</option><option value="candidato">Candidato</option><option value="empresa">Empresa</option></select></label>' : ''}
          <p id="mensaje-autenticacion" class="alerta-error-formulario oculto" role="status"></p>
          <button class="boton-principal ancho-completo" type="submit">${esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</button>
        </form>
        <div class="auth-alternativa">${esRegistro ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'} <button type="button" class="enlace-accion-vino auth-cambio">${esRegistro ? 'Inicia sesión' : 'Regístrate'}</button></div>
        </div>
      </section>
    </div>
  `;

  contenedor.querySelector('#cancelar-autenticacion').addEventListener('click', alCancelar);
  contenedor.querySelectorAll('[data-auth-tipo]').forEach((pestana) => {
    pestana.addEventListener('click', () => {
      if (pestana.dataset.authTipo !== (esRegistro ? 'registro' : 'login')) {
        renderizarAutenticacion(contenedor, pestana.dataset.authTipo, alCompletar, alCancelar);
        contenedor.querySelector('.auth-pestana.activa').focus();
      }
    });
  });
  contenedor.querySelector('.auth-cambio').addEventListener('click', () => {
    renderizarAutenticacion(contenedor, esRegistro ? 'login' : 'registro', alCompletar, alCancelar);
  });
  contenedor.querySelector('#formulario-autenticacion').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const correo = contenedor.querySelector('#auth-correo').value.trim().toLowerCase();
    const contrasena = contenedor.querySelector('#auth-contrasena').value;

    if (esRegistro) {
      const nombre = contenedor.querySelector('#auth-nombre').value.trim();
      const rol = contenedor.querySelector('#auth-rol').value;
      if (!validarTexto(nombre, 3, 80)) {
        mostrarError('El nombre debe tener entre 3 y 80 caracteres.');
        return;
      }
      if (!validarCorreo(correo)) {
        mostrarError('Escribe un correo electrónico válido.');
        return;
      }
      if (!validarTexto(contrasena, 6, 80)) {
        mostrarError('La contraseña debe tener entre 6 y 80 caracteres.');
        return;
      }
      if (!valorEnLista(rol, ['candidato', 'empresa'])) {
        mostrarError('Selecciona un tipo de cuenta válido.');
        return;
      }
    }

    if (!validarCorreo(correo) || !validarTexto(contrasena, 6, 80)) {
      mostrarError('Escribe un correo válido y una contraseña de 6 a 80 caracteres.');
      return;
    }

    const boton = contenedor.querySelector('#formulario-autenticacion button[type="submit"]');
    boton.disabled = true;
    try {
      const respuesta = await fetch(esRegistro ? '/api/auth/registro' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          esRegistro
            ? {
                nombre: contenedor.querySelector('#auth-nombre').value.trim(),
                email: correo,
                password: contrasena,
                rol: contenedor.querySelector('#auth-rol').value
              }
            : { email: correo, password: contrasena }
        )
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo completar la autenticación.');

      if (resultado.confirmacionRequerida) {
        mostrarExito('Cuenta creada. Confirma tu correo para poder iniciar sesión.');
        return;
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
    elemento.textContent = mensaje;
    elemento.className = 'alerta-error-formulario';
    elemento.classList.remove('oculto');
  }

  function mostrarExito(mensaje) {
    const elemento = contenedor.querySelector('#mensaje-autenticacion');
    elemento.textContent = mensaje;
    elemento.className = 'alerta-exito-formulario';
    elemento.classList.remove('oculto');
  }
}
