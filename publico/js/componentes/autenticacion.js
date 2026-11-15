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
          <p id="mensaje-autenticacion" class="alerta-error-formulario oculto"></p>
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
  contenedor.querySelector('#formulario-autenticacion').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const correo = contenedor.querySelector('#auth-correo').value.trim().toLowerCase();
    const contrasena = contenedor.querySelector('#auth-contrasena').value;
    const cuentas = JSON.parse(localStorage.getItem('workconnect-cuentas') || '[]');
    let cuenta;

    if (esRegistro) {
      const nombre = contenedor.querySelector('#auth-nombre').value.trim();
      const rol = contenedor.querySelector('#auth-rol').value;
      if (cuentas.some((item) => item.correo === correo)) {
        mostrarError('Este correo ya tiene una cuenta.');
        return;
      }
      cuenta = { nombre, correo, contrasena, rol };
      localStorage.setItem('workconnect-cuentas', JSON.stringify([...cuentas, cuenta]));
    } else {
      cuenta = cuentas.find((item) => item.correo === correo && item.contrasena === contrasena);
      if (!cuenta) {
        mostrarError('Correo o contraseña incorrectos. Si no tienes cuenta, regístrate.');
        return;
      }
    }

    sessionStorage.setItem('workconnect-sesion', JSON.stringify(cuenta));
    alCompletar(cuenta);
  });

  function mostrarError(mensaje) {
    const elemento = contenedor.querySelector('#mensaje-autenticacion');
    elemento.textContent = mensaje;
    elemento.classList.remove('oculto');
  }
}
