export function renderizarMenuLateral(
  contenedor,
  pantallaActual,
  conteosPendientes,
  alSeleccionarPantalla,
  rolActual = 'visitante'
) {
  if (!contenedor) return;
  const elementos = [
    { id: 'P02', etiqueta: 'Resultados', descripcion: 'Buscar vacantes', roles: ['visitante', 'candidato', 'empresa', 'administrador'] },
    { id: 'P04', etiqueta: 'Recursos', descripcion: 'Consejos y tutoriales', roles: ['visitante', 'candidato', 'empresa'] },
    { id: 'P05', etiqueta: 'Foros', descripcion: 'Comunidad laboral', roles: ['visitante', 'candidato', 'empresa', 'administrador'] },
    { id: 'P17', etiqueta: 'Publicados', descripcion: 'Catálogo de recursos', roles: ['visitante', 'candidato', 'empresa'] },
    { id: 'P28', etiqueta: 'Crear tema', descripcion: 'Abrir discusión', roles: ['candidato', 'administrador'] },
    { id: 'P11', etiqueta: 'Resumen', descripcion: 'Métricas generales', roles: ['administrador'] },
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
    { id: 'P19', etiqueta: 'Recursos', descripcion: 'Publicar artículos', roles: ['administrador'] }
  ];

  const htmlElementos = elementos
    .filter((elementoLista) => elementoLista.roles.includes(rolActual))
    .map((elementoLista) => {
      const esActivo = pantallaActual === elementoLista.id;
      const insignia =
        elementoLista.pendiente && elementoLista.pendiente > 0
          ? `<span class="insignia-pendiente" title="${elementoLista.pendiente} pendientes">${elementoLista.pendiente}</span>`
          : '';

      return `
        <button
          type="button"
          class="boton-menu-lateral ${esActivo ? 'activo' : ''}"
          data-pantalla="${elementoLista.id}"
        >
          <div class="boton-menu-izquierda">
            <div class="menu-textos">
              <span class="menu-etiqueta">${elementoLista.etiqueta}</span>
              <span class="menu-descripcion">${elementoLista.descripcion}</span>
            </div>
          </div>
          ${insignia}
        </button>
      `;
    })
    .join('');

  const textoSubetiqueta =
    rolActual === 'administrador'
      ? 'Administrador/a'
      : rolActual === 'candidato'
        ? 'Candidato/a'
        : rolActual === 'empresa'
          ? 'Empresa'
          : 'Visitante';

  contenedor.innerHTML = `
    <div class="tarjeta-menu-lateral">
      <div class="menu-lateral-cabecera">
        <span>${rolActual === 'administrador' ? 'ADMINISTRACIÓN' : 'MI PORTAL'}</span>
        <span class="menu-lateral-subetiqueta">${textoSubetiqueta}</span>
      </div>

      <nav class="lista-menu-lateral" aria-label="Menú de administración">
        ${htmlElementos}
      </nav>

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
