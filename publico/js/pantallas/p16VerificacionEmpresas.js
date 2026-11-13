import { escaparHtml } from '../utilidades/formato.js';
import { abrirModal } from '../componentes/modal.js';

const estadoVerificacion = {
  pestanaActiva: 'Todas'
};

export function renderizarP16VerificacionEmpresas(contenedor, solicitudes, acciones) {
  const totalRecibidas = solicitudes.length;
  const conteoPendientes = solicitudes.filter((s) => s.estado === 'Pendiente').length;
  const conteoAprobadas = solicitudes.filter((s) => s.estado === 'Aprobada').length;
  const conteoDevueltas = solicitudes.filter((s) => s.estado === 'Devuelta').length;
  const tiemposResolucionDias = solicitudes
    .filter((s) => s.fechaEnvioIso && s.fechaResolucionIso)
    .map((s) => {
      const inicio = new Date(s.fechaEnvioIso).getTime();
      const fin = new Date(s.fechaResolucionIso).getTime();
      return Math.max(0, (fin - inicio) / (1000 * 60 * 60 * 24));
    });

  const textoTiempoPromedio =
    tiemposResolucionDias.length > 0
      ? `${(
          tiemposResolucionDias.reduce((acum, val) => acum + val, 0) /
          tiemposResolucionDias.length
        ).toFixed(1)} d`
      : '—';

  const solicitudesFiltradas = solicitudes.filter((sol) => {
    if (estadoVerificacion.pestanaActiva === 'Pendientes') return sol.estado === 'Pendiente';
    if (estadoVerificacion.pestanaActiva === 'Aprobadas') return sol.estado === 'Aprobada';
    if (estadoVerificacion.pestanaActiva === 'Devueltas') return sol.estado === 'Devuelta';
    return true;
  });

  const htmlFilas =
    solicitudesFiltradas.length === 0
      ? `
        <tr>
          <td colspan="6" class="celda-vacia">
            No hay solicitudes registradas en este estado.
          </td>
        </tr>
      `
      : solicitudesFiltradas
          .map((sol) => {
            const claseEstado =
              sol.estado === 'Aprobada'
                ? 'verde'
                : sol.estado === 'Pendiente'
                ? 'ambar'
                : 'rosa';

            return `
              <tr>
                <td>
                  <p class="titulo-fila">${escaparHtml(sol.nombreComercial)}</p>
                  <p class="subtitulo-fila">${escaparHtml(sol.razonSocial)}</p>
                  <p class="texto-mono" style="margin:0.15rem 0 0; font-size:10px; color:#94a3b8;">
                    NIT: ${escaparHtml(sol.nit)}
                  </p>
                </td>
                <td style="color:#334155; font-weight:500;">${escaparHtml(sol.sector)}</td>
                <td>
                  <div>
                    <span class="insignia-documento">📄 ${escaparHtml(sol.documentoInscripcion)}</span><br />
                    <span class="insignia-documento">🪪 ${escaparHtml(sol.documentoIdentidad)}</span>
                  </div>
                </td>
                <td class="texto-mono" style="color:#475569; font-size:11px;">
                  ${escaparHtml(sol.fechaEnvio)}
                </td>
                <td>
                  <span class="etiqueta-estado ${claseEstado}">
                    ${sol.estado === 'Aprobada' ? '✓ ' : ''}${escaparHtml(sol.estado)}
                  </span>
                </td>
                <td class="texto-derecha">
                  <div class="grupo-acciones">
                    <button type="button" class="boton" data-ver-sol="${escaparHtml(sol.id)}">Ver</button>
                    <button type="button" class="boton" style="font-weight:600;" data-revisar-sol="${escaparHtml(sol.id)}">
                      Revisar
                    </button>
                    ${
                      sol.estado === 'Pendiente'
                        ? `<button type="button" class="boton boton-primario" data-aprobar-sol="${escaparHtml(sol.id)}">Aprobar</button>`
                        : ''
                    }
                  </div>
                </td>
              </tr>
            `;
          })
          .join('');

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <span class="codigo-pantalla">P16 ADMINISTRACIÓN</span>
        <h1 class="titulo-pantalla">Verificación y aprobación de empresas</h1>
        <p class="subtitulo-pantalla">
          Aprueba o devuelve las empresas registradas. Las aprobadas quedan con el sello «Verificada» y se muestran destacadas en los resultados de búsqueda.
        </p>
      </div>

      <div class="cuadricula-indicadores">
        <div class="tarjeta-kpi">
          <p class="kpi-etiqueta">SOLICITUDES RECIBIDAS</p>
          <p class="kpi-valor">${totalRecibidas}</p>
          <p class="kpi-detalle">Total en el periodo</p>
        </div>

        <div class="tarjeta-kpi">
          <p class="kpi-etiqueta ambar">PENDIENTES DE REVISIÓN</p>
          <p class="kpi-valor ambar">${conteoPendientes}</p>
          <p class="kpi-detalle ambar">Requieren atención</p>
        </div>

        <div class="tarjeta-kpi">
          <p class="kpi-etiqueta esmeralda">EMPRESAS APROBADAS</p>
          <p class="kpi-valor esmeralda">${conteoAprobadas}</p>
          <p class="kpi-detalle esmeralda">Con sello verificado</p>
        </div>

        <div class="tarjeta-kpi">
          <p class="kpi-etiqueta">TIEMPO PROMEDIO</p>
          <p class="kpi-valor">${textoTiempoPromedio}</p>
          <p class="kpi-detalle">Respuesta de validación</p>
        </div>
      </div>

      <div class="barra-pestanas" id="pestanas-verificacion">
        <button type="button" class="boton-pestana ${estadoVerificacion.pestanaActiva === 'Todas' ? 'activo' : ''}" data-pestana-ver="Todas">
          Todas (${totalRecibidas})
        </button>
        <button type="button" class="boton-pestana ${estadoVerificacion.pestanaActiva === 'Pendientes' ? 'activo' : ''}" data-pestana-ver="Pendientes">
          <span>Pendientes (${conteoPendientes})</span>
          ${conteoPendientes > 0 ? '<span class="punto-pestana ambar"></span>' : ''}
        </button>
        <button type="button" class="boton-pestana ${estadoVerificacion.pestanaActiva === 'Aprobadas' ? 'activo' : ''}" data-pestana-ver="Aprobadas">
          Aprobadas (${conteoAprobadas})
        </button>
        <button type="button" class="boton-pestana ${estadoVerificacion.pestanaActiva === 'Devueltas' ? 'activo' : ''}" data-pestana-ver="Devueltas">
          Devueltas (${conteoDevueltas})
        </button>
      </div>

      <div class="contenedor-tabla">
        <div class="desplazamiento-tabla">
          <table class="tabla-datos">
            <thead>
              <tr>
                <th>EMPRESA / RAZÓN SOCIAL</th>
                <th>SECTOR</th>
                <th>DOCUMENTACIÓN</th>
                <th>FECHA ENVÍO</th>
                <th>ESTADO</th>
                <th class="texto-derecha">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              ${htmlFilas}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  contenedor.querySelectorAll('[data-pestana-ver]').forEach((boton) => {
    boton.addEventListener('click', () => {
      estadoVerificacion.pestanaActiva = boton.getAttribute('data-pestana-ver');
      renderizarP16VerificacionEmpresas(contenedor, solicitudes, acciones);
    });
  });

  contenedor.querySelectorAll('[data-ver-sol]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const solicitud = solicitudes.find((s) => s.id === boton.getAttribute('data-ver-sol'));
      if (solicitud) abrirModalFichaSolicitud(solicitud);
    });
  });

  contenedor.querySelectorAll('[data-revisar-sol]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const solicitud = solicitudes.find((s) => s.id === boton.getAttribute('data-revisar-sol'));
      if (solicitud) abrirModalRevisarSolicitud(solicitud, acciones.alCambiarEstadoSolicitud);
    });
  });

  contenedor.querySelectorAll('[data-aprobar-sol]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.getAttribute('data-aprobar-sol');
      if (id) acciones.alCambiarEstadoSolicitud(id, 'Aprobada');
    });
  });
}

function abrirModalFichaSolicitud(solicitud) {
  abrirModal({
    titulo: 'Ficha de solicitud',
    subtitulo: 'Detalles completos de la solicitud',
    contenidoHtml: `
      <div class="pila-compacta" style="font-size:0.75rem;">
        <div class="caja-dato-modal" style="background:#f8fafc; padding:0.75rem;">
          <h4 style="margin:0; font-weight:700; color:#0f172a; font-size:0.875rem;">
            ${escaparHtml(solicitud.nombreComercial)}
          </h4>
          <p style="margin:0.15rem 0 0; color:#475569;">${escaparHtml(solicitud.razonSocial)}</p>
          <p class="texto-mono" style="margin:0.25rem 0 0; color:#64748b;">
            NIT: ${escaparHtml(solicitud.nit)}
          </p>
        </div>

        <div class="cuadricula-campos-2">
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Correo</span>
            <strong>${escaparHtml(solicitud.correoContacto)}</strong>
          </div>
          <div class="caja-dato-modal">
            <span class="dato-etiqueta">Teléfono</span>
            <span class="texto-mono">${escaparHtml(solicitud.telefono)}</span>
          </div>
        </div>

        <div class="caja-dato-modal">
          <span class="dato-etiqueta">Estado actual</span>
          <strong>${escaparHtml(solicitud.estado)}</strong>
        </div>

        ${
          solicitud.observaciones
            ? `
            <div class="caja-dato-modal" style="background:#fffbeb; border-color:#fde68a; color:#78350f;">
              <span class="dato-etiqueta" style="color:#92400e;">Observaciones</span>
              <p style="margin:0.2rem 0 0;">${escaparHtml(solicitud.observaciones)}</p>
            </div>
          `
            : ''
        }

        <div class="pie-modal derecha">
          <button type="button" id="cerrar-ficha-solicitud" class="boton boton-mediano boton-neutro">
            Cerrar
          </button>
        </div>
      </div>
    `,
    alMontar: (cuerpo, cerrar) => {
      cuerpo.querySelector('#cerrar-ficha-solicitud').addEventListener('click', cerrar);
    }
  });
}

function abrirModalRevisarSolicitud(solicitud, alCambiarEstadoSolicitud) {
  abrirModal({
    titulo: 'Revisar y verificar empresa',
    subtitulo: 'Verifica la documentación legal y valida los requisitos obligatorios',
    contenidoHtml: `
      <div class="pila-compacta">
        <div id="error-revision-solicitud" class="alerta-error-formulario oculto"></div>

        <div class="caja-dato-modal" style="background:#f8fafc; padding:0.875rem; border-radius:0.5rem;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <h4 style="margin:0; font-weight:700; font-size:1rem; color:#0f172a;">
              ${escaparHtml(solicitud.nombreComercial)}
            </h4>
            <span class="etiqueta-cuadrada texto-mono" style="background:#e2e8f0; color:#1e293b; border-color:#cbd5e1;">
              ${escaparHtml(solicitud.estado)}
            </span>
          </div>
          <p style="margin:0.2rem 0 0; font-size:0.75rem; color:#475569;">
            ${escaparHtml(solicitud.razonSocial)}
          </p>
          <div class="cuadricula-campos-2" style="margin-top:0.5rem; font-size:0.75rem;">
            <div>
              <span class="dato-etiqueta">NIT</span>
              <span class="texto-mono" style="font-weight:500;">${escaparHtml(solicitud.nit)}</span>
            </div>
            <div>
              <span class="dato-etiqueta">Sector y tamaño</span>
              <span style="font-weight:500;">${escaparHtml(solicitud.sector)} · ${escaparHtml(solicitud.tamano)}</span>
            </div>
          </div>
        </div>

        <div>
          <h5 style="margin:0 0 0.4rem; font-size:0.75rem; font-weight:700; color:#1e293b; text-transform:uppercase;">
            Archivos adjuntos recibidos
          </h5>
          <div class="pila-compacta" style="gap:0.5rem;">
            <div class="caja-resumen-modal" style="background:#ffffff; padding:0.625rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="color:#be123c; font-weight:700; font-size:0.75rem;">PDF</span>
                <div>
                  <p class="titulo-fila" style="font-size:0.75rem;">${escaparHtml(solicitud.documentoInscripcion)}</p>
                  <p class="subtitulo-fila" style="font-size:10px;">Constancia de inscripción en Registro de Comercio</p>
                </div>
              </div>
              <span style="font-size:11px; color:#831843; font-weight:600;">Documento verificado</span>
            </div>

            <div class="caja-resumen-modal" style="background:#ffffff; padding:0.625rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="color:#2563eb; font-weight:700; font-size:0.75rem;">PDF</span>
                <div>
                  <p class="titulo-fila" style="font-size:0.75rem;">${escaparHtml(solicitud.documentoIdentidad)}</p>
                  <p class="subtitulo-fila" style="font-size:10px;">DUI / Cédula del Representante Legal</p>
                </div>
              </div>
              <span style="font-size:11px; color:#831843; font-weight:600;">Documento verificado</span>
            </div>
          </div>
        </div>

        <div class="caja-lista-verificacion">
          <h5 style="margin:0; font-size:0.75rem; font-weight:700; color:#1e293b; text-transform:uppercase;">
            Criterios de verificación (Checklist)
          </h5>
          <label class="item-verificacion">
            <input type="checkbox" id="criterio-registro" ${solicitud.criterios.registroVigente ? 'checked' : ''} />
            <span><strong>Registro vigente:</strong> Constancia de inscripción en Registro de Comercio vigente.</span>
          </label>
          <label class="item-verificacion">
            <input type="checkbox" id="criterio-nit" ${solicitud.criterios.nitValido ? 'checked' : ''} />
            <span><strong>NIT válido:</strong> Formato de 14 dígitos con dígito verificador cotejado en Hacienda.</span>
          </label>
          <label class="item-verificacion">
            <input type="checkbox" id="criterio-identidad" ${solicitud.criterios.identidadRepresentante ? 'checked' : ''} />
            <span><strong>Identidad del representante:</strong> Cédula de identidad / DUI vigente y con cargo registrado.</span>
          </label>
          <label class="item-verificacion">
            <input type="checkbox" id="criterio-contacto" ${solicitud.criterios.contactoVerificado ? 'checked' : ''} />
            <span><strong>Contacto verificado:</strong> Correo corporativo y teléfono verificados con respuesta directa.</span>
          </label>
        </div>

        <div>
          <label class="etiqueta-campo" for="observaciones-revision">Observaciones o notas de revisión</label>
          <textarea
            id="observaciones-revision"
            rows="2"
            class="campo-area"
            placeholder="Indique notas de validación o la razón en caso de devolver la solicitud..."
          >${escaparHtml(solicitud.observaciones || '')}</textarea>
        </div>

        <div class="pie-modal">
          <button type="button" id="cerrar-revisar-sol" class="boton boton-mediano">Cerrar</button>
          <div class="grupo-acciones">
            <button type="button" id="devolver-solicitud" class="boton boton-mediano boton-peligro-suave">
              Devolver solicitud
            </button>
            <button type="button" id="aprobar-certificar-sol" class="boton boton-mediano boton-primario">
              Aprobar y certificar empresa
            </button>
          </div>
        </div>
      </div>
    `,
    alMontar: (cuerpo, cerrar) => {
      const cajaError = cuerpo.querySelector('#error-revision-solicitud');
      const campoObservaciones = cuerpo.querySelector('#observaciones-revision');

      const obtenerCriterios = () => ({
        registroVigente: cuerpo.querySelector('#criterio-registro').checked,
        nitValido: cuerpo.querySelector('#criterio-nit').checked,
        identidadRepresentante: cuerpo.querySelector('#criterio-identidad').checked,
        contactoVerificado: cuerpo.querySelector('#criterio-contacto').checked
      });

      cuerpo.querySelector('#cerrar-revisar-sol').addEventListener('click', cerrar);

      cuerpo.querySelector('#devolver-solicitud').addEventListener('click', async () => {
        const observaciones = campoObservaciones.value.trim();
        if (!observaciones) {
          cajaError.textContent = 'Por favor especifique en las observaciones el motivo de la devolución.';
          cajaError.classList.remove('oculto');
          campoObservaciones.focus();
          return;
        }
        await alCambiarEstadoSolicitud(solicitud.id, 'Devuelta', observaciones, obtenerCriterios());
        cerrar();
      });

      cuerpo.querySelector('#aprobar-certificar-sol').addEventListener('click', async () => {
        const observaciones = campoObservaciones.value.trim();
        await alCambiarEstadoSolicitud(solicitud.id, 'Aprobada', observaciones, obtenerCriterios());
        cerrar();
      });
    }
  });
}
