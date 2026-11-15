// Componente del encabezado superior de WorkConnect
import { escaparHtml } from '../utilidades/formato.js';

let limpiarMenuUsuarioAnterior = null;

export function renderizarEncabezado(
  contenedor,
  alCambiarPantalla,
  rolActual = 'visitante',
  usuario = null,
  alNavegarCuenta = () => {}
) {
  if (limpiarMenuUsuarioAnterior) limpiarMenuUsuarioAnterior();
  const nombreUsuario = usuario?.nombre || 'Usuario';
  const inicialesUsuario = usuario
    ? nombreUsuario
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join('')
        .toUpperCase()
    : '';
  const rolUsuario = usuario?.rol || rolActual;
  const etiquetaRol = rolUsuario === 'candidato' ? 'Candidato' : rolUsuario === 'empresa' ? 'Empresa' : 'Visitante';
  const nombreSeguro = escaparHtml(nombreUsuario);
  const opcionesUsuario =
    rolUsuario === 'candidato'
      ? `
          <button type="button" role="menuitem" data-seccion-cuenta="P07">Mi perfil</button>
          <button type="button" role="menuitem" data-accion-usuario="postulaciones-candidato">Mis postulaciones</button>
        `
      : rolUsuario === 'empresa'
        ? `
            <button type="button" role="menuitem" data-seccion-cuenta="P08">Mi empresa</button>
            <button type="button" role="menuitem" data-seccion-cuenta="P09">Publicar vacante</button>
            <button type="button" role="menuitem" data-seccion-cuenta="P10">Postulaciones recibidas</button>
          `
        : '';
  contenedor.innerHTML = `
    <div class="encabezado-interior">
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <button
          type="button"
          id="boton-logo-inicio"
          class="boton-marca"
          title="Ir al inicio"
        >
          <img class="logo-marca" src="/multimedia/logo.png" alt="WorkConnect" />
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
          ${
            usuario
              ? `
                <div class="menu-usuario-contenedor">
                  <button
                    type="button"
                    id="boton-menu-usuario"
                    class="perfil-usuario-trigger"
                    aria-haspopup="menu"
                    aria-expanded="false"
                    aria-controls="menu-usuario"
                    aria-label="Abrir menú de ${nombreSeguro}"
                  >
                    <span class="avatar-circular" aria-hidden="true">${escaparHtml(inicialesUsuario)}</span>
                    <span class="perfil-usuario-publico">
                      <strong>${nombreSeguro}</strong>
                      <small>${etiquetaRol}</small>
                    </span>
                  </button>
                  <div id="menu-usuario" class="menu-usuario" role="menu" aria-label="Opciones de usuario" hidden>
                    ${opcionesUsuario}
                    <button type="button" role="menuitem" class="opcion-cerrar-sesion">Cerrar sesión</button>
                  </div>
                </div>
              `
              : '<button type="button" class="boton-encabezado boton-ingresar">Ingresar</button><button type="button" class="boton-encabezado boton-registrarse">Registrarse</button>'
          }
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
  const botonMenu = contenedor.querySelector('#boton-menu-usuario');
  const menuUsuario = contenedor.querySelector('#menu-usuario');
  if (!botonMenu || !menuUsuario) return;

  const opcionesMenu = [...menuUsuario.querySelectorAll('[role="menuitem"]')];
  const cerrarMenu = (devolverFoco = false) => {
    menuUsuario.hidden = true;
    botonMenu.setAttribute('aria-expanded', 'false');
    if (devolverFoco) botonMenu.focus();
  };
  const abrirMenu = (indice = 0) => {
    menuUsuario.hidden = false;
    botonMenu.setAttribute('aria-expanded', 'true');
    opcionesMenu[indice]?.focus();
  };
  const manejarTeclado = (evento) => {
    const indiceActual = opcionesMenu.indexOf(document.activeElement);
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrarMenu(true);
    } else if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      opcionesMenu[(indiceActual + 1 + opcionesMenu.length) % opcionesMenu.length]?.focus();
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      opcionesMenu[(indiceActual - 1 + opcionesMenu.length) % opcionesMenu.length]?.focus();
    } else if (evento.key === 'Home') {
      evento.preventDefault();
      opcionesMenu[0]?.focus();
    } else if (evento.key === 'End') {
      evento.preventDefault();
      opcionesMenu[opcionesMenu.length - 1]?.focus();
    }
  };

  botonMenu.addEventListener('click', () => {
    if (menuUsuario.hidden) abrirMenu();
    else cerrarMenu();
  });
  botonMenu.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      abrirMenu(0);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      abrirMenu(opcionesMenu.length - 1);
    }
  });
  menuUsuario.addEventListener('keydown', manejarTeclado);
  menuUsuario.addEventListener('click', (evento) => {
    const opcion = evento.target.closest('[role="menuitem"]');
    if (!opcion) return;
    cerrarMenu();
    if (opcion.dataset.seccionCuenta) {
      alNavegarCuenta(opcion.dataset.seccionCuenta);
    } else if (opcion.dataset.accionUsuario === 'postulaciones-candidato') {
      alNavegarCuenta('POSTULACIONES_CANDIDATO');
    } else {
      alCambiarPantalla('CERRAR_SESION');
    }
  });

  const manejarClickExterno = (evento) => {
    if (!contenedor.contains(evento.target)) cerrarMenu();
  };
  const manejarEnfoqueExterno = (evento) => {
    if (!contenedor.contains(evento.relatedTarget)) cerrarMenu();
  };
  document.addEventListener('pointerdown', manejarClickExterno);
  contenedor.addEventListener('focusout', manejarEnfoqueExterno);
  limpiarMenuUsuarioAnterior = () => {
    document.removeEventListener('pointerdown', manejarClickExterno);
    contenedor.removeEventListener('focusout', manejarEnfoqueExterno);
  };
}
