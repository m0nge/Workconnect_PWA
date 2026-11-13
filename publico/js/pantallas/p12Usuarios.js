import { escaparHtml, iconoBusquedaSvg } from '../utilidades/formato.js';
import { abrirModal } from '../componentes/modal.js';

const estadoFiltrosUsuarios = {
  terminoBusqueda: '',
  filtroRol: 'Todos los roles',
  filtroEstado: 'Todos los estados'
};

export function renderizarP12Usuarios(contenedor, usuarios, acciones) {
  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <span class="codigo-pantalla">P12 ADMINISTRACIÓN</span>
        <h1 class="titulo-pantalla">Usuarios</h1>
        <p class="subtitulo-pantalla">
          Busca cuentas, revisa sus datos y activa o desactiva el acceso.
        </p>
      </div>

      <div class="tarjeta tarjeta-filtro">
        <div class="cuadricula-filtros-3">
          <div class="campo-busqueda-envoltura">
            <input
              type="text"
              id="busqueda-usuarios"
              class="campo-texto con-icono"
              placeholder="Buscar por nombre o correo"
              value="${escaparHtml(estadoFiltrosUsuarios.terminoBusqueda)}"
            />
            ${iconoBusquedaSvg()}
          </div>

          <div>
            <select id="filtro-rol-usuarios" class="campo-select">
              <option value="Todos los roles">Todos los roles</option>
              <option value="Candidato/a">Candidato/a</option>
              <option value="Empresa">Empresa</option>
              <option value="Administración/a">Administración/a</option>
            </select>
          </div>

          <div>
            <select id="filtro-estado-usuarios" class="campo-select">
              <option value="Todos los estados">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <div id="resumen-filtros-usuarios" class="resumen-filtros"></div>
      </div>

      <div class="contenedor-tabla">
        <div class="desplazamiento-tabla">
          <table class="tabla-datos">
            <thead>
              <tr>
                <th>USUARIO</th>
                <th>ROL</th>
                <th>REGISTRO</th>
                <th>ESTADO</th>
                <th class="texto-derecha">ACCIONES</th>
              </tr>
            </thead>
            <tbody id="cuerpo-tabla-usuarios"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const inputBusqueda = contenedor.querySelector('#busqueda-usuarios');
  const selectRol = contenedor.querySelector('#filtro-rol-usuarios');
  const selectEstado = contenedor.querySelector('#filtro-estado-usuarios');
  const resumenFiltros = contenedor.querySelector('#resumen-filtros-usuarios');
  const cuerpoTabla = contenedor.querySelector('#cuerpo-tabla-usuarios');

  selectRol.value = estadoFiltrosUsuarios.filtroRol;
  selectEstado.value = estadoFiltrosUsuarios.filtroEstado;

  const actualizarTabla = () => {
    const texto = estadoFiltrosUsuarios.terminoBusqueda.trim().toLowerCase();
    const filtrados = usuarios.filter((usuario) => {
      const coincideTexto =
        usuario.nombre.toLowerCase().includes(texto) ||
        usuario.correo.toLowerCase().includes(texto);
      const coincideRol =
        estadoFiltrosUsuarios.filtroRol === 'Todos los roles' ||
        usuario.rol === estadoFiltrosUsuarios.filtroRol;
      const coincideEstado =
        estadoFiltrosUsuarios.filtroEstado === 'Todos los estados' ||
        usuario.estado === estadoFiltrosUsuarios.filtroEstado;
      return coincideTexto && coincideRol && coincideEstado;
    });

    const hayFiltros =
      Boolean(estadoFiltrosUsuarios.terminoBusqueda) ||
      estadoFiltrosUsuarios.filtroRol !== 'Todos los roles' ||
      estadoFiltrosUsuarios.filtroEstado !== 'Todos los estados';

    resumenFiltros.innerHTML = `
      <span>
        Mostrando <strong style="color:#1e293b;">${filtrados.length}</strong> de ${usuarios.length} cuentas
      </span>
      ${
        hayFiltros
          ? '<button type="button" id="limpiar-filtros-usuarios" class="boton-limpiar-filtros">Limpiar filtros</button>'
          : ''
      }
    `;

    const botonLimpiar = resumenFiltros.querySelector('#limpiar-filtros-usuarios');
    if (botonLimpiar) {
      botonLimpiar.addEventListener('click', () => {
        estadoFiltrosUsuarios.terminoBusqueda = '';
        estadoFiltrosUsuarios.filtroRol = 'Todos los roles';
        estadoFiltrosUsuarios.filtroEstado = 'Todos los estados';
        inputBusqueda.value = '';
        selectRol.value = 'Todos los roles';
        selectEstado.value = 'Todos los estados';
        actualizarTabla();
      });
    }

    if (filtrados.length === 0) {
      cuerpoTabla.innerHTML = `
        <tr>
          <td colspan="5" class="celda-vacia">
            No se encontraron usuarios que coincidan con la búsqueda.
          </td>
        </tr>
      `;
      return;
    }

    cuerpoTabla.innerHTML = filtrados
      .map(
        (usuario) => `
          <tr>
            <td>
              <div class="celda-identidad">
                <div class="avatar-circular">${escaparHtml(usuario.iniciales)}</div>
                <div>
                  <p class="titulo-fila">${escaparHtml(usuario.nombre)}</p>
                  <p class="subtitulo-fila">${escaparHtml(usuario.correo)}</p>
                </div>
              </div>
            </td>
            <td style="color:#334155; font-weight:500;">${escaparHtml(usuario.rol)}</td>
            <td class="texto-mono" style="color:#475569; font-size:11px;">
              ${escaparHtml(usuario.fechaRegistro)}
            </td>
            <td>
              <span class="etiqueta-estado ${usuario.estado === 'Activo' ? 'verde' : 'neutro'}">
                ${usuario.estado === 'Activo' ? '✓ ' : ''}${escaparHtml(usuario.estado)}
              </span>
            </td>
            <td class="texto-derecha">
              <div class="grupo-acciones">
                <button type="button" class="boton" data-ver="${escaparHtml(usuario.id)}">Ver</button>
                <button type="button" class="boton" data-editar="${escaparHtml(usuario.id)}">Editar</button>
                <button
                  type="button"
                  class="boton ${usuario.estado === 'Activo' ? 'boton-peligro' : 'boton-exito'}"
                  data-estado="${escaparHtml(usuario.id)}"
                >
                  ${usuario.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join('');

    cuerpoTabla.querySelectorAll('[data-ver]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const usuario = usuarios.find((u) => u.id === boton.getAttribute('data-ver'));
        if (usuario) abrirModalDetalleUsuario(usuario);
      });
    });

    cuerpoTabla.querySelectorAll('[data-editar]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const usuario = usuarios.find((u) => u.id === boton.getAttribute('data-editar'));
        if (usuario) abrirModalEditarUsuario(usuario, acciones.alActualizarUsuario);
      });
    });

    cuerpoTabla.querySelectorAll('[data-estado]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const id = boton.getAttribute('data-estado');
        if (id) acciones.alAlternarEstadoUsuario(id);
      });
    });
  };

  inputBusqueda.addEventListener('input', (e) => {
    estadoFiltrosUsuarios.terminoBusqueda = e.target.value;
    actualizarTabla();
  });

  selectRol.addEventListener('change', (e) => {
    estadoFiltrosUsuarios.filtroRol = e.target.value;
    actualizarTabla();
  });

  selectEstado.addEventListener('change', (e) => {
    estadoFiltrosUsuarios.filtroEstado = e.target.value;
    actualizarTabla();
  });

  actualizarTabla();
}

function abrirModalDetalleUsuario(usuario) {
  abrirModal({
    titulo: 'Ficha de usuario',
    subtitulo: 'Detalles completos registrados en el portal',
    contenidoHtml: `
      <div class="pila-compacta">
        <div class="caja-resumen-modal" style="justify-content:flex-start;">
          <div class="avatar-circular grande">${escaparHtml(usuario.iniciales)}</div>
          <div>
            <h4 style="margin:0; font-weight:700; font-size:0.875rem; color:#0f172a;">
              ${escaparHtml(usuario.nombre)}
            </h4>
            <p style="margin:0.1rem 0 0; font-size:0.75rem; color:#475569;">
              ${escaparHtml(usuario.correo)}
            </p>
            <span style="font-size:10px; color:#64748b; font-weight:500;">
              ID: ${escaparHtml(usuario.id)}
            </span>
          </div>
        </div>

        <div class="cuadricula-campos-2">
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Rol</span>
            <strong style="color:#1e293b;">${escaparHtml(usuario.rol)}</strong>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Estado</span>
            <strong style="color:${usuario.estado === 'Activo' ? '#047857' : '#475569'};">
              ${escaparHtml(usuario.estado)}
            </strong>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Teléfono</span>
            <span class="texto-mono">${escaparHtml(usuario.telefono || 'No registrado')}</span>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Fecha de registro</span>
            <span class="texto-mono">${escaparHtml(usuario.fechaRegistro)}</span>
          </div>
        </div>

        <div class="caja-dato-modal">
          <span class="dato-etiqueta">Ubicación</span>
          <span>${escaparHtml(usuario.ubicacion || 'El Salvador')}</span>
        </div>

        <div class="pie-modal derecha">
          <button type="button" id="cerrar-detalle-usuario" class="boton boton-mediano boton-neutro">
            Cerrar
          </button>
        </div>
      </div>
    `,
    alMontar: (cuerpo, cerrar) => {
      cuerpo.querySelector('#cerrar-detalle-usuario').addEventListener('click', cerrar);
    }
  });
}

function abrirModalEditarUsuario(usuario, alActualizarUsuario) {
  abrirModal({
    titulo: 'Editar usuario',
    subtitulo: 'Modifica los datos del usuario en el sistema',
    contenidoHtml: `
      <form id="formulario-editar-usuario" class="pila-compacta" novalidate>
        <div id="error-editar-usuario" class="alerta-error-formulario oculto"></div>

        <div>
          <label class="etiqueta-campo" for="campo-nombre-usuario">Nombre *</label>
          <input
            id="campo-nombre-usuario"
            type="text"
            class="campo-texto"
            value="${escaparHtml(usuario.nombre)}"
            required
          />
        </div>

        <div>
          <label class="etiqueta-campo" for="campo-correo-usuario">Correo *</label>
          <input
            id="campo-correo-usuario"
            type="email"
            class="campo-texto"
            value="${escaparHtml(usuario.correo)}"
            required
          />
        </div>

        <div>
          <label class="etiqueta-campo" for="campo-rol-usuario">Rol</label>
          <select id="campo-rol-usuario" class="campo-select">
            <option value="Candidato/a">Candidato/a</option>
            <option value="Empresa">Empresa</option>
            <option value="Administración/a">Administración/a</option>
          </select>
        </div>

        <div class="pie-modal derecha">
          <button type="button" id="cancelar-editar-usuario" class="boton boton-mediano">Cancelar</button>
          <button type="submit" class="boton boton-mediano boton-primario">Guardar</button>
        </div>
      </form>
    `,
    alMontar: (cuerpo, cerrar) => {
      const formulario = cuerpo.querySelector('#formulario-editar-usuario');
      const cajaError = cuerpo.querySelector('#error-editar-usuario');
      const campoNombre = cuerpo.querySelector('#campo-nombre-usuario');
      const campoCorreo = cuerpo.querySelector('#campo-correo-usuario');
      const campoRol = cuerpo.querySelector('#campo-rol-usuario');

      campoRol.value = usuario.rol;

      cuerpo.querySelector('#cancelar-editar-usuario').addEventListener('click', cerrar);

      formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const nombreLimpio = campoNombre.value.trim();
        const correoLimpio = campoCorreo.value.trim();

        if (!nombreLimpio || !correoLimpio) {
          cajaError.textContent = 'Por favor complete el nombre y correo del usuario.';
          cajaError.classList.remove('oculto');
          return;
        }

        await alActualizarUsuario({
          ...usuario,
          nombre: nombreLimpio,
          correo: correoLimpio,
          rol: campoRol.value
        });
        cerrar();
      });
    }
  });
}
