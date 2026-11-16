export const estadosProcesos = ['Nueva', 'En revisión', 'Entrevista', 'Contratada', 'Rechazada'];

export function contarProcesos(postulaciones = []) {
  return Object.fromEntries(estadosProcesos.map((estado) => [estado, postulaciones.filter((postulacion) => postulacion.estado === estado).length]));
}

export function resumirCandidato(datos) {
  const perfil = datos.perfil || {};
  const postulaciones = datos.postulaciones || [];
  const campos = ['telefono', 'ubicacion', 'titulo_profesional', 'resumen_laboral'];
  return {
    postulaciones: postulaciones.length,
    procesos: contarProcesos(postulaciones),
    porcentajePerfil: Math.round(campos.filter((campo) => String(perfil[campo] || '').trim()).length / campos.length * 100),
    tieneCurriculum: Boolean(perfil.curriculum_nombre),
    alertasActivas: (datos.alertas || []).filter((alerta) => alerta.activa).length
  };
}

export function resumirEmpresa(vacantes = [], postulaciones = []) {
  return {
    ofertas: vacantes.length,
    activas: vacantes.filter((vacante) => vacante.estado === 'Activa').length,
    inactivas: vacantes.filter((vacante) => vacante.estado === 'Inactiva').length,
    postulaciones: postulaciones.length,
    procesos: contarProcesos(postulaciones)
  };
}
