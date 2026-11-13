import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  configuracionBaseDatos,
  verificarConfiguracionBaseDatos,
  crearClienteBaseDatos,
  mapearUsuario,
  mapearEmpresa,
  mapearVacante,
  mapearModeracion,
  mapearSolicitudVerificacion,
  mapearRecurso,
  construirEstadisticasDashboard
} from './servicios/supabase.js';

const __archivoActual = fileURLToPath(import.meta.url);
const __directorioActual = path.dirname(__archivoActual);

const aplicacion = express();
const puerto = Number(process.env.PORT) || 3000;

aplicacion.use(express.json());

function obtenerClienteOError(respuesta) {
  const cliente = crearClienteBaseDatos();
  if (!cliente) {
    const { urlSupabase } = verificarConfiguracionBaseDatos();
    respuesta.status(503).json({
      requiereConfiguracion: true,
      urlSupabase,
      error:
        'Falta configurar la variable de entorno SUPABASE_SERVICE_ROLE_KEY para conectar con Supabase.'
    });
    return null;
  }
  return cliente;
}

// Estado de configuración de la base de datos (sin exponer secretos)
aplicacion.get('/api/estado-bd', (_solicitud, respuesta) => {
  const estado = verificarConfiguracionBaseDatos();
  respuesta.json({
    ...estado,
    tablas: Object.values(configuracionBaseDatos.tablas)
  });
});

// Obtener todos los datos reales desde Supabase
aplicacion.get('/api/datos', async (_solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  try {
    const [
      resUsuarios,
      resEmpresas,
      resVacantes,
      resPostulaciones,
      resModeracion,
      resVerificaciones,
      resRecursos
    ] = await Promise.all([
      supabase.from('usuarios').select('*').order('creado_en', { ascending: false }),
      supabase.from('empresas').select('*').order('creado_en', { ascending: false }),
      supabase
        .from('vacantes')
        .select('*, empresas(nombre_comercial)')
        .order('creado_en', { ascending: false }),
      supabase.from('postulaciones').select('id, estado, creado_en'),
      supabase.from('moderacion_reportes').select('*').order('creado_en', { ascending: false }),
      supabase
        .from('solicitudes_verificacion')
        .select(
          '*, empresas(nombre_comercial, razon_social, nit, sector, tamano, contacto_email, telefono)'
        )
        .order('fecha_envio', { ascending: false }),
      supabase
        .from('recursos_laborales')
        .select('*, usuarios(nombre)')
        .order('creado_en', { ascending: false })
    ]);

    const errores = [
      resUsuarios.error,
      resEmpresas.error,
      resVacantes.error,
      resPostulaciones.error,
      resModeracion.error,
      resVerificaciones.error,
      resRecursos.error
    ].filter(Boolean);

    if (errores.length > 0) {
      return respuesta.status(500).json({ error: errores[0].message });
    }

    const vacantesMapeadas = (resVacantes.data || []).map(mapearVacante);
    const conteoVacantesPorEmpresa = new Map();
    for (const vac of vacantesMapeadas) {
      conteoVacantesPorEmpresa.set(
        vac.empresaId,
        (conteoVacantesPorEmpresa.get(vac.empresaId) || 0) + 1
      );
    }

    const usuarios = (resUsuarios.data || []).map(mapearUsuario);
    const empresas = (resEmpresas.data || []).map((fila) =>
      mapearEmpresa(fila, conteoVacantesPorEmpresa.get(fila.id) || 0)
    );
    const elementosModeracion = (resModeracion.data || []).map(mapearModeracion);
    const solicitudesVerificacion = (resVerificaciones.data || []).map(
      mapearSolicitudVerificacion
    );
    const recursosLaborales = (resRecursos.data || []).map(mapearRecurso);
    const estadisticasDashboard = construirEstadisticasDashboard(
      resPostulaciones.data || [],
      vacantesMapeadas
    );

    return respuesta.json({
      usuarios,
      empresas,
      vacantes: vacantesMapeadas,
      elementosModeracion,
      solicitudesVerificacion,
      recursosLaborales,
      estadisticasDashboard
    });
  } catch (error) {
    return respuesta.status(500).json({ error: error.message || 'Error consultando Supabase.' });
  }
});

// Actualizar datos de un usuario (P12)
aplicacion.put('/api/usuarios/:id', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { nombre, correo, rol } = solicitud.body || {};

  const { data, error } = await supabase
    .from('usuarios')
    .update({
      nombre: typeof nombre === 'string' ? nombre.trim() : undefined,
      email: typeof correo === 'string' ? correo.trim() : undefined,
      rol,
      actualizado_en: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.json(mapearUsuario(data));
});

// Alternar estado activo/inactivo de un usuario (P12)
aplicacion.patch('/api/usuarios/:id/estado', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;

  const { data: actual, error: errorConsulta } = await supabase
    .from('usuarios')
    .select('estado')
    .eq('id', id)
    .single();

  if (errorConsulta || !actual) {
    return respuesta.status(404).json({ error: 'Usuario no encontrado en Supabase.' });
  }

  const nuevoEstado = actual.estado === 'Activo' ? 'Inactivo' : 'Activo';

  const { data, error } = await supabase
    .from('usuarios')
    .update({
      estado: nuevoEstado,
      actualizado_en: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.json(mapearUsuario(data));
});

// Cambiar estado de verificación de una empresa (P13)
aplicacion.patch('/api/empresas/:id/estado', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { estado } = solicitud.body || {};
  const estadosValidos = ['Verificada', 'Pendiente', 'Suspendida'];

  if (!estadosValidos.includes(estado)) {
    return respuesta.status(400).json({ error: 'Estado empresarial inválido.' });
  }

  const { data, error } = await supabase
    .from('empresas')
    .update({ estado_verificacion: estado })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  const { count } = await supabase
    .from('vacantes')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', id);

  return respuesta.json(mapearEmpresa(data, count || 0));
});

// Actualizar información de una vacante (P14)
aplicacion.put('/api/vacantes/:id', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { titulo, salarioMin, salarioMax, modalidad, tipoContrato, descripcion } =
    solicitud.body || {};

  const { data, error } = await supabase
    .from('vacantes')
    .update({
      titulo: typeof titulo === 'string' ? titulo.trim() : undefined,
      salario_min: Number(salarioMin),
      salario_max: Number(salarioMax),
      modalidad,
      tipo_contrato: tipoContrato,
      descripcion: typeof descripcion === 'string' ? descripcion.trim() : undefined
    })
    .eq('id', id)
    .select('*, empresas(nombre_comercial)')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.json(mapearVacante(data));
});

// Cambiar estado de una vacante (P14)
aplicacion.patch('/api/vacantes/:id/estado', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { estado } = solicitud.body || {};
  const estadosValidos = ['Pendiente', 'Activa', 'Inactiva'];

  if (!estadosValidos.includes(estado)) {
    return respuesta.status(400).json({ error: 'Estado de vacante inválido.' });
  }

  const { data, error } = await supabase
    .from('vacantes')
    .update({ estado })
    .eq('id', id)
    .select('*, empresas(nombre_comercial)')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.json(mapearVacante(data));
});

// Actualizar estado de un elemento de moderación (P15)
aplicacion.patch('/api/moderacion/:id/estado', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { estado } = solicitud.body || {};
  const estadosValidos = ['Pendiente', 'Aprobado', 'Oculto', 'Desestimado'];

  if (!estadosValidos.includes(estado)) {
    return respuesta.status(400).json({ error: 'Estado de moderación inválido.' });
  }

  const { data, error } = await supabase
    .from('moderacion_reportes')
    .update({ estado })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.json(mapearModeracion(data));
});

// Eliminar un elemento de moderación (P15)
aplicacion.delete('/api/moderacion/:id', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;

  const { error } = await supabase.from('moderacion_reportes').delete().eq('id', id);

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.json({ eliminado: true, id });
});

// Actualizar estado de una solicitud de verificación (P16)
aplicacion.patch('/api/verificaciones/:id/estado', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { estado, observaciones, criterios } = solicitud.body || {};
  const estadosValidos = ['Pendiente', 'Aprobada', 'Devuelta'];

  if (!estadosValidos.includes(estado)) {
    return respuesta.status(400).json({ error: 'Estado de solicitud inválido.' });
  }

  const camposActualizar = {
    estado,
    fecha_resolucion: estado === 'Pendiente' ? null : new Date().toISOString()
  };

  if (typeof observaciones === 'string') {
    camposActualizar.observaciones = observaciones;
  }

  if (criterios && typeof criterios === 'object') {
    camposActualizar.criterio_registro_vigente = Boolean(criterios.registroVigente);
    camposActualizar.criterio_nit_valido = Boolean(criterios.nitValido);
    camposActualizar.criterio_identidad_representante = Boolean(criterios.identidadRepresentante);
    camposActualizar.criterio_contacto_verificado = Boolean(criterios.contactoVerificado);
  }

  const { data: solicitudActualizada, error } = await supabase
    .from('solicitudes_verificacion')
    .update(camposActualizar)
    .eq('id', id)
    .select(
      '*, empresas(nombre_comercial, razon_social, nit, sector, tamano, contacto_email, telefono)'
    )
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  if (estado === 'Aprobada' && solicitudActualizada.empresa_id) {
    await supabase
      .from('empresas')
      .update({ estado_verificacion: 'Verificada' })
      .eq('id', solicitudActualizada.empresa_id);
  }

  const [resEmpresas, resVacantes] = await Promise.all([
    supabase.from('empresas').select('*').order('creado_en', { ascending: false }),
    supabase.from('vacantes').select('id, empresa_id')
  ]);

  const conteos = new Map();
  for (const vac of resVacantes.data || []) {
    conteos.set(vac.empresa_id, (conteos.get(vac.empresa_id) || 0) + 1);
  }

  const empresas = (resEmpresas.data || []).map((fila) =>
    mapearEmpresa(fila, conteos.get(fila.id) || 0)
  );

  return respuesta.json({
    solicitud: mapearSolicitudVerificacion(solicitudActualizada),
    empresas
  });
});

// Crear nuevo recurso laboral (P19)
aplicacion.post('/api/recursos', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const datos = solicitud.body || {};
  if (!datos.titulo || datos.titulo.trim().length < 8) {
    return respuesta.status(400).json({ error: 'El título debe tener al menos 8 caracteres.' });
  }

  const { data, error } = await supabase
    .from('recursos_laborales')
    .insert({
      titulo: datos.titulo.trim(),
      categoria: datos.categoria || 'Artículo',
      nivel_lectura: datos.nivelLectura || 'Básico',
      tiempo_lectura_min: Number(datos.tiempoLecturaMin) || 5,
      resumen: (datos.resumen || '').trim(),
      contenido: (datos.contenido || '').trim(),
      imagen_portada_url: datos.imagenPortadaUrl || null,
      adjuntos: Array.isArray(datos.adjuntos) ? datos.adjuntos : [],
      etiquetas: Array.isArray(datos.etiquetas) ? datos.etiquetas : [],
      estado_publicacion: datos.estadoPublicacion || 'Publicado',
      audiencia: Array.isArray(datos.audiencia)
        ? datos.audiencia
        : ['Visitantes', 'Candidatos registrados']
    })
    .select('*, usuarios(nombre)')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.status(201).json(mapearRecurso(data));
});

// Manejador 404 para rutas /api no definidas
aplicacion.all('/api/*', (_solicitud, respuesta) => {
  respuesta.status(404).json({ error: 'Ruta de API no encontrada.' });
});

// En ejecución local / servidor tradicional servimos archivos estáticos y escuchamos el puerto
if (!process.env.VERCEL) {
  aplicacion.use(express.static(path.join(__directorioActual, 'publico')));

  aplicacion.get('*', (_solicitud, respuesta) => {
    respuesta.sendFile(path.join(__directorioActual, 'publico', 'index.html'));
  });

  aplicacion.listen(puerto, '0.0.0.0', () => {
    console.log(`Servidor Node.js de WorkConnect activo en http://0.0.0.0:${puerto}`);
  });
}

export default aplicacion;
