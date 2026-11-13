// Componente del encabezado superior de WorkConnect

export function renderizarEncabezado(contenedor, alCambiarPantalla) {
  contenedor.innerHTML = `
    <div class="encabezado-interior">
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <button
          type="button"
          id="boton-logo-inicio"
          class="boton-marca"
          title="Ir al Dashboard Administrativo"
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
        <button type="button" class="enlace-nav-superior" title="Módulo público (Persona 1)">Empleos</button>
        <button type="button" class="enlace-nav-superior" title="Recursos para la carrera (Persona 1)">Recursos</button>
        <button type="button" class="enlace-nav-superior" title="Foros de la comunidad (Persona 1)">Foros</button>
        <button type="button" class="enlace-nav-superior activo">Administración</button>
      </nav>

      <div class="zona-usuario-encabezado">
        <span class="etiqueta-modulo">P11–P15 (Persona 3)</span>
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
    botonLogo.addEventListener('click', () => alCambiarPantalla('P11'));
  }
}
