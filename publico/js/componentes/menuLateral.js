// Componente del menú lateral de navegación administrativa (P11 a P16 y P19)

export function renderizarMenuLateral(
  contenedor,
  pantallaActual,
  conteosPendientes,
  alSeleccionarPantalla
) {
  const elementos = [
    { id: 'P11', clave: 'P11', etiqueta: 'Dashboard', descripcion: 'Métricas generales' },
    { id: 'P12', clave: 'P12', etiqueta: 'Usuarios', descripcion: 'Gestión de cuentas' },
    {
      id: 'P13',
      clave: 'P13',
      etiqueta: 'Empresas',
      descripcion: 'Directorio empresarial',
      pendiente: conteosPendientes.empresas
    },
    {
      id: 'P14',
      clave: 'P14',
      etiqueta: 'Vacantes',
      descripcion: 'Ofertas publicadas',
      pendiente: conteosPendientes.vacantes
    },
    {
      id: 'P15',
      clave: 'P15',
      etiqueta: 'Moderación',
      descripcion: 'Foros y reportes',
      pendiente: conteosPendientes.moderacion
    },
    {
      id: 'P16',
      clave: 'P16',
      etiqueta: 'Verificación Empresas',
      descripcion: 'Revisión documental',
      pendiente: conteosPendientes.verificaciones
    },
    { id: 'P19', clave: 'P19', etiqueta: 'Crear Recurso', descripcion: 'Publicar artículos' }
  ];

  const htmlElementos = elementos
    .map((item) => {
      const esActivo = pantallaActual === item.id;
      const insignia =
        item.pendiente && item.pendiente > 0
          ? `<span class="insignia-pendiente" title="${item.pendiente} pendientes">${item.pendiente}</span>`
          : '';

      return `
        <button
          type="button"
          class="boton-menu-lateral ${esActivo ? 'activo' : ''}"
          data-pantalla="${item.id}"
        >
          <div class="boton-menu-izquierda">
            <span class="menu-clave">${item.clave}</span>
            <div class="menu-textos">
              <span class="menu-etiqueta">${item.etiqueta}</span>
              <span class="menu-descripcion">${item.descripcion}</span>
            </div>
          </div>
          ${insignia}
        </button>
      `;
    })
    .join('');

  contenedor.innerHTML = `
    <div class="tarjeta-menu-lateral">
      <div class="menu-lateral-cabecera">
        <span>ADMINISTRACIÓN</span>
        <span class="menu-lateral-subetiqueta">PERSONA 3</span>
      </div>

      <nav class="lista-menu-lateral" aria-label="Menú de administración">
        ${htmlElementos}
      </nav>

      <div class="menu-lateral-pie">
        <p class="menu-pie-titulo">WorkConnect Admin</p>
        <p class="menu-pie-texto">
          Conectado en tiempo real a Supabase (PostgreSQL).
        </p>
      </div>
    </div>
  `;

  contenedor.querySelectorAll('.boton-menu-lateral').forEach((boton) => {
    boton.addEventListener('click', () => {
      const pantallaDestino = boton.getAttribute('data-pantalla');
      if (pantallaDestino) {
        alSeleccionarPantalla(pantallaDestino);
      }
    });
  });
}
