import { escaparHtml } from '../utilidades/formato.js';

let limpiarMenuUsuarioAnterior = null;

export function renderizarEncabezado(
  contenedor,
  alCambiarPantalla,
  rolActual = 'visitante',
  usuario = null,
  alNavegarCuenta = () => {},
  pantallaActual = 'P01',
  conteosPendientes = { empresas: 0, vacantes: 0, moderacion: 0, verificaciones: 0 },
  seccionCuenta = null
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
  const etiquetaRol =
    rolUsuario === 'candidato'
      ? 'Candidato/a'
      : rolUsuario === 'empresa'
        ? 'Empresa'
        : rolUsuario === 'administrador'
          ? 'Administrador/a'
          : 'Visitante';

  const nombreSeguro = escaparHtml(nombreUsuario);
  const fotoUrl = typeof usuario?.foto_url === 'string' ? usuario.foto_url.trim() : '';
  const avatarUsuario = fotoUrl
    ? `<img class="avatar-circular" src="${escaparHtml(fotoUrl)}" alt="" />`
    : `<span class="avatar-circular" aria-hidden="true">${escaparHtml(inicialesUsuario)}</span>`;

  const badge = (cantidad) =>
    cantidad && cantidad > 0
      ? `<span class="insignia-nav-pendiente" title="${cantidad} pendientes">${cantidad}</span>`
      : '';
  let enlacesNav = '';

  if (!usuario || rolUsuario === 'visitante') {
    enlacesNav = `
      <button type="button" class="enlace-nav-superior ${['P01', 'P02', 'P03'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P01">Buscar empleos</button>
      <button type="button" class="enlace-nav-superior ${['P17', 'P04'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P17">Recursos</button>
      <button type="button" class="enlace-nav-superior ${['P05', 'P28'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P05">Foros</button>
      <button type="button" class="enlace-nav-superior" data-seccion-cuenta="P31">Para empresas</button>
    `;
  } else if (rolUsuario === 'candidato') {
    const esMisPostulaciones = pantallaActual === 'P07' && seccionCuenta === 'postulaciones';
    const esMiPerfil = pantallaActual === 'P07' && seccionCuenta !== 'postulaciones';
    enlacesNav = `
      <button type="button" class="enlace-nav-superior ${pantallaActual === 'P30' ? 'activo' : ''}" data-seccion-cuenta="P30">Inicio</button>
      <button type="button" class="enlace-nav-superior ${['P01', 'P02', 'P03'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P01">Buscar empleos</button>
      <button type="button" class="enlace-nav-superior ${esMisPostulaciones ? 'activo' : ''}" data-accion-usuario="postulaciones-candidato">Mis postulaciones</button>
      <button type="button" class="enlace-nav-superior ${esMiPerfil ? 'activo' : ''}" data-seccion-cuenta="P07">Mi perfil</button>
      <button type="button" class="enlace-nav-superior ${['P17', 'P04'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P17">Recursos</button>
      <button type="button" class="enlace-nav-superior ${['P05', 'P28'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P05">Foros</button>
    `;
  } else if (rolUsuario === 'empresa') {
    enlacesNav = `
      <button type="button" class="enlace-nav-superior ${pantallaActual === 'P31' ? 'activo' : ''}" data-seccion-cuenta="P31">Inicio</button>
      <button type="button" class="enlace-nav-superior ${pantallaActual === 'P08' ? 'activo' : ''}" data-seccion-cuenta="P08">Mi empresa</button>
      <button type="button" class="enlace-nav-superior ${pantallaActual === 'P09' ? 'activo' : ''}" data-seccion-cuenta="P09">Publicar vacante</button>
      <button type="button" class="enlace-nav-superior ${pantallaActual === 'P10' ? 'activo' : ''}" data-seccion-cuenta="P10">Postulaciones</button>
      <button type="button" class="enlace-nav-superior ${['P01', 'P02', 'P03'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P01">Vacantes públicas</button>
      <button type="button" class="enlace-nav-superior ${['P17', 'P04'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P17">Recursos</button>
      <button type="button" class="enlace-nav-superior ${['P05', 'P28'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P05">Foros</button>
    `;
  } else if (rolUsuario === 'administrador') {
    enlacesNav = `
      <div class="nav-admin-grupo">
        <button type="button" class="enlace-nav-superior ${pantallaActual === 'P11' ? 'activo' : ''}" data-pantalla="P11">Resumen</button>
        <button type="button" class="enlace-nav-superior ${pantallaActual === 'P12' ? 'activo' : ''}" data-pantalla="P12">Usuarios</button>
        <button type="button" class="enlace-nav-superior ${pantallaActual === 'P13' ? 'activo' : ''}" data-pantalla="P13">Empresas${badge(conteosPendientes.empresas)}</button>
        <button type="button" class="enlace-nav-superior ${pantallaActual === 'P14' ? 'activo' : ''}" data-pantalla="P14">Vacantes${badge(conteosPendientes.vacantes)}</button>
        <button type="button" class="enlace-nav-superior ${pantallaActual === 'P15' ? 'activo' : ''}" data-pantalla="P15">Moderación${badge(conteosPendientes.moderacion)}</button>
        <button type="button" class="enlace-nav-superior ${pantallaActual === 'P19' ? 'activo' : ''}" data-pantalla="P19">Recursos</button>
        <button type="button" class="enlace-nav-superior ${['P05', 'P28'].includes(pantallaActual) ? 'activo' : ''}" data-pantalla="P05">Foros</button>
      </div>
    `;
  }
  const opcionesUsuario =
    rolUsuario === 'candidato'
      ? `
          <button type="button" role="menuitem" data-seccion-cuenta="P07">Mi perfil profesional</button>
          <button type="button" role="menuitem" data-accion-usuario="postulaciones-candidato">Mis postulaciones</button>
          <button type="button" role="menuitem" data-pantalla="P01">Buscar empleos</button>
          <button type="button" role="menuitem" data-pantalla="P17">Recursos laborales</button>
          <button type="button" role="menuitem" data-pantalla="P05">Foros comunitarios</button>
        `
      : rolUsuario === 'empresa'
        ? `
            <button type="button" role="menuitem" data-seccion-cuenta="P08">Mi empresa</button>
            <button type="button" role="menuitem" data-seccion-cuenta="P09">Publicar vacante</button>
            <button type="button" role="menuitem" data-seccion-cuenta="P10">Postulaciones recibidas</button>
            <button type="button" role="menuitem" data-pantalla="P01">Explorar empleos</button>
            <button type="button" role="menuitem" data-pantalla="P17">Recursos laborales</button>
            <button type="button" role="menuitem" data-pantalla="P05">Foros comunitarios</button>
          `
        : rolUsuario === 'administrador'
          ? `
              <button type="button" role="menuitem" data-pantalla="P11">Panel de control (Resumen)</button>
              <button type="button" role="menuitem" data-pantalla="P12">Gestión de usuarios</button>
              <button type="button" role="menuitem" data-pantalla="P13">Directorio de empresas</button>
              <button type="button" role="menuitem" data-pantalla="P14">Gestión de vacantes</button>
              <button type="button" role="menuitem" data-pantalla="P15">Moderación de contenidos</button>
              <button type="button" role="menuitem" data-pantalla="P19">Publicar recurso</button>
              <button type="button" role="menuitem" data-pantalla="P05">Foros de la comunidad</button>
            `
          : '';

  contenedor.innerHTML = `
    <div class="encabezado-interior">
      <div class="marca-navegacion">
        <button
          type="button"
          id="boton-menu-movil"
          class="boton-menu-movil"
          aria-label="Menú principal"
          aria-expanded="false"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <button
          type="button"
          id="boton-logo-inicio"
          class="boton-marca"
          title="Ir al inicio"
        >
          <img class="logo-marca" src="/multimedia/logo.png" alt="WorkConnect" />
        </button>
      </div>

      <nav id="navegacion-superior" class="navegacion-superior" aria-label="Navegación principal">
        ${enlacesNav}
      </nav>

      <div class="zona-usuario-encabezado">
        <button type="button" class="boton boton-tema" data-alternar-tema aria-label="Cambiar tema" aria-pressed="false">Modo oscuro</button>
        <div class="acciones-publicas-encabezado">
          ${
            usuario
              ? `
                <div class="menu-usuario-contenedor">
                  <button
                    type="button"
                    id="boton-menu-usuario"
                    class="perfil-usuario-activador"
                    aria-haspopup="menu"
                    aria-expanded="false"
                    aria-controls="menu-usuario"
                    aria-label="Abrir menú de ${nombreSeguro}"
                  >
                    ${avatarUsuario}
                    <span class="perfil-usuario-publico">
                      <strong>${nombreSeguro}</strong>
                      <small>${etiquetaRol}</small>
                    </span>
                    <svg class="icono-flecha-usuario" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  <div id="menu-usuario" class="menu-usuario" role="menu" aria-label="Opciones de usuario" hidden>
                    <div class="menu-usuario-cabecera">
                      <strong class="menu-usuario-nombre">${nombreSeguro}</strong>
                      <span class="menu-usuario-rol">${etiquetaRol}</span>
                    </div>
                    <div class="menu-usuario-separador"></div>
                    ${opcionesUsuario}
                    <div class="menu-usuario-separador"></div>
                    <button type="button" role="menuitem" class="opcion-cerrar-sesion">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.4rem; vertical-align:middle;">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              `
              : '<button type="button" class="boton-encabezado boton-ingresar">Ingresar</button><button type="button" class="boton-encabezado boton-registrarse">Registrarse</button>'
          }
        </div>
      </div>
    </div>
  `;

  const navegacionSuperior = contenedor.querySelector('#navegacion-superior');
  const botonMovil = contenedor.querySelector('#boton-menu-movil');

  if (botonMovil && navegacionSuperior) {
    botonMovil.addEventListener('click', () => {
      const abierto = navegacionSuperior.classList.toggle('abierto-movil');
      botonMovil.setAttribute('aria-expanded', String(abierto));
    });
  }

  const cerrarMenuMovil = () => {
    if (navegacionSuperior) navegacionSuperior.classList.remove('abierto-movil');
    if (botonMovil) botonMovil.setAttribute('aria-expanded', 'false');
  };

  const botonLogo = contenedor.querySelector('#boton-logo-inicio');
  if (botonLogo) {
    botonLogo.addEventListener('click', () => {
      cerrarMenuMovil();
      if (usuario && ['candidato', 'empresa'].includes(rolUsuario)) {
        alNavegarCuenta(rolUsuario === 'candidato' ? 'P30' : 'P31');
        return;
      }
      alCambiarPantalla('P01');
    });
  }
  contenedor.querySelectorAll('[data-pantalla]').forEach((boton) => {
    if (!boton.closest('#menu-usuario')) {
      boton.addEventListener('click', () => {
        cerrarMenuMovil();
        alCambiarPantalla(boton.dataset.pantalla);
      });
    }
  });
  contenedor.querySelectorAll('[data-seccion-cuenta]').forEach((boton) => {
    if (!boton.closest('#menu-usuario')) {
      boton.addEventListener('click', () => {
        cerrarMenuMovil();
        alNavegarCuenta(boton.dataset.seccionCuenta);
      });
    }
  });
  contenedor.querySelectorAll('[data-accion-usuario]').forEach((boton) => {
    if (!boton.closest('#menu-usuario')) {
      boton.addEventListener('click', () => {
        cerrarMenuMovil();
        if (boton.dataset.accionUsuario === 'postulaciones-candidato') {
          alNavegarCuenta('POSTULACIONES_CANDIDATO');
        }
      });
    }
  });

  const ingresar = contenedor.querySelector('.boton-ingresar');
  const registrarse = contenedor.querySelector('.boton-registrarse');
  if (ingresar) {
    ingresar.addEventListener('click', () => {
      cerrarMenuMovil();
      alCambiarPantalla('AUTH_LOGIN');
    });
  }
  if (registrarse) {
    registrarse.addEventListener('click', () => {
      cerrarMenuMovil();
      alCambiarPantalla('AUTH_REGISTRO');
    });
  }
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
    cerrarMenuMovil();
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
    } else if (opcion.dataset.pantalla) {
      alCambiarPantalla(opcion.dataset.pantalla);
    } else {
      alCambiarPantalla('CERRAR_SESION');
    }
  });

  const manejarClickExterno = (evento) => {
    if (!contenedor.contains(evento.target)) {
      cerrarMenu();
      cerrarMenuMovil();
    }
  };
  const manejarEnfoqueExterno = (evento) => {
    if (!contenedor.contains(evento.relatedTarget)) {
      cerrarMenu();
      cerrarMenuMovil();
    }
  };

  document.addEventListener('pointerdown', manejarClickExterno);
  contenedor.addEventListener('focusout', manejarEnfoqueExterno);
  limpiarMenuUsuarioAnterior = () => {
    document.removeEventListener('pointerdown', manejarClickExterno);
    contenedor.removeEventListener('focusout', manejarEnfoqueExterno);
  };
}
