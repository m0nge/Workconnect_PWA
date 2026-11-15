import { validarCorreo, validarTexto, valorEnLista } from '../utilidades/formato.js';

export function renderizarAutenticacion(contenedor, tipo, alCompletar, alCancelar) {
  const esRegistro = tipo === 'registro';
  contenedor.innerHTML = `
    <div class="pila-vertical auth-contenedor">
      <button type="button" class="enlace-accion-vino" id="cancelar-autenticacion">← Volver al portal</button>
      <section class="tarjeta tarjeta-espaciado auth-tarjeta">
        <h1 class="titulo-pantalla">${esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
        <p class="subtitulo-pantalla">Para acceder a esta sección debes iniciar sesión o crear una cuenta.</p>
        <form id="formulario-autenticacion" class="formulario-publico">
          ${esRegistro ? '<label class="campo-formulario"><span>Nombre completo *</span><input id="auth-nombre" type="text" minlength="3" maxlength="80" required /></label>' : ''}
          <label class="campo-formulario"><span>Correo electrónico *</span><input id="auth-correo" type="email" maxlength="120" required /></label>
          <label class="campo-formulario"><span>Contraseña *</span><input id="auth-contrasena" type="password" minlength="6" maxlength="80" required /></label>
          ${esRegistro ? '<label class="campo-formulario"><span>Tipo de cuenta *</span><select id="auth-rol" required><option value="">Selecciona una opción</option><option value="candidato">Candidato</option><option value="empresa">Empresa</option></select></label>' : ''}
          <p id="mensaje-autenticacion" class="alerta-error-formulario oculto" role="status"></p>
          <button class="boton-principal ancho-completo" type="submit">${esRegistro ? 'Crear cuenta' : 'Ingresar'}</button>
        </form>
        <button type="button" class="enlace-accion-vino auth-cambio">${esRegistro ? 'Ya tengo una cuenta' : 'Crear una cuenta'}</button>
      </section>
    </div>
  `;

  contenedor.querySelector('#cancelar-autenticacion').addEventListener('click', alCancelar);
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
