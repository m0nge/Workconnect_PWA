import { escaparHtml, iconoBusquedaSvg } from '../utilidades/formato.js';
import { abrirModal } from '../componentes/modal.js';

const estadoFiltrosEmpresas = {
  terminoBusqueda: '',
  filtroEstado: 'Todos los estados'
};

export function renderizarP13Empresas(contenedor, empresas, acciones) {
  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <span class="codigo-pantalla">P13 ADMINISTRACIÓN</span>
        <h1 class="titulo-pantalla">Empresas</h1>
        <p class="subtitulo-pantalla">
          Revisa la información de cada empresa y gestiona su verificación.
        </p>
      </div>

      <div class="tarjeta tarjeta-filtro">
        <div class="cuadricula-filtros-2">
          <div class="campo-busqueda-envoltura">
            <input
              type="text"
              id="busqueda-empresas"
              class="campo-texto con-icono"
              placeholder="Buscar empresa o sector"
              value="${escaparHtml(estadoFiltrosEmpresas.terminoBusqueda)}"
            />
            ${iconoBusquedaSvg()}
          </div>

          <div>
            <select id="filtro-estado-empresas" class="campo-select">
              <option value="Todos los estados">Todos los estados</option>
              <option value="Verificada">Verificada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Suspendida">Suspendida</option>
            </select>
          </div>
        </div>

        <div id="resumen-filtros-empresas" class="resumen-filtros"></div>
      </div>

      <div class="contenedor-tabla">
        <div class="desplazamiento-tabla">
          <table class="tabla-datos">
            <thead>
              <tr>
                <th>EMPRESA</th>
                <th>SECTOR</th>
                <th>UBICACIÓN</th>
                <th class="texto-centro">VACANTES</th>
                <th>ESTADO</th>
                <th class="texto-derecha">ACCIONES</th>
              </tr>
            </thead>
            <tbody id="cuerpo-tabla-empresas"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const inputBusqueda = contenedor.querySelector('#busqueda-empresas');
  const selectEstado = contenedor.querySelector('#filtro-estado-empresas');
  const resumenFiltros = contenedor.querySelector('#resumen-filtros-empresas');
  const cuerpoTabla = contenedor.querySelector('#cuerpo-tabla-empresas');

  selectEstado.value = estadoFiltrosEmpresas.filtroEstado;

  const actualizarTabla = () => {
    const texto = estadoFiltrosEmpresas.terminoBusqueda.trim().toLowerCase();
    const filtradas = empresas.filter((empresa) => {
      const coincideTexto =
        empresa.nombreComercial.toLowerCase().includes(texto) ||
        empresa.sector.toLowerCase().includes(texto) ||
        empresa.ubicacion.toLowerCase().includes(texto);
      const coincideEstado =
        estadoFiltrosEmpresas.filtroEstado === 'Todos los estados' ||
        empresa.estado === estadoFiltrosEmpresas.filtroEstado;
      return coincideTexto && coincideEstado;
    });

    const hayFiltros =
      Boolean(estadoFiltrosEmpresas.terminoBusqueda) ||
      estadoFiltrosEmpresas.filtroEstado !== 'Todos los estados';

    resumenFiltros.innerHTML = `
      <span>
        Mostrando <strong style="color:#1e293b;">${filtradas.length}</strong> de ${empresas.length} empresas registradas
      </span>
      ${
        hayFiltros
          ? '<button type="button" id="limpiar-filtros-empresas" class="boton-limpiar-filtros">Limpiar filtros</button>'
          : ''
      }
    `;

    const botonLimpiar = resumenFiltros.querySelector('#limpiar-filtros-empresas');
    if (botonLimpiar) {
      botonLimpiar.addEventListener('click', () => {
        estadoFiltrosEmpresas.terminoBusqueda = '';
        estadoFiltrosEmpresas.filtroEstado = 'Todos los estados';
        inputBusqueda.value = '';
        selectEstado.value = 'Todos los estados';
        actualizarTabla();
      });
    }

    if (filtradas.length === 0) {
      cuerpoTabla.innerHTML = `
        <tr>
          <td colspan="6" class="celda-vacia">
            No se encontraron empresas con esos criterios de búsqueda.
          </td>
        </tr>
      `;
      return;
    }

    cuerpoTabla.innerHTML = filtradas
      .map((empresa) => {
        const claseEstado =
          empresa.estado === 'Verificada'
            ? 'oscuro'
            : empresa.estado === 'Pendiente'
            ? 'ambar'
            : 'rosa';

        return `
          <tr>
            <td>
              <div class="celda-identidad">
                <div class="avatar-cuadrado">${escaparHtml(empresa.iniciales)}</div>
                <div>
                  <p class="titulo-fila">${escaparHtml(empresa.nombreComercial)}</p>
                  <p class="subtitulo-fila">${escaparHtml(empresa.contactoCorreo)}</p>
                </div>
              </div>
            </td>
            <td style="color:#334155; font-weight:500;">${escaparHtml(empresa.sector)}</td>
            <td style="color:#475569;">${escaparHtml(empresa.ubicacion)}</td>
            <td class="texto-centro texto-mono numeros-tabulares" style="font-weight:600; color:#1e293b;">
              ${empresa.vacantes}
            </td>
            <td>
              <span class="etiqueta-estado ${claseEstado}">
                ${empresa.estado === 'Verificada' ? '✓ ' : ''}${escaparHtml(empresa.estado)}
              </span>
            </td>
            <td class="texto-derecha">
              <button type="button" class="boton" data-revisar="${escaparHtml(empresa.id)}">
                Revisar
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    cuerpoTabla.querySelectorAll('[data-revisar]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const empresa = empresas.find((e) => e.id === boton.getAttribute('data-revisar'));
        if (empresa) abrirModalDetalleEmpresa(empresa, acciones.alCambiarEstadoEmpresa);
      });
    });
  };

  inputBusqueda.addEventListener('input', (e) => {
    estadoFiltrosEmpresas.terminoBusqueda = e.target.value;
    actualizarTabla();
  });

  selectEstado.addEventListener('change', (e) => {
    estadoFiltrosEmpresas.filtroEstado = e.target.value;
    actualizarTabla();
  });

  actualizarTabla();
}

function abrirModalDetalleEmpresa(empresa, alCambiarEstadoEmpresa) {
  const claseEstado =
    empresa.estado === 'Verificada'
      ? 'oscuro'
      : empresa.estado === 'Pendiente'
      ? 'ambar'
      : 'rosa';

  abrirModal({
    titulo: 'Detalle de empresa',
    subtitulo: 'Información legal, perfil corporativo y control de verificación',
    contenidoHtml: `
      <div class="pila-compacta">
        <div class="caja-resumen-modal">
          <div class="celda-identidad">
            <div class="avatar-cuadrado grande">${escaparHtml(empresa.iniciales)}</div>
            <div>
              <h4 style="margin:0; font-weight:700; font-size:1rem; color:#0f172a;">
                ${escaparHtml(empresa.nombreComercial)}
              </h4>
              <p class="texto-mono" style="margin:0.15rem 0 0; font-size:0.75rem; color:#64748b;">
                NIT: ${escaparHtml(empresa.nit)}
              </p>
            </div>
          </div>
          <span id="badge-estado-empresa-modal" class="etiqueta-estado ${claseEstado}" style="padding:0.25rem 0.65rem; font-size:0.75rem;">
            ${empresa.estado === 'Verificada' ? '✓ Verificada' : escaparHtml(empresa.estado)}
          </span>
        </div>

        <div class="cuadricula-campos-2">
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Sector</span>
            <strong>${escaparHtml(empresa.sector)}</strong>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Tamaño</span>
            <span>${escaparHtml(empresa.tamano)}</span>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Ubicación</span>
            <span>${escaparHtml(empresa.ubicacion)}</span>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Teléfono</span>
            <span class="texto-mono">${escaparHtml(empresa.telefono)}</span>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Correo de contacto</span>
            <span>${escaparHtml(empresa.contactoCorreo)}</span>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Sitio web</span>
            <a href="${escaparHtml(empresa.sitioWeb)}" target="_blank" rel="noreferrer" style="color:#831843;">
              ${escaparHtml(empresa.sitioWeb)}
            </a>
          </div>
        </div>

        <div class="caja-dato-modal" style="padding:0.75rem;">
          <span class="dato-etiqueta" style="margin-bottom:0.25rem;">Descripción de la empresa</span>
          <p style="margin:0; color:#334155; line-height:1.5;">${escaparHtml(empresa.descripcion)}</p>
        </div>

        <div class="caja-resumen-modal" style="padding:0.625rem 0.75rem; font-size:0.75rem;">
          <div>
            <span style="color:#f59e0b; font-weight:700;">★ ${empresa.calificacion}</span>
            <span style="color:#64748b;"> (${empresa.totalResenas} valoraciones)</span>
          </div>
          <span style="color:#475569; font-weight:500;">${empresa.vacantes} vacantes publicadas</span>
        </div>

        <div class="pie-modal">
          <button type="button" id="cerrar-modal-empresa" class="boton boton-mediano">Cerrar</button>
          <div class="grupo-acciones">
            <button type="button" data-nuevo-estado="Suspendida" class="boton boton-mediano boton-peligro-suave">
              Suspender
            </button>
            <button type="button" data-nuevo-estado="Pendiente" class="boton boton-mediano boton-ambar-suave">
              Marcar pendiente
            </button>
            <button type="button" data-nuevo-estado="Verificada" class="boton boton-mediano boton-primario">
              Verificar empresa
            </button>
          </div>
        </div>
      </div>
    `,
    alMontar: (cuerpo, cerrar) => {
      cuerpo.querySelector('#cerrar-modal-empresa').addEventListener('click', cerrar);
      cuerpo.querySelectorAll('[data-nuevo-estado]').forEach((boton) => {
        boton.addEventListener('click', async () => {
          const nuevoEstado = boton.getAttribute('data-nuevo-estado');
          if (!nuevoEstado) return;
          await alCambiarEstadoEmpresa(empresa.id, nuevoEstado);
          cerrar();
        });
      });
    }
  });
}
