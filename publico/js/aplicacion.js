import { renderizarEncabezado } from './componentes/encabezado.js';
import { renderizarMenuLateral } from './componentes/menuLateral.js';
import { renderizarP11Dashboard } from './pantallas/p11Dashboard.js';
import { renderizarP12Usuarios } from './pantallas/p12Usuarios.js';
import { renderizarP13Empresas } from './pantallas/p13Empresas.js';
import { renderizarP14Vacantes } from './pantallas/p14Vacantes.js';
import { renderizarP15Moderacion } from './pantallas/p15Moderacion.js';
import { renderizarP16VerificacionEmpresas } from './pantallas/p16VerificacionEmpresas.js';
import { renderizarP19CrearRecurso } from './pantallas/p19CrearRecurso.js';
import { escaparHtml } from './utilidades/formato.js';

// Estado global de la aplicación en JavaScript puro
const estadoAplicacion = {
  pantallaActual: 'P11',
  datos: null,
  temporizadorNotificacion: null
};

const contenedorEncabezado = document.getElementById('encabezado-principal');
const contenedorMenuLateral = document.getElementById('menu-lateral');
const contenedorContenido = document.getElementById('area-contenido');
const notificacionElemento = document.getElementById('notificacion-flotante');
const notificacionTexto = document.getElementById('notificacion-texto');

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

async function solicitarApi(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones
  });

  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(cuerpo.error || 'Error al comunicarse con el servidor.');
    error.requiereConfiguracion = Boolean(cuerpo.requiereConfiguracion);
    error.urlSupabase = cuerpo.urlSupabase || '';
    throw error;
  }

  return cuerpo;
}

function cambiarPantalla(nuevaPantalla) {
  estadoAplicacion.pantallaActual = nuevaPantalla;
  renderizarInterfaz();
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
    mostrarNotificacion(`Usuario "${guardado.nombre}" actualizado en Supabase.`);
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
    mostrarNotificacion(`Vacante "${guardada.titulo}" actualizada en Supabase.`);
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
    mostrarNotificacion('Elemento eliminado de Supabase.');
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
    mostrarNotificacion(`Recurso "${creado.titulo}" guardado en Supabase.`);
    renderizarInterfaz();
  }
};

function renderizarInterfaz() {
  if (!estadoAplicacion.datos) return;

  renderizarEncabezado(contenedorEncabezado, cambiarPantalla);
  renderizarMenuLateral(
    contenedorMenuLateral,
    estadoAplicacion.pantallaActual,
    calcularPendientes(estadoAplicacion.datos),
    cambiarPantalla
  );

  switch (estadoAplicacion.pantallaActual) {
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
  renderizarEncabezado(contenedorEncabezado, cambiarPantalla);
  renderizarMenuLateral(
    contenedorMenuLateral,
    estadoAplicacion.pantallaActual,
    { empresas: 0, vacantes: 0, moderacion: 0, verificaciones: 0 },
    cambiarPantalla
  );

  try {
    estadoAplicacion.datos = await solicitarApi('/api/datos');
    renderizarInterfaz();
  } catch (error) {
    if (error.requiereConfiguracion) {
      contenedorContenido.innerHTML = `
        <div class="tarjeta tarjeta-espaciado pila-compacta">
          <div>
            <span class="codigo-pantalla">CONEXIÓN SUPABASE</span>
            <h2 class="titulo-pantalla" style="font-size:1.25rem;">Configura las variables de entorno</h2>
            <p class="subtitulo-pantalla">
              El servidor Node.js apunta al proyecto <strong>${escaparHtml(error.urlSupabase)}</strong>,
              pero falta la variable de entorno <code class="texto-mono">SUPABASE_SERVICE_ROLE_KEY</code>.
            </p>
          </div>
          <div class="caja-dato-modal" style="background:#f8fafc; padding:0.875rem;">
            <p style="margin:0; font-size:0.75rem; color:#334155;">
              1. Configura <code class="texto-mono">SUPABASE_SERVICE_ROLE_KEY</code> en el archivo <code class="texto-mono">.env</code> local o en las variables de entorno de tu servidor.<br />
              2. Opcionalmente define <code class="texto-mono">SUPABASE_URL</code> con <code class="texto-mono">https://nrglhwctftjfvflopppo.supabase.co</code>.<br />
              3. Reinicia o recarga la aplicación para consultar tus tablas.
            </p>
          </div>
        </div>
      `;
      return;
    }

    contenedorContenido.innerHTML = `
      <div class="tarjeta-estado-carga" style="color:#be123c;">
        Error al cargar los datos desde Supabase: ${escaparHtml(error.message)}
      </div>
    `;
  }
}

iniciarAplicacion();
