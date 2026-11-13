import {
  configuracionBaseDatos,
  verificarConfiguracionBaseDatos,
  crearClienteBaseDatos
} from '../configuracion/baseDatos.js';

export { configuracionBaseDatos, verificarConfiguracionBaseDatos, crearClienteBaseDatos };

export function obtenerIniciales(texto) {
  if (!texto) return 'WC';
  const partes = String(texto)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export function formatearFechaCorta(fechaIso) {
  if (!fechaIso) return 'Sin fecha';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';

  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dia = fecha.getUTCDate();
  const mes = meses[fecha.getUTCMonth()];
  const anio = fecha.getUTCFullYear();
  return `${dia} ${mes} ${anio}`;
}

export function mapearUsuario(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.email,
    rol: fila.rol,
    fechaRegistro: formatearFechaCorta(fila.creado_en),
    estado: fila.estado,
    iniciales: obtenerIniciales(fila.nombre),
    telefono: fila.telefono || '',
    ubicacion: fila.ubicacion || ''
  };
}

export function mapearEmpresa(fila, conteoVacantes = 0) {
  return {
    id: fila.id,
    nombreComercial: fila.nombre_comercial,
    razonSocial: fila.razon_social,
    nit: fila.nit,
    sector: fila.sector,
    departamento: fila.departamento,
    municipio: fila.municipio,
    ubicacion: `${fila.municipio}, ${fila.departamento}`,
    vacantes: conteoVacantes,
    estado: fila.estado_verificacion,
    iniciales: obtenerIniciales(fila.nombre_comercial),
    contactoCorreo: fila.contacto_email,
    telefono: fila.telefono,
    sitioWeb: fila.sitio_web || '',
    tamano: fila.tamano || 'No especificado',
    descripcion: fila.descripcion || '',
    calificacion: Number(fila.calificacion_promedio || 0),
    totalResenas: Number(fila.total_resenas || 0)
  };
}

export function mapearVacante(fila) {
  const nombreEmpresa = fila.empresas?.nombre_comercial || 'Empresa registrada';
  return {
    id: fila.id,
    titulo: fila.titulo,
    empresa: nombreEmpresa,
    empresaId: fila.empresa_id,
    sector: fila.sector,
    departamento: fila.departamento,
    municipio: fila.municipio,
    modalidad: fila.modalidad,
    tipoContrato: fila.tipo_contrato,
    salarioMin: Number(fila.salario_min || 0),
    salarioMax: Number(fila.salario_max || 0),
    plazas: Number(fila.plazas || 1),
    fechaPublicacion: formatearFechaCorta(fila.creado_en),
    estado: fila.estado,
    descripcion: fila.descripcion || '',
    funciones: Array.isArray(fila.funciones) ? fila.funciones : [],
    requisitos: Array.isArray(fila.requisitos) ? fila.requisitos : [],
    beneficios: Array.isArray(fila.beneficios) ? fila.beneficios : []
  };
}

export function mapearModeracion(fila) {
  return {
    id: fila.id,
    tipo: fila.tipo,
    categoria: fila.categoria,
    motivoOTitulo: fila.motivo_titulo,
    referencia: fila.referencia,
    autor: fila.autor_nombre,
    fecha: formatearFechaCorta(fila.creado_en),
    estado: fila.estado,
    detalles: fila.detalles
  };
}

export function mapearSolicitudVerificacion(fila) {
  const empresaRel = fila.empresas || {};
  return {
    id: fila.id,
    empresaId: fila.empresa_id,
    razonSocial: empresaRel.razon_social || 'Razón social no registrada',
    nombreComercial: empresaRel.nombre_comercial || 'Empresa',
    nit: empresaRel.nit || 'Sin NIT',
    sector: empresaRel.sector || 'Sin sector',
    tamano: empresaRel.tamano || 'No especificado',
    documentoInscripcion: fila.documento_inscripcion,
    documentoIdentidad: fila.documento_identidad,
    correoContacto: empresaRel.contacto_email || '',
    telefono: empresaRel.telefono || '',
    fechaEnvio: formatearFechaCorta(fila.fecha_envio),
    fechaEnvioIso: fila.fecha_envio || null,
    fechaResolucionIso: fila.fecha_resolucion || null,
    estado: fila.estado,
    criterios: {
      registroVigente: Boolean(fila.criterio_registro_vigente),
      nitValido: Boolean(fila.criterio_nit_valido),
      identidadRepresentante: Boolean(fila.criterio_identidad_representante),
      contactoVerificado: Boolean(fila.criterio_contacto_verificado)
    },
    observaciones: fila.observaciones || ''
  };
}

export function mapearRecurso(fila) {
  return {
    id: fila.id,
    titulo: fila.titulo,
    categoria: fila.categoria,
    nivelLectura: fila.nivel_lectura || 'Básico',
    tiempoLecturaMin: Number(fila.tiempo_lectura_min || 5),
    resumen: fila.resumen,
    contenido: fila.contenido,
    imagenPortadaUrl: fila.imagen_portada_url || '',
    adjuntos: Array.isArray(fila.adjuntos) ? fila.adjuntos : [],
    etiquetas: Array.isArray(fila.etiquetas) ? fila.etiquetas : [],
    estadoPublicacion: fila.estado_publicacion || 'Publicado',
    audiencia: Array.isArray(fila.audiencia) ? fila.audiencia : [],
    fechaCreacion: formatearFechaCorta(fila.creado_en),
    autor: fila.usuarios?.nombre || 'Equipo Editorial WorkConnect'
  };
}

export function construirEstadisticasDashboard(postulaciones, vacantes) {
  const totalPostulaciones = postulaciones.length;
  const contrataciones = postulaciones.filter((p) => p.estado === 'Contratada').length;

  const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mapaMeses = new Map();

  for (const post of postulaciones) {
    const fecha = new Date(post.creado_en);
    if (Number.isNaN(fecha.getTime())) continue;
    const clave = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth()).padStart(2, '0')}`;
    const etiqueta = nombresMeses[fecha.getUTCMonth()];
    const actual = mapaMeses.get(clave) || { clave, mes: etiqueta, cantidad: 0 };
    actual.cantidad += 1;
    mapaMeses.set(clave, actual);
  }

  let postulacionesPorMes = Array.from(mapaMeses.values())
    .sort((a, b) => a.clave.localeCompare(b.clave))
    .slice(-6)
    .map((item, indice, arreglo) => ({
      mes: item.mes,
      cantidad: item.cantidad,
      destacado: indice === arreglo.length - 1
    }));

  if (postulacionesPorMes.length === 0) {
    const mesActual = new Date().getUTCMonth();
    postulacionesPorMes = [];
    for (let i = 5; i >= 0; i -= 1) {
      const idx = (mesActual - i + 12) % 12;
      postulacionesPorMes.push({
        mes: nombresMeses[idx],
        cantidad: 0,
        destacado: i === 0
      });
    }
  }

  const definicionEstados = [
    { estado: 'Nueva', color: '#94a3b8' },
    { estado: 'En revisión', color: '#38bdf8' },
    { estado: 'Entrevista', color: '#f59e0b' },
    { estado: 'Contratada', color: '#10b981' },
    { estado: 'Rechazada', color: '#ef4444' }
  ];

  const postulacionesPorEstado = definicionEstados.map((def) => {
    const cantidad = postulaciones.filter((p) => p.estado === def.estado).length;
    const porcentaje = totalPostulaciones > 0 ? Math.round((cantidad / totalPostulaciones) * 100) : 0;
    return {
      estado: def.estado,
      cantidad,
      porcentaje,
      color: def.color
    };
  });

  const mapaSectores = new Map();
  for (const vacante of vacantes) {
    if (vacante.estado !== 'Activa') continue;
    const sector = vacante.sector || 'Otros';
    mapaSectores.set(sector, (mapaSectores.get(sector) || 0) + 1);
  }

  const vacantesPorSector = Array.from(mapaSectores.entries())
    .map(([sector, cantidad]) => ({ sector, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return {
    totalPostulaciones,
    contrataciones,
    postulacionesPorMes,
    postulacionesPorEstado,
    vacantesPorSector
  };
}
