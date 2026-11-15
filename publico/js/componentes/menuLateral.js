export function renderizarMenuLateral(
  contenedor,
  pantallaActual,
  conteosPendientes,
  alSeleccionarPantalla,
  rolActual = 'visitante'
) {
  const elementos = [
    { id: 'P01', etiqueta: 'Inicio', descripcion: 'Buscar empleo', roles: ['visitante', 'candidato', 'empresa'] },
    { id: 'P02', etiqueta: 'Resultados', descripcion: 'Buscar vacantes', roles: ['visitante', 'candidato', 'empresa'] },
    { id: 'P04', etiqueta: 'Recursos', descripcion: 'Consejos y tutoriales', roles: ['visitante', 'candidato', 'empresa'] },
    { id: 'P05', etiqueta: 'Foros', descripcion: 'Comunidad laboral', roles: ['visitante', 'candidato', 'empresa'] },
    { id: 'P17', etiqueta: 'Publicados', descripcion: 'Catálogo de recursos', roles: ['visitante', 'candidato', 'empresa'] },
    { id: 'P28', etiqueta: 'Crear tema', descripcion: 'Abrir discusión', roles: ['candidato', 'empresa'] },
    { id: 'P11', etiqueta: 'Dashboard', descripcion: 'Métricas generales', roles: ['administrador'] },
    { id: 'P12', etiqueta: 'Usuarios', descripcion: 'Gestión de cuentas', roles: ['administrador'] },
    {
      id: 'P13',
      etiqueta: 'Empresas',
      descripcion: 'Directorio empresarial',
      roles: ['administrador'],
      pendiente: conteosPendientes.empresas
    },
    {
      id: 'P14',
      etiqueta: 'Vacantes',
      descripcion: 'Ofertas publicadas',
      roles: ['administrador'],
      pendiente: conteosPendientes.vacantes
    },
    {
      id: 'P15',
      etiqueta: 'Moderación',
      descripcion: 'Foros y reportes',
      roles: ['administrador'],
      pendiente: conteosPendientes.moderacion
    },
    {
      id: 'P16',
      etiqueta: 'Verificación Empresas',
      descripcion: 'Revisión documental',
      roles: ['administrador'],
      pendiente: conteosPendientes.verificaciones
    },
    { id: 'P19', etiqueta: 'Crear Recurso', descripcion: 'Publicar artículos', roles: ['administrador'] }
  ];

  const htmlElementos = elementos
    .filter((item) => item.roles.includes(rolActual))
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
        <span>${rolActual === 'administrador' ? 'ADMINISTRACIÓN' : 'MI PORTAL'}</span>
        <span class="menu-lateral-subetiqueta">${rolActual}</span>
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
