import { escaparHtml } from '../utilidades/formato.js';

export function renderizarP11Resumen(contenedor, datos, alNavegar) {
  const {
    usuarios,
    empresas,
    vacantes,
    elementosModeracion,
    estadisticasResumen
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
    ...estadisticasResumen.postulacionesPorMes.map((m) => m.cantidad)
  );

  const htmlBarras = estadisticasResumen.postulacionesPorMes
    .map((elementoLista) => {
      const alturaPorcentaje = elementoLista.cantidad > 0 ? Math.max(8, Math.round((elementoLista.cantidad / maximoMes) * 100)) : 4;
      return `
        <div class="columna-barra">
          <span class="barra-cifra">${elementoLista.cantidad}</span>
          <div
            class="barra-cuerpo ${elementoLista.destacado ? 'destacada' : ''}"
            style="height: ${alturaPorcentaje}%;"
          ></div>
          <span class="barra-mes ${elementoLista.destacado ? 'destacado' : ''}">${escaparHtml(elementoLista.mes)}</span>
        </div>
      `;
    })
    .join('');

  let desplazamientoAcumulado = 0;
  const segmentosDona = estadisticasResumen.postulacionesPorEstado
    .filter((elementoLista) => elementoLista.porcentaje > 0)
    .map((elementoLista) => {
      const trazo = `${elementoLista.porcentaje} ${100 - elementoLista.porcentaje}`;
      const desplazamiento = -desplazamientoAcumulado;
      desplazamientoAcumulado += elementoLista.porcentaje;
      return `<circle cx="18" cy="18" r="14" fill="transparent" stroke="${escaparHtml(elementoLista.color)}" stroke-width="4" stroke-dasharray="${trazo}" stroke-dashoffset="${desplazamiento}" />`;
    })
    .join('');

  const htmlLeyenda = estadisticasResumen.postulacionesPorEstado
    .map(
      (elementoLista) => `
        <div class="fila-leyenda">
          <div class="leyenda-izquierda">
            <span class="leyenda-punto" style="background-color: ${escaparHtml(elementoLista.color)};"></span>
            <span style="color: var(--color-texto-secundario);">${escaparHtml(elementoLista.estado)}</span>
          </div>
          <span class="texto-mono numeros-tabulares" style="font-weight: 600; color: var(--color-texto);">
            ${elementoLista.cantidad}
          </span>
        </div>
      `
    )
    .join('');

  const htmlSectores =
    estadisticasResumen.vacantesPorSector.length === 0
      ? '<p style="font-size:0.75rem; color:var(--color-texto-atenuado); margin:0;">No hay vacantes activas registradas.</p>'
      : estadisticasResumen.vacantesPorSector
          .map(
            (elementoLista) => `
              <div class="fila-resumen">
                <span style="color: var(--color-texto-secundario); font-weight: 500;">${escaparHtml(elementoLista.sector)}</span>
                <span class="contador-gris">${elementoLista.cantidad}</span>
              </div>
            `
          )
          .join('');

  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <h1 class="titulo-pantalla">Resumen</h1>
        <p class="subtitulo-pantalla">Resumen general de WorkConnect</p>
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
          <p class="kpi-valor">${estadisticasResumen.totalPostulaciones}</p>
          <p class="kpi-detalle esmeralda">${estadisticasResumen.contrataciones} contrataciones</p>
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
            <p class="grafico-subtitulo">Distribución de las ${estadisticasResumen.totalPostulaciones} postulaciones registradas</p>
          </div>
          <div class="contenedor-dona">
            <div class="caja-svg-dona">
              <svg class="svg-dona" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="var(--color-superficie-elevada)" stroke-width="4" />
                ${segmentosDona}
              </svg>
              <div class="dona-centro">
                <span class="dona-total-numero">${estadisticasResumen.totalPostulaciones}</span>
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
            <span class="texto-mono" style="font-size: 0.75rem; color: var(--color-texto-atenuado);">Ofertas disponibles</span>
          </div>
          <div>
            ${htmlSectores}
          </div>
        </div>

        <div class="tarjeta tarjeta-espaciado">
          <div class="seccion-lista-cabecera">
            <h2 class="grafico-titulo">Pendientes de atención</h2>
            <span class="etiqueta-cuadrada" style="color: var(--color-ambar); background: var(--color-ambar-fondo); border-color: var(--color-ambar-borde);">
              Acción requerida
            </span>
          </div>

          <div>
            <div class="fila-resumen">
              <span style="color: var(--color-texto-secundario); font-weight: 500;">Vacantes por aprobar</span>
              <div style="display:flex; align-elementos:center; gap:0.5rem;">
                <span class="contador-alerta rosa">${vacantesPendientes}</span>
                <button type="button" class="enlace-accion-vino" data-ir="P14">Revisar</button>
              </div>
            </div>

            <div class="fila-resumen">
              <span style="color: var(--color-texto-secundario); font-weight: 500;">Empresas por verificar</span>
              <div style="display:flex; align-elementos:center; gap:0.5rem;">
                <span class="contador-alerta ambar">${empresasPendientes}</span>
                <button type="button" class="enlace-accion-vino" data-ir="P16">Verificar (P16)</button>
              </div>
            </div>

            <div class="fila-resumen">
              <span style="color: var(--color-texto-secundario); font-weight: 500;">Contenido por moderar</span>
              <div style="display:flex; align-elementos:center; gap:0.5rem;">
                <span class="contador-alerta neutro">${contenidoPendiente}</span>
                <button type="button" class="enlace-accion-vino" data-ir="P15">Moderar</button>
              </div>
            </div>

            <div class="fila-resumen">
              <span style="color: var(--color-texto-secundario); font-weight: 500;">Cuentas inactivas</span>
              <div style="display:flex; align-elementos:center; gap:0.5rem;">
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
