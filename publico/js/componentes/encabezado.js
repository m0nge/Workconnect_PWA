// Componente del encabezado superior de WorkConnect

export function renderizarEncabezado(contenedor, alCambiarPantalla, rolActual = 'visitante', usuario = null) {
  contenedor.innerHTML = `
    <div class="encabezado-interior">
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <button
          type="button"
          id="boton-logo-inicio"
          class="boton-marca"
          title="Ir al inicio"
        >
          <div class="caja-logo">
            <svg class="icono-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 8l3 8 3-6 3 6 3-8" />
              <circle cx="12" cy="5" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div class="marca-textos">
            <span class="marca-nombre">
              Work<span class="marca-nombre-acento">Connect</span>
            </span>
            <span class="marca-lema">Portal de Empleo · El Salvador</span>
          </div>
        </button>
      </div>

      <nav class="navegacion-superior" aria-label="Navegación principal">
        <button type="button" class="enlace-nav-superior" data-pantalla="P01">Empleos</button>
        <button type="button" class="enlace-nav-superior" data-pantalla="P17">Recursos</button>
        <button type="button" class="enlace-nav-superior" data-pantalla="P05">Foros</button>
        <button type="button" class="enlace-nav-superior" data-pantalla="AUTH_REGISTRO">Para empresas</button>
      </nav>

      <div class="zona-usuario-encabezado">
        <div class="acciones-publicas-encabezado">
          ${usuario ? `<span class="usuario-encabezado">${usuario.nombre}</span><button type="button" class="boton-encabezado boton-cerrar-sesion">Cerrar sesión</button>` : '<button type="button" class="boton-encabezado boton-ingresar">Ingresar</button><button type="button" class="boton-encabezado boton-registrarse">Registrarse</button>'}
        </div>
        <div class="perfil-admin-encabezado">
          <div class="avatar-circular">AW</div>
          <div class="perfil-admin-textos">
            <p class="perfil-admin-nombre">Administrador</p>
            <p class="perfil-admin-correo">admin@workconnect.sv</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const botonLogo = contenedor.querySelector('#boton-logo-inicio');
  if (botonLogo) {
    botonLogo.addEventListener('click', () => alCambiarPantalla('P01'));
  }
  contenedor.querySelectorAll('[data-pantalla]').forEach((boton) => {
    boton.addEventListener('click', () => alCambiarPantalla(boton.dataset.pantalla));
  });
  const ingresar = contenedor.querySelector('.boton-ingresar');
  const registrarse = contenedor.querySelector('.boton-registrarse');
  if (ingresar) ingresar.addEventListener('click', () => alCambiarPantalla('AUTH_LOGIN'));
  if (registrarse) registrarse.addEventListener('click', () => alCambiarPantalla('AUTH_REGISTRO'));
  const cerrarSesion = contenedor.querySelector('.boton-cerrar-sesion');
  if (cerrarSesion) cerrarSesion.addEventListener('click', () => alCambiarPantalla('CERRAR_SESION'));
}
