import { escaparHtml, iconoBusquedaSvg } from '../utilidades/formato.js';
import { abrirModal } from '../componentes/modal.js';

const estadoFiltrosVacantes = {
  pestanaActiva: 'Todas',
  terminoBusqueda: ''
};

export function renderizarP14Vacantes(contenedor, vacantes, acciones) {
  const conteoTodas = vacantes.length;
  const conteoPendientes = vacantes.filter((v) => v.estado === 'Pendiente').length;
  const conteoActivas = vacantes.filter((v) => v.estado === 'Activa').length;
  const conteoInactivas = vacantes.filter((v) => v.estado === 'Inactiva').length;

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <span class="codigo-pantalla">P14 ADMINISTRACIÓN</span>
        <h1 class="titulo-pantalla">Vacantes</h1>
        <p class="subtitulo-pantalla">
          Aprueba las nuevas publicaciones, edítalas o desactívalas.
        </p>
      </div>

      <div class="barra-pestanas" id="pestanas-vacantes">
        <button type="button" class="boton-pestana ${estadoFiltrosVacantes.pestanaActiva === 'Todas' ? 'activo' : ''}" data-pestana="Todas">
          Todas (${conteoTodas})
        </button>
        <button type="button" class="boton-pestana ${estadoFiltrosVacantes.pestanaActiva === 'Pendientes' ? 'activo' : ''}" data-pestana="Pendientes">
          <span>Pendientes (${conteoPendientes})</span>
          ${conteoPendientes > 0 ? '<span class="punto-pestana rosa"></span>' : ''}
        </button>
        <button type="button" class="boton-pestana ${estadoFiltrosVacantes.pestanaActiva === 'Activas' ? 'activo' : ''}" data-pestana="Activas">
          Activas (${conteoActivas})
        </button>
        <button type="button" class="boton-pestana ${estadoFiltrosVacantes.pestanaActiva === 'Inactivas' ? 'activo' : ''}" data-pestana="Inactivas">
          Inactivas (${conteoInactivas})
        </button>
      </div>

      <div class="tarjeta tarjeta-filtro">
        <div class="campo-busqueda-envoltura">
          <input
            type="text"
            id="busqueda-vacantes"
            class="campo-texto con-icono"
            placeholder="Buscar por puesto o empresa"
            value="${escaparHtml(estadoFiltrosVacantes.terminoBusqueda)}"
          />
          ${iconoBusquedaSvg()}
        </div>
      </div>

      <div class="contenedor-tabla">
        <div class="desplazamiento-tabla">
          <table class="tabla-datos">
            <thead>
              <tr>
                <th>VACANTE</th>
                <th>SALARIO</th>
                <th>PUBLICADA</th>
                <th>ESTADO</th>
                <th class="texto-derecha">ACCIONES</th>
              </tr>
            </thead>
            <tbody id="cuerpo-tabla-vacantes"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const inputBusqueda = contenedor.querySelector('#busqueda-vacantes');
  const cuerpoTabla = contenedor.querySelector('#cuerpo-tabla-vacantes');

  const actualizarTabla = () => {
    const texto = estadoFiltrosVacantes.terminoBusqueda.trim().toLowerCase();
    const filtradas = vacantes.filter((vacante) => {
      if (estadoFiltrosVacantes.pestanaActiva === 'Pendientes' && vacante.estado !== 'Pendiente') {
        return false;
      }
      if (estadoFiltrosVacantes.pestanaActiva === 'Activas' && vacante.estado !== 'Activa') {
        return false;
      }
      if (estadoFiltrosVacantes.pestanaActiva === 'Inactivas' && vacante.estado !== 'Inactiva') {
        return false;
      }

      return (
        vacante.titulo.toLowerCase().includes(texto) ||
        vacante.empresa.toLowerCase().includes(texto) ||
        vacante.municipio.toLowerCase().includes(texto)
      );
    });

    if (filtradas.length === 0) {
      cuerpoTabla.innerHTML = `
        <tr>
          <td colspan="5" class="celda-vacia">
            No hay vacantes para mostrar en esta categoría.
          </td>
        </tr>
      `;
      return;
    }

    cuerpoTabla.innerHTML = filtradas
      .map((vacante) => {
        const claseEstado =
          vacante.estado === 'Activa'
            ? 'oscuro'
            : vacante.estado === 'Pendiente'
            ? 'ambar'
            : 'neutro';

        const botonEstado =
          vacante.estado === 'Pendiente'
            ? `<button type="button" class="boton boton-primario" data-aprobar="${escaparHtml(vacante.id)}">Aprobar</button>`
            : `<button
                type="button"
                class="boton ${vacante.estado === 'Activa' ? '' : 'boton-exito'}"
                data-alternar="${escaparHtml(vacante.id)}"
              >
                ${vacante.estado === 'Activa' ? 'Desactivar' : 'Activar'}
              </button>`;

        return `
          <tr>
            <td>
              <p class="titulo-fila">${escaparHtml(vacante.titulo)}</p>
              <p class="subtitulo-fila">
                ${escaparHtml(vacante.empresa)} · ${escaparHtml(vacante.municipio)}
              </p>
            </td>
            <td class="texto-mono" style="font-weight:500; color:#1e293b;">
              $${vacante.salarioMin} – $${vacante.salarioMax}
            </td>
            <td class="texto-mono" style="color:#475569; font-size:11px;">
              ${escaparHtml(vacante.fechaPublicacion)}
            </td>
            <td>
              <span class="etiqueta-estado ${claseEstado}">
                ${vacante.estado === 'Activa' ? '✓ ' : ''}${escaparHtml(vacante.estado)}
              </span>
            </td>
            <td class="texto-derecha">
              <div class="grupo-acciones">
                <button type="button" class="boton" data-ver="${escaparHtml(vacante.id)}">Ver</button>
                <button type="button" class="boton" data-editar="${escaparHtml(vacante.id)}">Editar</button>
                ${botonEstado}
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    cuerpoTabla.querySelectorAll('[data-ver]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const vacante = vacantes.find((v) => v.id === boton.getAttribute('data-ver'));
        if (vacante) abrirModalDetalleVacante(vacante, acciones.alCambiarEstadoVacante);
      });
    });

    cuerpoTabla.querySelectorAll('[data-editar]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const vacante = vacantes.find((v) => v.id === boton.getAttribute('data-editar'));
        if (vacante) abrirModalEditarVacante(vacante, acciones.alActualizarVacante);
      });
    });

    cuerpoTabla.querySelectorAll('[data-aprobar]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const id = boton.getAttribute('data-aprobar');
        if (id) acciones.alCambiarEstadoVacante(id, 'Activa');
      });
    });

    cuerpoTabla.querySelectorAll('[data-alternar]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const vacante = vacantes.find((v) => v.id === boton.getAttribute('data-alternar'));
        if (vacante) {
          const nuevoEstado = vacante.estado === 'Activa' ? 'Inactiva' : 'Activa';
          acciones.alCambiarEstadoVacante(vacante.id, nuevoEstado);
        }
      });
    });
  };

  contenedor.querySelectorAll('#pestanas-vacantes [data-pestana]').forEach((boton) => {
    boton.addEventListener('click', () => {
      estadoFiltrosVacantes.pestanaActiva = boton.getAttribute('data-pestana');
      contenedor
        .querySelectorAll('#pestanas-vacantes [data-pestana]')
        .forEach((b) => b.classList.remove('activo'));
      boton.classList.add('activo');
      actualizarTabla();
    });
  });

  inputBusqueda.addEventListener('input', (e) => {
    estadoFiltrosVacantes.terminoBusqueda = e.target.value;
    actualizarTabla();
  });

  actualizarTabla();
}

function abrirModalDetalleVacante(vacante, alCambiarEstadoVacante) {
  const funcionesHtml = vacante.funciones.map((fn) => `<li>${escaparHtml(fn)}</li>`).join('');
  const requisitosHtml = vacante.requisitos.map((rq) => `<li>${escaparHtml(rq)}</li>`).join('');
  const beneficiosHtml = vacante.beneficios.map((bn) => `<li>${escaparHtml(bn)}</li>`).join('');

  const botonAccionHtml =
    vacante.estado === 'Pendiente'
      ? `<button type="button" id="accion-estado-vacante-modal" class="boton boton-mediano boton-primario">Aprobar y publicar</button>`
      : `<button type="button" id="accion-estado-vacante-modal" class="boton boton-mediano boton-neutro">
          ${vacante.estado === 'Activa' ? 'Desactivar publicación' : 'Activar publicación'}
        </button>`;

  abrirModal({
    titulo: 'Detalle de la oferta de empleo',
    subtitulo: 'Revisa la información completa antes de aprobarla o desactivarla',
    contenidoHtml: `
      <div class="pila-compacta">
        <div class="caja-dato-modal" style="background:#f8fafc; padding:0.75rem; border-radius:0.5rem;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="font-size:0.75rem; font-weight:600; color:#64748b; text-transform:uppercase;">
              ${escaparHtml(vacante.empresa)}
            </span>
            <span class="etiqueta-cuadrada" style="${
              vacante.estado === 'Activa'
                ? 'background:#0f172a; color:#ffffff; border-color:#0f172a;'
                : 'background:#fef3c7; color:#92400e; border-color:#fde68a;'
            }">
              ${escaparHtml(vacante.estado)}
            </span>
          </div>
          <h3 style="margin:0.25rem 0 0; font-size:1rem; font-weight:700; color:#0f172a;">
            ${escaparHtml(vacante.titulo)}
          </h3>
          <p style="margin:0.2rem 0 0; font-size:0.75rem; color:#475569;">
            ${escaparHtml(vacante.municipio)}, ${escaparHtml(vacante.departamento)} · ${escaparHtml(vacante.modalidad)} · ${escaparHtml(vacante.tipoContrato)}
          </p>
          <p class="texto-mono" style="margin:0.375rem 0 0; font-size:0.75rem; font-weight:700; color:#831843;">
            Salario: $${vacante.salarioMin} – $${vacante.salarioMax} / mes
          </p>
        </div>

        <div>
          <h4 style="margin:0; font-size:0.75rem; font-weight:700; color:#1e293b; text-transform:uppercase;">
            Descripción del puesto
          </h4>
          <p style="margin:0.25rem 0 0; font-size:0.75rem; color:#334155; line-height:1.5;">
            ${escaparHtml(vacante.descripcion)}
          </p>
        </div>

        <div>
          <h4 style="margin:0; font-size:0.75rem; font-weight:700; color:#1e293b; text-transform:uppercase;">
            Funciones principales
          </h4>
          <ul class="lista-vineta">${funcionesHtml}</ul>
        </div>

        <div>
          <h4 style="margin:0; font-size:0.75rem; font-weight:700; color:#1e293b; text-transform:uppercase;">
            Requisitos
          </h4>
          <ul class="lista-vineta">${requisitosHtml}</ul>
        </div>

        <div>
          <h4 style="margin:0; font-size:0.75rem; font-weight:700; color:#1e293b; text-transform:uppercase;">
            Beneficios
          </h4>
          <ul class="lista-vineta">${beneficiosHtml}</ul>
        </div>

        <div class="pie-modal">
          <button type="button" id="cerrar-detalle-vacante" class="boton boton-mediano">Cerrar</button>
          ${botonAccionHtml}
        </div>
      </div>
    `,
    alMontar: (cuerpo, cerrar) => {
      cuerpo.querySelector('#cerrar-detalle-vacante').addEventListener('click', cerrar);
      cuerpo.querySelector('#accion-estado-vacante-modal').addEventListener('click', async () => {
        const nuevoEstado =
          vacante.estado === 'Pendiente'
            ? 'Activa'
            : vacante.estado === 'Activa'
            ? 'Inactiva'
            : 'Activa';
        await alCambiarEstadoVacante(vacante.id, nuevoEstado);
        cerrar();
      });
    }
  });
}

function abrirModalEditarVacante(vacante, alActualizarVacante) {
  abrirModal({
    titulo: 'Editar vacante',
    subtitulo: 'Actualiza las condiciones y texto de la publicación',
    contenidoHtml: `
      <form id="formulario-editar-vacante" class="pila-compacta" novalidate>
        <div id="error-editar-vacante" class="alerta-error-formulario oculto"></div>

        <div>
          <label class="etiqueta-campo" for="campo-titulo-vacante">Título del puesto *</label>
          <input
            id="campo-titulo-vacante"
            type="text"
            class="campo-texto"
            value="${escaparHtml(vacante.titulo)}"
            required
          />
        </div>

        <div class="cuadricula-campos-2">
          <div>
            <label class="etiqueta-campo" for="campo-salario-min">Salario mínimo (USD / mes) *</label>
            <input
              id="campo-salario-min"
              type="number"
              class="campo-texto"
              value="${vacante.salarioMin}"
              required
            />
          </div>
          <div>
            <label class="etiqueta-campo" for="campo-salario-max">Salario máximo (USD / mes) *</label>
            <input
              id="campo-salario-max"
              type="number"
              class="campo-texto"
              value="${vacante.salarioMax}"
              required
            />
          </div>
        </div>

        <div class="cuadricula-campos-2">
          <div>
            <label class="etiqueta-campo" for="campo-modalidad-vacante">Modalidad</label>
            <select id="campo-modalidad-vacante" class="campo-select">
              <option value="Presencial">Presencial</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Remoto">Remoto</option>
            </select>
          </div>
          <div>
            <label class="etiqueta-campo" for="campo-contrato-vacante">Tipo de contrato</label>
            <select id="campo-contrato-vacante" class="campo-select">
              <option value="Tiempo completo">Tiempo completo</option>
              <option value="Medio tiempo">Medio tiempo</option>
              <option value="Servicios profesionales">Servicios profesionales</option>
            </select>
          </div>
        </div>

        <div>
          <label class="etiqueta-campo" for="campo-descripcion-vacante">Descripción del puesto</label>
          <textarea id="campo-descripcion-vacante" rows="3" class="campo-area">${escaparHtml(vacante.descripcion)}</textarea>
        </div>

        <div class="pie-modal derecha">
          <button type="button" id="cancelar-editar-vacante" class="boton boton-mediano">Cancelar</button>
          <button type="submit" class="boton boton-mediano boton-primario">Guardar</button>
        </div>
      </form>
    `,
    alMontar: (cuerpo, cerrar) => {
      const formulario = cuerpo.querySelector('#formulario-editar-vacante');
      const cajaError = cuerpo.querySelector('#error-editar-vacante');
      const campoTitulo = cuerpo.querySelector('#campo-titulo-vacante');
      const campoSalMin = cuerpo.querySelector('#campo-salario-min');
      const campoSalMax = cuerpo.querySelector('#campo-salario-max');
      const campoModalidad = cuerpo.querySelector('#campo-modalidad-vacante');
      const campoContrato = cuerpo.querySelector('#campo-contrato-vacante');
      const campoDescripcion = cuerpo.querySelector('#campo-descripcion-vacante');

      campoModalidad.value = vacante.modalidad;
      campoContrato.value = vacante.tipoContrato;

      cuerpo.querySelector('#cancelar-editar-vacante').addEventListener('click', cerrar);

      formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const tituloLimpio = campoTitulo.value.trim();
        const salarioMinimo = Number(campoSalMin.value);
        const salarioMaximo = Number(campoSalMax.value);

        if (!tituloLimpio) {
          cajaError.textContent = 'Por favor ingrese el título del puesto.';
          cajaError.classList.remove('oculto');
          return;
        }

        if (salarioMaximo < salarioMinimo) {
          cajaError.textContent = 'El salario máximo no puede ser menor al salario mínimo.';
          cajaError.classList.remove('oculto');
          return;
        }

        await alActualizarVacante({
          ...vacante,
          titulo: tituloLimpio,
          salarioMin: salarioMinimo,
          salarioMax: salarioMaximo,
          modalidad: campoModalidad.value,
          tipoContrato: campoContrato.value,
          descripcion: campoDescripcion.value.trim()
        });
        cerrar();
      });
    }
  });
}
