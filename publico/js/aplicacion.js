import { renderizarEncabezado } from './componentes/encabezado.js';
import { renderizarP11Dashboard } from './pantallas/p11Dashboard.js';
import { renderizarP12Usuarios } from './pantallas/p12Usuarios.js';
import { renderizarP13Empresas } from './pantallas/p13Empresas.js';
import { renderizarP14Vacantes } from './pantallas/p14Vacantes.js';
import { renderizarP15Moderacion } from './pantallas/p15Moderacion.js';
import { renderizarP16VerificacionEmpresas } from './pantallas/p16VerificacionEmpresas.js';
import { renderizarP19CrearRecurso } from './pantallas/p19CrearRecurso.js';
import { renderizarP01Inicio } from './pantallas/p01Inicio.js';
import { renderizarP02Resultados } from './pantallas/p02Resultados.js';
import { renderizarP03Detalle } from './pantallas/p03Detalle.js';
import { renderizarP04Recursos } from './pantallas/p04Recursos.js';
import { renderizarP05Foros } from './pantallas/p05Foros.js';
import { renderizarP28CrearTema } from './pantallas/p28CrearTema.js';
import { renderizarAutenticacion } from './componentes/autenticacion.js';
import { renderizarCuentaIntegrada } from './componentes/miPerfil.js';
import { escaparHtml } from './utilidades/formato.js';

// Estado global de la aplicación en JavaScript puro
const parametrosIniciales = new URLSearchParams(window.location.search);
const accesoSolicitado = parametrosIniciales.get('acceso') === 'login';
const vacanteSolicitada = parametrosIniciales.get('vacante');
const idVacanteInicial = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vacanteSolicitada || '') ? vacanteSolicitada : null;
const destinosCuentaPermitidos = {
  P07: { pantalla: 'P07', rol: 'candidato' },
  POSTULACIONES_CANDIDATO: { pantalla: 'P07', rol: 'candidato', seccion: 'postulaciones' },
  P08: { pantalla: 'P08', rol: 'empresa' },
  P09: { pantalla: 'P09', rol: 'empresa' },
  P10: { pantalla: 'P10', rol: 'empresa' }
};
const destinoSolicitado = destinosCuentaPermitidos[
  new URLSearchParams(window.location.search).get('destino')
];

const estadoAplicacion = {
  pantallaActual:
    accesoSolicitado ? 'AUTH_LOGIN' : idVacanteInicial ? 'P03' : 'P01',
  vacanteSeleccionada: idVacanteInicial,
  rolActual: 'visitante',
  usuarioActual: null,
  pantallaPendiente: null,
  destinoCuentaPendiente: accesoSolicitado ? destinoSolicitado || null : null,
  datos: null,
  temporizadorNotificacion: null
};

const contenedorEncabezado = document.getElementById('encabezado-principal');
const contenedorContenido = document.getElementById('area-contenido');
const notificacionElemento = document.getElementById('notificacion-flotante');
const notificacionTexto = document.getElementById('notificacion-texto');

document.querySelectorAll('[data-pie-pantalla]').forEach((enlace) => {
  enlace.addEventListener('click', (evento) => {
    evento.preventDefault();
    cambiarPantalla(enlace.dataset.piePantalla);
  });
});

document.querySelectorAll('[data-pie-cuenta]').forEach((enlace) => {
  enlace.addEventListener('click', (evento) => {
    evento.preventDefault();
    navegarASeccionCuenta(enlace.dataset.pieCuenta);
  });
});

function mostrarNotificacion(mensaje) {
  if (!notificacionElemento || !notificacionTexto) return;
  notificacionTexto.textContent = mensaje;
  notificacionElemento.classList.remove('oculto');

  if (estadoAplicacion.temporizadorNotificacion) {
    clearTimeout(estadoAplicacion.temporizadorNotificacion);
  }

  estadoAplicacion.temporizadorNotificacion = setTimeout(() => {
    notificacionElemento.classList.add('oculto');
  }, 3200);
}

function navegarASeccionCuenta(pantalla) {
  const destino = pantalla === 'POSTULACIONES_CANDIDATO'
    ? { pantalla: 'P07', rol: 'candidato', seccion: 'postulaciones' }
    : pantalla === 'P07'
      ? { pantalla: 'P07', rol: 'candidato', seccion: 'perfil' }
      : { pantalla, rol: { P07: 'candidato', P08: 'empresa', P09: 'empresa', P10: 'empresa' }[pantalla] };
  const rolRequerido = destino.rol;
  if (!rolRequerido) {
    mostrarNotificacion('No se pudo identificar la sección solicitada.');
    return;
  }

  if (!estadoAplicacion.usuarioActual) {
    estadoAplicacion.pantallaPendiente = null;
    estadoAplicacion.destinoCuentaPendiente = destino;
    estadoAplicacion.pantallaActual = 'AUTH_LOGIN';
    renderizarInterfaz();
    return;
  }

  if (estadoAplicacion.usuarioActual.rol !== rolRequerido) {
    const nombreRol = rolRequerido === 'candidato' ? 'candidato' : 'empresa';
    mostrarNotificacion(`Esta sección es para cuentas de ${nombreRol}. Ingresa con el rol correcto.`);
    return;
  }

  redireccionarDestinoCuenta(destino);
}

function redireccionarDestinoCuenta(destino) {
  estadoAplicacion.pantallaActual = destino.pantalla;
  estadoAplicacion.seccionCuenta = destino.seccion || null;
  renderizarInterfaz();
}

function redireccionarAlPortalSegunRol(usuario) {
  const destinos = {
    candidato: { pantalla: 'P07', rol: 'candidato' },
    empresa: { pantalla: 'P08', rol: 'empresa' }
  };
  const destino = destinos[usuario.rol];
  if (destino) {
    redireccionarDestinoCuenta(destino);
    return true;
  }

  estadoAplicacion.destinoCuentaPendiente = null;
  estadoAplicacion.pantallaPendiente = null;
  estadoAplicacion.pantallaActual = usuario.rol === 'administrador' ? 'P11' : 'P01';
  return false;
}

async function solicitarApi(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  });

  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(cuerpo.error || 'Error al comunicarse con el servidor.');
    error.status = respuesta.status;
    error.requiereConfiguracion = Boolean(cuerpo.requiereConfiguracion);
    error.urlSupabase = cuerpo.urlSupabase || '';
    throw error;
  }

  return cuerpo;
}

function cambiarPantalla(nuevaPantalla, idVacante = null, nuevoRol = estadoAplicacion.rolActual) {
  if (nuevaPantalla === 'AUTH_REGISTRO_EMPRESA') {
    estadoAplicacion.rolRegistro = 'empresa';
    nuevaPantalla = 'AUTH_REGISTRO';
  } else if (nuevaPantalla === 'AUTH_REGISTRO') {
    estadoAplicacion.rolRegistro = nuevoRol === 'empresa' ? 'empresa' : 'candidato';
  }

  if (
    ['AUTH_LOGIN', 'AUTH_REGISTRO'].includes(nuevaPantalla) &&
    estadoAplicacion.usuarioActual
  ) {
    const destinoPendiente = estadoAplicacion.destinoCuentaPendiente;
    if (destinoPendiente?.rol === estadoAplicacion.usuarioActual.rol) {
      estadoAplicacion.destinoCuentaPendiente = null;
      redireccionarDestinoCuenta(destinoPendiente);
      return;
    }
    if (!redireccionarAlPortalSegunRol(estadoAplicacion.usuarioActual)) renderizarInterfaz();
    return;
  }

  const pantallasProtegidas = ['P28', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P19'];
  const permisos = {
    P28: ['candidato', 'administrador', 'empresa'],
    P11: ['administrador'],
    P12: ['administrador'],
    P13: ['administrador'],
    P14: ['administrador'],
    P15: ['administrador'],
    P16: ['administrador'],
    P19: ['administrador']
  };
  if (pantallasProtegidas.includes(nuevaPantalla) && !estadoAplicacion.usuarioActual) {
    estadoAplicacion.pantallaPendiente = nuevaPantalla;
    estadoAplicacion.pantallaActual = 'AUTH_LOGIN';
    renderizarInterfaz();
    return;
  }
  if (
    permisos[nuevaPantalla] &&
    estadoAplicacion.usuarioActual &&
    !permisos[nuevaPantalla].includes(estadoAplicacion.usuarioActual.rol)
  ) {
    mostrarNotificacion('Tu cuenta no tiene permisos para acceder a esta sección.');
    return;
  }
  if (nuevaPantalla === 'CERRAR_SESION') {
    solicitarApi('/api/auth/logout', { method: 'POST' }).catch((error) => {
      mostrarNotificacion(error.message || 'No se pudo cerrar completamente la sesión.');
    });
    estadoAplicacion.usuarioActual = null;
    estadoAplicacion.rolActual = 'visitante';
    estadoAplicacion.pantallaActual = 'P01';
    renderizarInterfaz();
    return;
  }
  estadoAplicacion.rolActual = nuevoRol;
  if (estadoAplicacion.usuarioActual) {
    estadoAplicacion.rolActual = estadoAplicacion.usuarioActual.rol;
  }
  estadoAplicacion.pantallaActual = nuevaPantalla;
  estadoAplicacion.vacanteSeleccionada = idVacante;
  renderizarInterfaz();
}

function datosPublicosVacios() {
  return {
    usuarios: [], empresas: [], vacantes: [], elementosModeracion: [], solicitudesVerificacion: [],
    recursosLaborales: [], estadisticasDashboard: {
      totalPostulaciones: 0, contrataciones: 0, postulacionesPorMes: [], postulacionesPorEstado: [], vacantesPorSector: []
    }
  };
}

function calcularPendientes(datos) {
  return {
    empresas: datos.empresas.filter((e) => e.estado === 'Pendiente').length,
    vacantes: datos.vacantes.filter((v) => v.estado === 'Pendiente').length,
    moderacion: datos.elementosModeracion.filter((m) => m.estado === 'Pendiente').length,
    verificaciones: datos.solicitudesVerificacion.filter((s) => s.estado === 'Pendiente').length
  };
}

// Acciones conectadas directamente con Supabase a través del servidor Node.js
const accionesPanel = {
  async alActualizarUsuario(usuarioActualizado) {
    const guardado = await solicitarApi(`/api/usuarios/${usuarioActualizado.id}`, {
      method: 'PUT',
      body: JSON.stringify(usuarioActualizado)
    });
    estadoAplicacion.datos.usuarios = estadoAplicacion.datos.usuarios.map((u) =>
      u.id === guardado.id ? guardado : u
    );
    mostrarNotificacion(`Usuario "${guardado.nombre}" actualizado.`);
    renderizarInterfaz();
  },

  async alAlternarEstadoUsuario(id) {
    const actualizado = await solicitarApi(`/api/usuarios/${id}/estado`, {
      method: 'PATCH'
    });
    estadoAplicacion.datos.usuarios = estadoAplicacion.datos.usuarios.map((u) =>
      u.id === actualizado.id ? actualizado : u
    );
    mostrarNotificacion(`Estado de "${actualizado.nombre}" cambiado a ${actualizado.estado}.`);
    renderizarInterfaz();
  },

  async alCambiarEstadoEmpresa(id, nuevoEstado) {
    const actualizada = await solicitarApi(`/api/empresas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado })
    });
    estadoAplicacion.datos.empresas = estadoAplicacion.datos.empresas.map((e) =>
      e.id === actualizada.id ? actualizada : e
    );
    mostrarNotificacion(`Empresa "${actualizada.nombreComercial}" marcada como ${nuevoEstado}.`);
    renderizarInterfaz();
  },

  async alActualizarVacante(vacanteActualizada) {
    const guardada = await solicitarApi(`/api/vacantes/${vacanteActualizada.id}`, {
      method: 'PUT',
      body: JSON.stringify(vacanteActualizada)
    });
    estadoAplicacion.datos.vacantes = estadoAplicacion.datos.vacantes.map((v) =>
      v.id === guardada.id ? guardada : v
    );
    mostrarNotificacion(`Vacante "${guardada.titulo}" actualizada.`);
    renderizarInterfaz();
  },

  async alCambiarEstadoVacante(id, nuevoEstado) {
    const actualizada = await solicitarApi(`/api/vacantes/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado })
    });
    estadoAplicacion.datos.vacantes = estadoAplicacion.datos.vacantes.map((v) =>
      v.id === actualizada.id ? actualizada : v
    );
    mostrarNotificacion(`Vacante "${actualizada.titulo}" marcada como ${nuevoEstado}.`);
    renderizarInterfaz();
  },

  async alActualizarEstadoModeracion(id, nuevoEstado) {
    const actualizado = await solicitarApi(`/api/moderacion/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado })
    });
    estadoAplicacion.datos.elementosModeracion = estadoAplicacion.datos.elementosModeracion.map((m) =>
      m.id === actualizado.id ? actualizado : m
    );
    mostrarNotificacion(`Elemento marcado como ${nuevoEstado}.`);
    renderizarInterfaz();
  },

  async alEliminarElementoModeracion(id) {
    await solicitarApi(`/api/moderacion/${id}`, {
      method: 'DELETE'
    });
    estadoAplicacion.datos.elementosModeracion = estadoAplicacion.datos.elementosModeracion.filter(
      (m) => m.id !== id
    );
    mostrarNotificacion('Elemento eliminado.');
    renderizarInterfaz();
  },

  async alCambiarEstadoSolicitud(id, nuevoEstado, observaciones, criterios) {
    const resultado = await solicitarApi(`/api/verificaciones/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado, observaciones, criterios })
    });

    const solicitudActualizada = resultado.solicitud;
    estadoAplicacion.datos.solicitudesVerificacion =
      estadoAplicacion.datos.solicitudesVerificacion.map((s) =>
        s.id === solicitudActualizada.id ? solicitudActualizada : s
      );
    estadoAplicacion.datos.empresas = resultado.empresas;

    if (nuevoEstado === 'Aprobada') {
      mostrarNotificacion(
        `¡Empresa "${solicitudActualizada.nombreComercial}" aprobada con sello Verificada!`
      );
    } else {
      mostrarNotificacion(
        `Solicitud de "${solicitudActualizada.nombreComercial}" marcada como ${nuevoEstado}.`
      );
    }
    renderizarInterfaz();
  },

  async alCrearRecurso(nuevoRecurso) {
    const creado = await solicitarApi('/api/recursos', {
      method: 'POST',
      body: JSON.stringify(nuevoRecurso)
    });
    estadoAplicacion.datos.recursosLaborales.unshift(creado);
    mostrarNotificacion(`Recurso "${creado.titulo}" guardado.`);
    renderizarInterfaz();
  }
};

function completarAutenticacion(cuenta) {
  estadoAplicacion.usuarioActual = cuenta;
  estadoAplicacion.rolActual = cuenta.rol;
  mostrarNotificacion('Sesión iniciada correctamente.');

  if (estadoAplicacion.destinoCuentaPendiente) {
    const destino = estadoAplicacion.destinoCuentaPendiente;
    estadoAplicacion.destinoCuentaPendiente = null;
    if (cuenta.rol !== destino.rol) {
      estadoAplicacion.pantallaActual = 'P01';
      renderizarInterfaz();
      mostrarNotificacion(
        `Tu cuenta es de ${cuenta.rol === 'candidato' ? 'candidato' : 'empresa'} y no puede abrir esta sección.`
      );
      return;
    }
    redireccionarDestinoCuenta(destino);
    return;
  }

  estadoAplicacion.pantallaActual =
    estadoAplicacion.pantallaPendiente ||
    (cuenta.rol === 'administrador'
      ? 'P11'
      : cuenta.rol === 'empresa'
        ? 'P08'
        : 'P01');
  estadoAplicacion.pantallaPendiente = null;
  renderizarInterfaz();

  // Actualizar datos del portal en segundo plano para sincronizar la nueva cuenta/empresa
  solicitarApi('/api/datos')
    .then((datosFrescos) => {
      estadoAplicacion.datos = datosFrescos;
      renderizarInterfaz();
    })
    .catch(() => {});
}

function renderizarInterfaz() {
  if (!estadoAplicacion.datos) return;

  document.body.classList.toggle(
    'modo-publico',
    !['P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P19'].includes(estadoAplicacion.pantallaActual)
  );
  document.body.classList.toggle(
    'modo-autenticado',
    Boolean(estadoAplicacion.usuarioActual) && !['AUTH_LOGIN', 'AUTH_REGISTRO'].includes(estadoAplicacion.pantallaActual)
  );
  document.body.classList.toggle('modo-inicio', estadoAplicacion.pantallaActual === 'P01');
  document.body.classList.toggle('modo-autenticacion', ['AUTH_LOGIN', 'AUTH_REGISTRO'].includes(estadoAplicacion.pantallaActual));
  document.body.classList.toggle(
    'modo-cuenta',
    ['P07', 'P08', 'P09', 'P10'].includes(estadoAplicacion.pantallaActual)
  );
  renderizarEncabezado(
    contenedorEncabezado,
    cambiarPantalla,
    estadoAplicacion.rolActual,
    estadoAplicacion.usuarioActual,
    navegarASeccionCuenta,
    estadoAplicacion.pantallaActual,
    calcularPendientes(estadoAplicacion.datos),
    estadoAplicacion.seccionCuenta
  );

  switch (estadoAplicacion.pantallaActual) {
    case 'AUTH_LOGIN':
      renderizarAutenticacion(
        contenedorContenido,
        'login',
        completarAutenticacion,
        () => cambiarPantalla('P01')
      );
      break;
    case 'AUTH_REGISTRO':
      renderizarAutenticacion(
        contenedorContenido,
        'registro',
        completarAutenticacion,
        () => cambiarPantalla('P01'),
        estadoAplicacion.rolRegistro || 'candidato'
      );
      break;
    case 'P01':
      renderizarP01Inicio(
        contenedorContenido,
        estadoAplicacion.datos,
        cambiarPantalla,
        (termino, ubicacion) =>
          renderizarP02Resultados(
            contenedorContenido,
            estadoAplicacion.datos,
            termino,
            ubicacion,
            cambiarPantalla
          ),
        estadoAplicacion.rolActual,
        estadoAplicacion.usuarioActual
      );
      break;
    case 'P02':
      renderizarP02Resultados(contenedorContenido, estadoAplicacion.datos, '', '', cambiarPantalla);
      break;
    case 'P03':
      renderizarP03Detalle(contenedorContenido, estadoAplicacion.datos, estadoAplicacion.vacanteSeleccionada, cambiarPantalla, mostrarNotificacion, estadoAplicacion.usuarioActual);
      break;
    case 'P04':
      renderizarP04Recursos(contenedorContenido, estadoAplicacion.datos);
      break;
    case 'P05':
      renderizarP05Foros(contenedorContenido, cambiarPantalla, estadoAplicacion.rolActual, mostrarNotificacion);
      break;
    case 'P07':
    case 'P08':
    case 'P09':
    case 'P10':
      renderizarCuentaIntegrada(
        contenedorContenido,
        document.querySelector('#navegacion-cuenta-integrada'),
        estadoAplicacion.pantallaActual,
        estadoAplicacion.seccionCuenta,
        estadoAplicacion.usuarioActual,
        cambiarPantalla,
        (nuevaSeccion) => {
          estadoAplicacion.seccionCuenta = nuevaSeccion;
          renderizarEncabezado(
            contenedorEncabezado,
            cambiarPantalla,
            estadoAplicacion.rolActual,
            estadoAplicacion.usuarioActual,
            navegarASeccionCuenta,
            estadoAplicacion.pantallaActual,
            calcularPendientes(estadoAplicacion.datos),
            estadoAplicacion.seccionCuenta
          );
        }
      );
      break;
    case 'P17':
      renderizarP04Recursos(contenedorContenido, estadoAplicacion.datos, 'Recursos laborales publicados');
      break;
    case 'P28':
      renderizarP28CrearTema(contenedorContenido, cambiarPantalla, mostrarNotificacion);
      break;
    case 'P11':
      renderizarP11Dashboard(contenedorContenido, estadoAplicacion.datos, cambiarPantalla);
      break;
    case 'P12':
      renderizarP12Usuarios(contenedorContenido, estadoAplicacion.datos.usuarios, accionesPanel);
      break;
    case 'P13':
      renderizarP13Empresas(contenedorContenido, estadoAplicacion.datos.empresas, accionesPanel);
      break;
    case 'P14':
      renderizarP14Vacantes(contenedorContenido, estadoAplicacion.datos.vacantes, accionesPanel);
      break;
    case 'P15':
      renderizarP15Moderacion(
        contenedorContenido,
        estadoAplicacion.datos.elementosModeracion,
        accionesPanel
      );
      break;
    case 'P16':
      renderizarP16VerificacionEmpresas(
        contenedorContenido,
        estadoAplicacion.datos.solicitudesVerificacion,
        accionesPanel
      );
      break;
    case 'P19':
      renderizarP19CrearRecurso(
        contenedorContenido,
        estadoAplicacion.datos.recursosLaborales,
        accionesPanel
      );
      break;
    default:
      renderizarP11Dashboard(contenedorContenido, estadoAplicacion.datos, cambiarPantalla);
  }
}

async function iniciarAplicacion() {
  renderizarEncabezado(
    contenedorEncabezado,
    cambiarPantalla,
    estadoAplicacion.rolActual,
    null,
    navegarASeccionCuenta,
    estadoAplicacion.pantallaActual,
    { empresas: 0, vacantes: 0, moderacion: 0, verificaciones: 0 }
  );

  try {
    const sesion = await solicitarApi('/api/auth/sesion');
    if (sesion.autenticado) {
      estadoAplicacion.usuarioActual = sesion.usuario;
      estadoAplicacion.rolActual = sesion.usuario.rol;
      if (['AUTH_LOGIN', 'AUTH_REGISTRO'].includes(estadoAplicacion.pantallaActual)) {
        const destinoPendiente = estadoAplicacion.destinoCuentaPendiente;
        if (destinoPendiente?.rol === sesion.usuario.rol) {
          estadoAplicacion.destinoCuentaPendiente = null;
          redireccionarDestinoCuenta(destinoPendiente);
        } else {
          redireccionarAlPortalSegunRol(sesion.usuario);
        }
      }
    }
  } catch (error) {
    if (error.status !== 401) {
      estadoAplicacion.datos = datosPublicosVacios();
      renderizarInterfaz();
      contenedorContenido.innerHTML = `
        <div class="tarjeta-estado-carga" style="color:#be123c;">
          No se pudo verificar la sesión. Intenta nuevamente.
        </div>
      `;
      return;
    }
  }

  try {
    estadoAplicacion.datos = await solicitarApi('/api/datos');
    renderizarInterfaz();
  } catch (error) {
    estadoAplicacion.datos = datosPublicosVacios();
    renderizarInterfaz();
    if (error.requiereConfiguracion) {
      mostrarNotificacion('No se pudieron cargar los datos. Intenta nuevamente.');
      return;
    }

    contenedorContenido.innerHTML = `
      <div class="tarjeta-estado-carga" style="color:#be123c;">
        No se pudieron cargar los datos. Intenta nuevamente.
      </div>
    `;
  }
}

iniciarAplicacion();
