import { escaparHtml } from '../utilidades/formato.js';

export function renderizarP11Dashboard(contenedor, datos, alNavegar) {
  const {
    usuarios,
    empresas,
    vacantes,
    elementosModeracion,
    estadisticasDashboard
  } = datos;

  const totalUsuarios = usuarios.length;
  const usuariosInactivos = usuarios.filter((u) => u.estado === 'Inactivo').length;
  const totalEmpresas = empresas.length;
  const empresasVerificadas = empresas.filter((e) => e.estado === 'Verificada').length;
  const empresasPendientes = empresas.filter((e) => e.estado === 'Pendiente').length;
  const totalVacantes = vacantes.length;
  const vacantesActivas = vacantes.filter((v) => v.estado === 'Activa').length;
  const vacantesPendientes = vacantes.filter((v) => v.estado === 'Pendiente').length;
  const contenidoPendiente = elementosModeracion.filter((m) => m.estado === 'Pendiente').length;

  const maximoMes = Math.max(
    1,
    ...estadisticasDashboard.postulacionesPorMes.map((m) => m.cantidad)
  );

  const htmlBarras = estadisticasDashboard.postulacionesPorMes
    .map((item) => {
      const alturaPorcentaje = item.cantidad > 0 ? Math.max(8, Math.round((item.cantidad / maximoMes) * 100)) : 4;
      return `
        <div class="columna-barra">
          <span class="barra-cifra">${item.cantidad}</span>
          <div
            class="barra-cuerpo ${item.destacado ? 'destacada' : ''}"
            style="height: ${alturaPorcentaje}%;"
          ></div>
          <span class="barra-mes ${item.destacado ? 'destacado' : ''}">${escaparHtml(item.mes)}</span>
        </div>
      `;
    })
    .join('');

  let desplazamientoAcumulado = 0;
  const segmentosDona = estadisticasDashboard.postulacionesPorEstado
    .filter((item) => item.porcentaje > 0)
    .map((item) => {
      const trazo = `${item.porcentaje} ${100 - item.porcentaje}`;
      const offset = -desplazamientoAcumulado;
      desplazamientoAcumulado += item.porcentaje;
      return `<circle cx="18" cy="18" r="14" fill="transparent" stroke="${escaparHtml(item.color)}" stroke-width="4" stroke-dasharray="${trazo}" stroke-dashoffset="${offset}" />`;
    })
    .join('');

  const htmlLeyenda = estadisticasDashboard.postulacionesPorEstado
    .map(
      (item) => `
        <div class="fila-leyenda">
          <div class="leyenda-izquierda">
            <span class="leyenda-punto" style="background-color: ${escaparHtml(item.color)};"></span>
            <span style="color: #334155;">${escaparHtml(item.estado)}</span>
          </div>
          <span class="texto-mono numeros-tabulares" style="font-weight: 600; color: #0f172a;">
            ${item.cantidad}
          </span>
        </div>
      `
    )
    .join('');

  const htmlSectores =
    estadisticasDashboard.vacantesPorSector.length === 0
      ? '<p style="font-size:0.75rem; color:#64748b; margin:0;">No hay vacantes activas registradas.</p>'
      : estadisticasDashboard.vacantesPorSector
          .map(
            (item) => `
              <div class="fila-resumen">
                <span style="color: #334155; font-weight: 500;">${escaparHtml(item.sector)}</span>
                <span class="contador-gris">${item.cantidad}</span>
              </div>
            `
          )
          .join('');

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <span class="codigo-pantalla">P11 ADMINISTRACIÓN</span>
        <h1 class="titulo-pantalla">Dashboard</h1>
        <p class="subtitulo-pantalla">Resumen en tiempo real conectado a la base de datos Supabase</p>
      </div>

      <div class="cuadricula-indicadores">
        <div class="tarjeta-kpi">
          <p class="kpi-etiqueta">USUARIOS</p>
          <p class="kpi-valor">${totalUsuarios}</p>
          <p class="kpi-detalle esmeralda">${totalUsuarios - usuariosInactivos} activos</p>
        </div>

        <div class="tarjeta-kpi">
          <p class="kpi-etiqueta">EMPRESAS</p>
          <p class="kpi-valor">${totalEmpresas}</p>
          <p class="kpi-detalle">${empresasVerificadas} verificadas</p>
        </div>

        <div class="tarjeta-kpi">
          <p class="kpi-etiqueta">VACANTES</p>
          <p class="kpi-valor">${totalVacantes}</p>
          <p class="kpi-detalle vino">${vacantesActivas} activas</p>
        </div>

        <div class="tarjeta-kpi">
          <p class="kpi-etiqueta">POSTULACIONES</p>
          <p class="kpi-valor">${estadisticasDashboard.totalPostulaciones}</p>
          <p class="kpi-detalle esmeralda">${estadisticasDashboard.contrataciones} contrataciones</p>
        </div>
      </div>

      <div class="cuadricula-dos">
        <div class="tarjeta tarjeta-espaciado">
          <div class="grafico-cabecera">
            <div>
              <h2 class="grafico-titulo">Postulaciones por mes</h2>
              <p class="grafico-subtitulo">Datos consultados desde la tabla postulaciones</p>
            </div>
            <span class="etiqueta-anio">${new Date().getFullYear()}</span>
          </div>
          <div class="grafico-barras">
            ${htmlBarras}
          </div>
        </div>

        <div class="tarjeta tarjeta-espaciado">
          <div style="margin-bottom: 1rem;">
            <h2 class="grafico-titulo">Postulaciones por estado</h2>
            <p class="grafico-subtitulo">Distribución de las ${estadisticasDashboard.totalPostulaciones} postulaciones registradas</p>
          </div>
          <div class="contenedor-dona">
            <div class="caja-svg-dona">
              <svg class="svg-dona" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f1f5f9" stroke-width="4" />
                ${segmentosDona}
              </svg>
              <div class="dona-centro">
                <span class="dona-total-numero">${estadisticasDashboard.totalPostulaciones}</span>
                <span class="dona-total-etiqueta">Total</span>
              </div>
            </div>
            <div class="leyenda-dona">
              ${htmlLeyenda}
            </div>
          </div>
        </div>
      </div>

      <div class="cuadricula-dos">
        <div class="tarjeta tarjeta-espaciado">
          <div class="seccion-lista-cabecera">
            <h2 class="grafico-titulo">Vacantes activas por sector</h2>
            <span class="texto-mono" style="font-size: 0.75rem; color: #64748b;">Ofertas disponibles</span>
          </div>
          <div>
            ${htmlSectores}
          </div>
        </div>

        <div class="tarjeta tarjeta-espaciado">
          <div class="seccion-lista-cabecera">
            <h2 class="grafico-titulo">Pendientes de atención</h2>
            <span class="etiqueta-cuadrada" style="color: #b45309; background: #fffbeb; border-color: #fde68a;">
              Acción requerida
            </span>
          </div>

          <div>
            <div class="fila-resumen">
              <span style="color: #334155; font-weight: 500;">Vacantes por aprobar</span>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="contador-alerta rosa">${vacantesPendientes}</span>
                <button type="button" class="enlace-accion-vino" data-ir="P14">Revisar</button>
              </div>
            </div>

            <div class="fila-resumen">
              <span style="color: #334155; font-weight: 500;">Empresas por verificar</span>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="contador-alerta ambar">${empresasPendientes}</span>
                <button type="button" class="enlace-accion-vino" data-ir="P16">Verificar (P16)</button>
              </div>
            </div>

            <div class="fila-resumen">
              <span style="color: #334155; font-weight: 500;">Contenido por moderar</span>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="contador-alerta neutro">${contenidoPendiente}</span>
                <button type="button" class="enlace-accion-vino" data-ir="P15">Moderar</button>
              </div>
            </div>

            <div class="fila-resumen">
              <span style="color: #334155; font-weight: 500;">Cuentas inactivas</span>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="contador-alerta neutro">${usuariosInactivos}</span>
                <button type="button" class="enlace-accion-vino" data-ir="P12">Gestionar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  contenedor.querySelectorAll('[data-ir]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const pantalla = boton.getAttribute('data-ir');
      if (pantalla) alNavegar(pantalla);
    });
  });
}
