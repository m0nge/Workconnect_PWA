const identificador = '12345678-1234-1234-1234-123456789abc';

export const usuarioRevision = { id: identificador, nombre: 'Ana López', correo: 'ana@example.com', email: 'ana@example.com', rol: 'administrador', estado: 'Activo', iniciales: 'AL', fechaRegistro: '16 nov 2026' };
export const empresaRevision = {
  logoUrl: '/multimedia/icono.png', logo_url: '/multimedia/icono.png',
  id: identificador, usuario_id: identificador, nombreComercial: 'Empresa de ejemplo', nombre_comercial: 'Empresa de ejemplo',
  razonSocial: 'Empresa de ejemplo S.A.', razon_social: 'Empresa de ejemplo S.A.', nit: '0614-010101-101-0',
  sector: 'Servicios', departamento: 'San Salvador', municipio: 'San Salvador', ubicacion: 'San Salvador',
  vacantes: 2, estado: 'Pendiente', estado_verificacion: 'Verificada', iniciales: 'EE', contactoCorreo: 'empresa@example.com',
  contacto_email: 'empresa@example.com', telefono: '2222-3333', sitioWeb: 'https://example.com', tamano: '51-200 empleados',
  descripcion: 'Servicios profesionales y oportunidades de crecimiento.', calificacion: 4.5, totalResenas: 8
};
export const vacanteRevision = {
  id: identificador, empresaId: identificador, empresa_id: identificador, titulo: 'Asistente de administración',
  empresa: empresaRevision.nombreComercial, sector: 'Servicios', departamento: 'San Salvador', municipio: 'San Salvador',
  modalidad: 'Presencial', tipoContrato: 'Tiempo completo', tipo_contrato: 'Tiempo completo', salarioMin: 500, salarioMax: 800,
  salario_min: 500, salario_max: 800, plazas: 2, fechaPublicacion: '16 nov 2026', creado_en: '2026-11-16', estado: 'Activa',
  descripcion: 'Organiza documentos y da seguimiento a las tareas del equipo.', funciones: ['Organizar documentos'],
  requisitos: ['Experiencia administrativa'], beneficios: ['Capacitación continua']
};
export const recursoRevision = {
  id: identificador, titulo: 'Cómo preparar tu próxima entrevista laboral', categoria: 'Artículo', nivelLectura: 'Básico',
  tiempoLecturaMin: 5, resumen: 'Consejos prácticos para preparar tus respuestas y destacar tu experiencia.',
  contenido: 'Investiga la empresa y prepara ejemplos concretos de tus experiencias profesionales.',
  etiquetas: ['Entrevistas'], estadoPublicacion: 'Publicado', audiencia: ['Visitantes', 'Candidatos registrados'],
  adjuntos: [], imagenPortadaUrl: '', fechaCreacion: '16 nov 2026', autor: 'Equipo editorial'
};
export const temaRevision = { id: identificador, titulo: 'Consejos para una entrevista laboral', categoria: 'Desarrollo profesional', mensaje: '¿Cómo recomiendan prepararse para una primera entrevista laboral?', descripcion: '¿Cómo recomiendan prepararse para una primera entrevista laboral?', estado: 'Activo', autor: 'Ana López', respuestas: 1 };
export const datosRevision = {
  usuarios: [usuarioRevision, { ...usuarioRevision, id: 'otro', nombre: 'Pedro Pérez', rol: 'Candidato/a', estado: 'Inactivo' }],
  empresas: [empresaRevision], vacantes: [vacanteRevision], recursosLaborales: [recursoRevision],
  elementosModeracion: [{ id: identificador, tipo: 'foro', categoria: 'Foros', estado: 'Pendiente', motivoOTitulo: 'Reporte de contenido', referencia: identificador, autor: 'Sistema', fecha: '16 nov 2026', detalles: 'Contenido señalado para revisión.' },
    { id: 'postulacion-revision', tipo: 'reporte', categoria: 'Postulaciones', estado: 'Pendiente', motivoOTitulo: 'Postulación reportada', referencia: identificador, autor: 'Empresa de ejemplo', candidatoNombre: 'Persona de ejemplo', fotoUrl: '/multimedia/icono.png', fecha: '16 nov 2026', detalles: 'Reporte temporal de revisión.' }],
  solicitudesVerificacion: [{ id: identificador, empresaId: identificador, razonSocial: empresaRevision.razonSocial, nombreComercial: empresaRevision.nombreComercial, nit: empresaRevision.nit, sector: 'Servicios', tamano: empresaRevision.tamano, documentoInscripcion: 'registro.pdf', documentoIdentidad: 'identidad.pdf', correoContacto: 'empresa@example.com', telefono: '2222-3333', fechaEnvio: '16 nov 2026', estado: 'Pendiente', criterios: {}, observaciones: '' }],
  estadisticasResumen: {
    totalPostulaciones: 8, contrataciones: 2, postulacionesPorMes: [{ mes: 'Oct', cantidad: 3 }, { mes: 'Nov', cantidad: 5, destacado: true }],
    postulacionesPorEstado: [{ estado: 'Nueva', cantidad: 5, color: 'var(--color-info)' }, { estado: 'Contratada', cantidad: 3, color: 'var(--color-esmeralda)' }],
    vacantesPorSector: [{ sector: 'Servicios', cantidad: 1 }]
  }
};

export function respuestaRevision(ruta, vista) {
  if (ruta === '/api/auth/sesion' && vista === 'portada-publica') return { autenticado: false, usuario: null };
  if (ruta === '/api/datos') return datosRevision;
  if (ruta === '/api/auth/sesion') return { autenticado: true, usuario: { ...usuarioRevision, rol: vista === 'P07' ? 'candidato' : ['P08', 'P09', 'P10'].includes(vista) ? 'empresa' : 'administrador' } };
  if (ruta === '/api/admin/foros' || ruta === '/api/foros/temas') return [temaRevision];
  if (ruta.endsWith('/respuestas')) return [{ id: identificador, autor: 'Pedro Pérez', contenido: 'Prepara ejemplos de tus experiencias y revisa los requisitos.', creadoEn: '2026-11-16' }];
  if (ruta.startsWith('/api/valoraciones-empresa/')) return { valoraciones: [{ id: identificador, calificacion: 5, comentario: 'Excelente atención y oportunidades.' }] };
  if (ruta === '/api/candidato/perfil') return { perfil: { ...usuarioRevision, titulo_profesional: 'Asistente administrativo', resumen_laboral: 'Experiencia en atención y organización.', telefono: '7777-8888', ubicacion: 'San Salvador' }, experiencias: [], estudios: [], habilidades: [], alertas: [], postulaciones: [] };
  if (ruta === '/api/empresa/perfil') return { empresa: empresaRevision, usuario: usuarioRevision, conteoVacantes: 2, conteoPostulaciones: 1 };
  if (ruta === '/api/empresa/vacantes') return { vacantes: [vacanteRevision] };
  if (ruta === '/api/empresa/postulaciones') return { postulaciones: [{ id: identificador, estado: 'Nueva', creado_en: '2026-11-16', curriculum_url: '/api/empresa/postulaciones/' + identificador + '/curriculum', vacante: vacanteRevision, candidato: { nombre: usuarioRevision.nombre, email: usuarioRevision.email, telefono: '7777-8888', foto_url: '/multimedia/icono.png' } }] };
  return {};
}
