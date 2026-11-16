import { guardarFoto } from './servicios/fotos.js';
import { quitarCurriculum } from './servicios/curriculum.js';
import { validarVacanteEmpresa, registrarEdicionVacanteEmpresa } from './servicios/vacantesEmpresa.js';
import { crearUsuarioRegistrado, eliminarRegistroIncompleto } from './servicios/registro.js';
import 'dotenv/config';
import express from 'express';
import { registrarFlujoPostulaciones } from './servicios/flujoPostulaciones.js';
import { crearControlAcceso, esUuid, esTexto, esCorreo, esTelefono, esUrlWeb, esNumeroCampo, esPortadaRecurso } from './servicios/validaciones.js';
import { registrarGestionContenido } from './servicios/gestionContenido.js';
import { reportarAutomaticamente, destinoModeracion } from './servicios/moderacion.js';
import { randomUUID as crearIdentificador } from 'node:crypto';
import { crearTokenSesion, validarTokenSesion, duracionSesion } from './servicios/sesion.js';
import rutasArchivos from 'node:path';
import { fileURLToPath as convertirUrlARuta } from 'node:url';
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
  construirEstadisticasResumen
} from './servicios/supabase.js';

const __archivoActual = convertirUrlARuta(import.meta.url);
const __directorioActual = rutasArchivos.dirname(__archivoActual);

const aplicacion = express();
const puerto = Number(process.env.PORT) || 3000;
const depositoCurriculums = 'curriculums-candidatos';
const tamanoMaximoCurriculum = 5 * 1024 * 1024;
const tamanoMaximoFotoCandidato = 10 * 1024 * 1024;

aplicacion.use(express.json({ limit: '10mb' }));
aplicacion.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

function conManejoErrores(manejador) {
  return (solicitud, respuesta, siguiente) => {
    Promise.resolve(manejador(solicitud, respuesta, siguiente)).catch(siguiente);
  };
}

function analizarArchivoPdf(solicitud, respuesta, siguiente) {
  express.raw({ type: 'application/pdf', limit: tamanoMaximoCurriculum })(
    solicitud,
    respuesta,
    (error) => {
      if (error?.type === 'entity.too.large') {
        return respuesta.status(413).json({ error: 'El PDF no puede superar los 5 MB.' });
      }
      if (error) return siguiente(error);
      return siguiente();
    }
  );
}

function leerCookie(solicitud, nombre) {
  const cookies = solicitud.headers.cookie || '';
  const entrada = cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${nombre}=`));
  if (!entrada) return '';
  try {
    return decodeURIComponent(entrada.slice(nombre.length + 1));
  } catch {
    return '';
  }
}

function atributosCookie(solicitud, maxAge) {
  const segura = process.env.NODE_ENV === 'production' || solicitud.secure;
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${segura ? '; Secure' : ''}`;
}

function guardarCookiesSesion(solicitud, respuesta, usuario) {
  const token = crearTokenSesion(usuario.id);
  respuesta.append('Set-Cookie',
    `workconnect-session=${encodeURIComponent(token)}; ${atributosCookie(solicitud, duracionSesion)}`);
}

function borrarCookiesSesion(solicitud, respuesta) {
  respuesta.append('Set-Cookie', `workconnect-session=; ${atributosCookie(solicitud, 0)}`);
  respuesta.append(
    'Set-Cookie',
    `workconnect-access=; ${atributosCookie(solicitud, 0)}`
  );
  respuesta.append(
    'Set-Cookie',
    `workconnect-refresh=; ${atributosCookie(solicitud, 0)}`
  );
}

function normalizarRol(rol) {
  const limpio = String(rol || '').trim().toLowerCase();
  const sinTildes = limpio.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (limpio === 'candidato' || limpio === 'candidato/a' || sinTildes === 'candidato' || sinTildes === 'candidato/a') return 'candidato';
  if (limpio === 'empresa' || sinTildes === 'empresa') return 'empresa';
  if (
    limpio === 'administrador' ||
    limpio === 'administrador/a' ||
    limpio === 'administración' ||
    limpio === 'administración/a' ||
    limpio === 'admin' ||
    sinTildes === 'administrador' ||
    sinTildes === 'administrador/a' ||
    sinTildes === 'administracion' ||
    sinTildes === 'administracion/a' ||
    sinTildes === 'admin'
  ) return 'administrador';
  return 'visitante';
}

function mapearCuenta(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.email,
    rol: normalizarRol(usuario.rol),
    foto_url: usuario.foto_url || ''
  };
}

async function obtenerContextoAutenticado(solicitud, respuesta, opcional = false) {
  if (solicitud.contextoAutenticado) return solicitud.contextoAutenticado;
  const token = leerCookie(solicitud, 'workconnect-session');
  const sesion = validarTokenSesion(token);
  if (!sesion) {
    if (token) borrarCookiesSesion(solicitud, respuesta);
    if (!opcional) respuesta.status(401).json({ error: 'Inicia sesión para continuar.' });
    return null;
  }
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return null;
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol, estado, foto_url')
    .eq('id', sesion.usuarioId)
    .maybeSingle();

  if (error) {
    respuesta.status(500).json({ error: 'No se pudo validar el perfil de la cuenta.' });
    return null;
  }
  if (!usuario) {
    respuesta.status(403).json({
      error: 'La cuenta autenticada aún no está vinculada con un perfil de WorkConnect.'
    });
    return null;
  }
  if (usuario.estado !== 'Activo') {
    borrarCookiesSesion(solicitud, respuesta);
    respuesta.status(403).json({ error: 'La cuenta está inactiva. Contacta con soporte.' });
    return null;
  }

  solicitud.contextoAutenticado = { supabase, usuario, rol: normalizarRol(usuario.rol) };
  return solicitud.contextoAutenticado;
}

async function exigirRol(solicitud, respuesta, rolesPermitidos) {
  const contexto = await obtenerContextoAutenticado(solicitud, respuesta);
  if (!contexto) return null;
  if (!rolesPermitidos.includes(contexto.rol)) {
    respuesta.status(403).json({ error: 'Tu cuenta no tiene permisos para esta operación.' });
    return null;
  }
  return contexto;
}

async function asegurarPerfilCandidato(supabase, usuarioId) {
  const { data: existente, error: errorConsulta } = await supabase
    .from('perfiles_candidatos')
    .select('id, usuario_id, titulo_profesional, resumen_laboral, curriculum_nombre, curriculum_url')
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (errorConsulta) throw new Error('No se pudo consultar el perfil del candidato.');
  if (existente) return existente;

  const { data: datosRespuesta, error } = await supabase
    .from('perfiles_candidatos')
    .insert({ usuario_id: usuarioId })
    .select('id, usuario_id, titulo_profesional, resumen_laboral, curriculum_nombre, curriculum_url')
    .single();
  if (error) throw new Error('No se pudo preparar el perfil del candidato.');
  return datosRespuesta;
}

async function asegurarPerfilEmpresa(supabase, usuario, datosExtra = {}) {
  const { data: existente, error: errorConsulta } = await supabase
    .from('empresas')
    .select('id, usuario_id, nombre_comercial, razon_social, nit, sector, departamento, municipio, direccion, tamano, contacto_email, telefono, sitio_web, descripcion, estado_verificacion, logo_url')
    .eq('usuario_id', usuario.id)
    .maybeSingle();

  if (errorConsulta) {
    throw new Error('No se pudo consultar el perfil de la empresa.');
  }
  if (existente) return existente;

  const nombre = datosExtra.nombre || datosExtra.nombre_comercial || usuario.nombre || 'Empresa';
  const { data: datosRespuesta, error } = await supabase
    .from('empresas')
    .insert({
      usuario_id: usuario.id,
      nombre_comercial: nombre,
      razon_social: datosExtra.razon_social || nombre,
      nit: datosExtra.nit || '0000-000000-000-0',
      sector: datosExtra.sector || 'Servicios',
      departamento: datosExtra.departamento || usuario.ubicacion || 'San Salvador',
      municipio: datosExtra.municipio || 'San Salvador',
      direccion: datosExtra.direccion || null,
      tamano: datosExtra.tamano || '51-200 empleados',
      contacto_email: datosExtra.contacto_email || usuario.email,
      telefono: datosExtra.telefono || usuario.telefono || '2200-0000',
      sitio_web: datosExtra.sitio_web || null,
      descripcion: datosExtra.descripcion || 'Empresa registrada en WorkConnect.',
      estado_verificacion: 'Pendiente'
    })
    .select()
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo crear el perfil de la empresa.');
  }
  return datosRespuesta;
}

async function obtenerEmpresaAutenticada(solicitud, respuesta) {
  const contexto = await exigirRol(solicitud, respuesta, ['empresa']);
  if (!contexto) return null;
  respuesta.set('Cache-Control', 'no-store');

  try {
    const empresa = await asegurarPerfilEmpresa(contexto.supabase, contexto.usuario);
    if (!empresa) {
      respuesta.status(500).json({ error: 'No se pudo obtener el perfil de la empresa.' });
      return null;
    }
    return { ...contexto, empresa };
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
    return null;
  }
}

async function obtenerCandidatoAutenticado(solicitud, respuesta) {
  const contexto = await exigirRol(solicitud, respuesta, ['candidato']);
  if (!contexto) return null;
  respuesta.set('Cache-Control', 'no-store');

  try {
    const perfil = await asegurarPerfilCandidato(contexto.supabase, contexto.usuario.id);
    return { ...contexto, perfil };
  } catch (error) {
    respuesta.status(500).json({ error: error.message });
    return null;
  }
}

const tablasCandidato = {
  experiencias: {
    tabla: 'experiencias_laborales',
    campos: ['puesto', 'empresa', 'fecha_inicio', 'fecha_fin', 'es_trabajo_actual', 'descripcion'],
    requeridos: ['puesto', 'empresa', 'fecha_inicio']
  },
  estudios: {
    tabla: 'estudios_candidatos',
    campos: ['carrera_programa', 'institucion', 'nivel_academico', 'anio_inicio', 'anio_fin'],
    requeridos: ['carrera_programa', 'institucion', 'nivel_academico', 'anio_inicio']
  },
  habilidades: {
    tabla: 'habilidades_candidatos',
    campos: ['habilidad', 'nivel_dominio'],
    requeridos: ['habilidad']
  },
  alertas: {
    tabla: 'alertas_laborales',
    campos: ['nombre_alerta', 'sector', 'modalidad', 'salario_minimo', 'frecuencia', 'activa'],
    requeridos: ['nombre_alerta', 'sector']
  }
};

function normalizarRegistroCandidato(tipo, datos, parcial = false) {
  const configuracion = Object.hasOwn(tablasCandidato, tipo) ? tablasCandidato[tipo] : null;
  if (!configuracion || !datos || typeof datos !== 'object' || Array.isArray(datos)) {
    return null;
  }

  const registro = {};
  for (const campo of configuracion.campos) {
    if (!Object.hasOwn(datos, campo)) continue;
    registro[campo] = datos[campo];
  }
  if (!parcial && configuracion.requeridos.some((campo) => !Object.hasOwn(registro, campo))) {
    return null;
  }

  const limitesTexto = {
    puesto: 120,
    empresa: 120,
    carrera_programa: 160,
    institucion: 160,
    nivel_academico: 80,
    habilidad: 80,
    nombre_alerta: 100,
    sector: 100,
    frecuencia: 20,
    descripcion: 1000
  };
  for (const campo of Object.keys(limitesTexto)) {
    if (Object.hasOwn(registro, campo) && registro[campo] !== null) {
      if (typeof registro[campo] !== 'string') return null;
      registro[campo] = registro[campo].trim();
      if (!registro[campo] && configuracion.requeridos.includes(campo)) return null;
      if (registro[campo].length > limitesTexto[campo]) return null;
    }
  }

  const fechaValida = (valor) =>
    typeof valor === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) &&
    new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
  if (Object.hasOwn(registro, 'fecha_inicio') && !fechaValida(registro.fecha_inicio)) return null;
  if (Object.hasOwn(registro, 'fecha_fin')) {
    if (registro.fecha_fin === '') registro.fecha_fin = null;
    if (registro.fecha_fin !== null && !fechaValida(registro.fecha_fin)) return null;
  }
  if (registro.fecha_inicio && registro.fecha_fin && registro.fecha_fin < registro.fecha_inicio) return null;
  for (const campo of ['anio_inicio', 'anio_fin']) {
    if (Object.hasOwn(registro, campo) && registro[campo] !== null && registro[campo] !== '') {
      registro[campo] = Number(registro[campo]);
      if (!Number.isInteger(registro[campo]) || registro[campo] < 1900 || registro[campo] > 2200) return null;
    } else if (Object.hasOwn(registro, campo)) {
      registro[campo] = null;
    }
  }
  for (const campo of ['es_trabajo_actual', 'activa']) {
    if (!Object.hasOwn(registro, campo)) continue;
    if (registro[campo] === 'true') registro[campo] = true;
    if (registro[campo] === 'false') registro[campo] = false;
    if (typeof registro[campo] !== 'boolean') return null;
  }
  if (registro.es_trabajo_actual) registro.fecha_fin = null;
  if (Object.hasOwn(registro, 'modalidad') && ![null, '', 'Presencial', 'Híbrido', 'Remoto'].includes(registro.modalidad)) {
    return null;
  }
  if (registro.modalidad === '') registro.modalidad = null;
  if (Object.hasOwn(registro, 'salario_minimo')) {
    if (registro.salario_minimo === '') registro.salario_minimo = null;
    if (registro.salario_minimo !== null) {
      registro.salario_minimo = Number(registro.salario_minimo);
      if (!Number.isFinite(registro.salario_minimo) || registro.salario_minimo < 0) return null;
    }
  }
  if (Object.hasOwn(registro, 'nivel_dominio') && !['Básico', 'Intermedio', 'Avanzado'].includes(registro.nivel_dominio)) {
    return null;
  }
  if (Object.hasOwn(registro, 'frecuencia') && !['Diaria', 'Semanal', 'Mensual'].includes(registro.frecuencia)) {
    return null;
  }
  if (registro.anio_inicio && registro.anio_fin && registro.anio_fin < registro.anio_inicio) return null;
  return registro;
}

aplicacion.use('/api', conManejoErrores(crearControlAcceso(obtenerContextoAutenticado)));
aplicacion.use('/api', (solicitud, respuesta, siguiente) => {
  if (solicitud.is('application/json') && (solicitud.body === null || typeof solicitud.body !== 'object' || Array.isArray(solicitud.body))) {
    return respuesta.status(400).json({ error: 'Envía un objeto JSON válido.' });
  }
  siguiente();
});
aplicacion.param('id', (_solicitud, respuesta, siguiente, id) => {
  if (!esUuid(id)) return respuesta.status(400).json({ error: 'El identificador no es válido.' });
  siguiente();
});

aplicacion.post('/api/auth/registro', conManejoErrores(async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;
  const { nombre, email: correoSolicitud, password: contrasenaSolicitud, rol, telefono, departamento, municipio } = solicitud.body || {};
  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
  const correo = typeof correoSolicitud === 'string' ? correoSolicitud.trim().toLowerCase() : '';
  if (!esCorreo(correo) || !esTelefono(telefono, rol === 'empresa') ||
      (rol === 'empresa' && (!esTexto(solicitud.body.sector, 2, 100) || !esTexto(departamento, 2, 100) || !esTexto(municipio, 2, 100) ||
       !esTexto(solicitud.body.nit, 10, 25) || !esTexto(solicitud.body.tamano, 2, 80)))) {
    return respuesta.status(400).json({ error: 'Revisa correo, teléfono y los datos obligatorios de la empresa.' });
  }
  if (nombreLimpio.length < 3 || nombreLimpio.length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      typeof contrasenaSolicitud !== 'string' || contrasenaSolicitud.length < 6 ||
      Buffer.byteLength(contrasenaSolicitud, 'utf8') > 72 || !['candidato', 'empresa'].includes(rol)) {
    return respuesta.status(400).json({
      error: 'Revisa nombre, correo y tipo de cuenta. La contraseña debe tener al menos 6 caracteres y un máximo de 72 bytes.'
    });
  }
  const ubicacion = [municipio, departamento].filter((valor) => typeof valor === 'string' && valor.trim()).join(', ') || null;
  const { data: usuario, error } = await crearUsuarioRegistrado(supabase, {
    nombre: nombreLimpio, correo, contrasena: contrasenaSolicitud, rol,
    telefono: typeof telefono === 'string' ? telefono.trim() : null, ubicacion
  });
  if (error) {
    if (error.code !== '23505') console.error('Error al crear la cuenta.', { code: error.code });
    return respuesta.status(error.code === '23505' ? 409 : 503).json({
      error: error.code === '23505' ? 'Ya existe una cuenta con ese correo.' : 'No se pudo crear la cuenta. Verifica la configuración de registro.'
    });
  }
  if (!usuario?.id) return respuesta.status(503).json({ error: 'No se pudo obtener la cuenta creada.' });
  try {
    if (rol === 'candidato') {
      await asegurarPerfilCandidato(supabase, usuario.id);
    } else {
      const empresa = await asegurarPerfilEmpresa(supabase, usuario, {
        ...solicitud.body, nombre: nombreLimpio, contacto_email: correo
      });
      if (!empresa) throw new Error('No se pudo preparar el perfil de empresa.');
    }
  } catch {
    const eliminado = await eliminarRegistroIncompleto(supabase, usuario.id);
    return respuesta.status(503).json({ error: eliminado
      ? 'No se pudo preparar el perfil y no se guardó la cuenta. Intenta de nuevo.'
      : 'No se pudo completar el perfil. La cuenta quedó creada; intenta iniciar sesión.' });
  }
  try {
    await reportarAutomaticamente(supabase, { texto: nombreLimpio, tipo: 'reporte', categoria: 'Reportes', origen: 'usuarios', id: usuario.id, autor: usuario.nombre });
  } catch { console.error('La cuenta se guardó, pero no se pudo generar su reporte de moderación.'); }
  respuesta.set('Cache-Control', 'no-store');
  guardarCookiesSesion(solicitud, respuesta, usuario);
  return respuesta.status(201).json({ usuario: mapearCuenta(usuario), confirmacionRequerida: false });
}));

aplicacion.post('/api/auth/login', conManejoErrores(async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;
  const { email: correoSolicitud, password: contrasenaSolicitud } = solicitud.body || {};
  const correo = typeof correoSolicitud === 'string' ? correoSolicitud.trim().toLowerCase() : '';
  if (!esCorreo(correo) || typeof contrasenaSolicitud !== 'string' || !contrasenaSolicitud || contrasenaSolicitud.length > 80) {
    return respuesta.status(400).json({ error: 'Escribe un correo y una contraseña válidos.' });
  }

  const { data: datosRespuesta, error } = await supabase.rpc('login_prueba', {
    p_email: correo,
    p_password: contrasenaSolicitud
  });
  if (error) {
    const credencialesInvalidas = ['P0001', '28000', '28P01'].includes(error.code);
    if (!credencialesInvalidas) console.error('Error ejecutando login_prueba.', { code: error.code });
    return respuesta.status(credencialesInvalidas ? 401 : 503).json({
      error: credencialesInvalidas ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión. Intenta de nuevo.'
    });
  }
  const usuario = Array.isArray(datosRespuesta) ? (datosRespuesta.length === 1 ? datosRespuesta[0] : null) : datosRespuesta;
  if (!usuario?.id) {
    return respuesta.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  if (usuario.estado !== 'Activo') {
    return respuesta.status(403).json({ error: 'La cuenta está inactiva. Contacta con soporte.' });
  }

  const rolNorm = normalizarRol(usuario.rol);
  if (rolNorm === 'candidato') {
    try {
      await asegurarPerfilCandidato(supabase, usuario.id);
    } catch (errorPerfil) {
      return respuesta.status(500).json({ error: errorPerfil.message });
    }
  } else if (rolNorm === 'empresa') {
    try {
      await asegurarPerfilEmpresa(supabase, usuario);
    } catch (errorEmpresa) {
      console.error('No se pudo asegurar el perfil de empresa.');
      return respuesta.status(503).json({ error: 'No se pudo preparar el perfil de empresa. Intenta de nuevo.' });
    }
  }

  respuesta.set('Cache-Control', 'no-store');
  guardarCookiesSesion(solicitud, respuesta, usuario);
  return respuesta.json({ usuario: mapearCuenta(usuario) });
}));

aplicacion.get('/api/auth/sesion', conManejoErrores(async (solicitud, respuesta) => {
  respuesta.set('Cache-Control', 'no-store');
  const contexto = await obtenerContextoAutenticado(solicitud, respuesta, true);
  if (respuesta.headersSent) return;
  return respuesta.json({ autenticado: Boolean(contexto), usuario: contexto ? mapearCuenta(contexto.usuario) : null });
}));

aplicacion.post('/api/auth/logout', conManejoErrores(async (solicitud, respuesta) => {
  borrarCookiesSesion(solicitud, respuesta);
  return respuesta.json({ cerrado: true });
}));

aplicacion.use(
  ['/api/usuarios', '/api/empresas', '/api/vacantes', '/api/moderacion', '/api/verificaciones', '/api/recursos'],
  conManejoErrores(async (solicitud, respuesta, siguiente) => {
    const contexto = await exigirRol(solicitud, respuesta, ['administrador']);
    if (!contexto) return;
    respuesta.set('Cache-Control', 'no-store');
    solicitud.contextoAutenticado = contexto;
    return siguiente();
  })
);

aplicacion.get('/api/candidato/perfil', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  const candidatoId = contexto.perfil.id;
  const [
    experiencias,
    estudios,
    habilidades,
    alertas,
    postulaciones
  ] = await Promise.all([
    contexto.supabase.from('experiencias_laborales').select('id, puesto, empresa, fecha_inicio, fecha_fin, es_trabajo_actual, descripcion').eq('candidato_id', candidatoId).order('fecha_inicio', { ascending: false }),
    contexto.supabase.from('estudios_candidatos').select('id, carrera_programa, institucion, nivel_academico, anio_inicio, anio_fin').eq('candidato_id', candidatoId).order('anio_inicio', { ascending: false }),
    contexto.supabase.from('habilidades_candidatos').select('id, habilidad, nivel_dominio').eq('candidato_id', candidatoId).order('habilidad'),
    contexto.supabase.from('alertas_laborales').select('id, nombre_alerta, sector, modalidad, salario_minimo, frecuencia, activa').eq('candidato_id', candidatoId).order('nombre_alerta'),
    contexto.supabase.from('postulaciones').select('id, estado, creado_en, vacante:vacantes!inner(id, titulo, modalidad)').eq('candidato_id', candidatoId).order('creado_en', { ascending: false })
  ]);
  const errores = [experiencias.error, estudios.error, habilidades.error, alertas.error, postulaciones.error].filter(Boolean);
  if (errores.length) return respuesta.status(500).json({ error: 'No se pudieron cargar todos los datos del perfil.' });

  const { data: usuario, error: errorUsuario } = await contexto.supabase
    .from('usuarios')
    .select('id, nombre, email, telefono, ubicacion, foto_url')
    .eq('id', contexto.usuario.id)
    .single();
  if (errorUsuario) return respuesta.status(500).json({ error: 'No se pudieron cargar los datos de la cuenta.' });

  return respuesta.json({
    perfil: {
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono || '',
      ubicacion: usuario.ubicacion || '',
      foto_url: usuario.foto_url || '',
      titulo_profesional: contexto.perfil.titulo_profesional || '',
      resumen_laboral: contexto.perfil.resumen_laboral || '',
      curriculum_nombre: contexto.perfil.curriculum_nombre || ''
    },
    experiencias: experiencias.data || [],
    estudios: estudios.data || [],
    habilidades: habilidades.data || [],
    alertas: alertas.data || [],
    postulaciones: (postulaciones.data || []).map((postulacion) => ({
      id: postulacion.id,
      estado: postulacion.estado,
      creado_en: postulacion.creado_en,
      vacante: postulacion.vacante
    }))
  });
}));

aplicacion.post(
  '/api/candidato/foto',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: tamanoMaximoFotoCandidato }),
  conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
    if (!contexto) return;
    try {
      const url = await guardarFoto(contexto, solicitud.body, false);
      return respuesta.json({ guardado: true, foto_url: url });
    } catch (error) {
      return respuesta.status(400).json({ error: error.message });
    }
  })
);
aplicacion.post(
  '/api/candidato/curriculum',
  analizarArchivoPdf,
  conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
    if (!contexto) return;
    const nombreCodificado = solicitud.get('X-File-Name') || '';
    let nombreArchivo;
    try {
      nombreArchivo = decodeURIComponent(nombreCodificado);
    } catch {
      return respuesta.status(400).json({ error: 'El nombre del archivo no es válido.' });
    }
    nombreArchivo = nombreArchivo.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (
      !Buffer.isBuffer(solicitud.body) ||
      solicitud.body.length === 0 ||
      solicitud.body.length > tamanoMaximoCurriculum ||
      solicitud.body.subarray(0, 5).toString('ascii') !== '%PDF-' ||
      nombreArchivo.length === 0 ||
      nombreArchivo.length > 255 ||
      !/\.pdf$/i.test(nombreArchivo)
    ) {
      return respuesta.status(400).json({ error: 'Selecciona un archivo PDF válido de máximo 5 MB.' });
    }

    const rutaArchivo = `${contexto.perfil.id}/${crearIdentificador()}.pdf`;
    const almacenamiento = contexto.supabase.storage.from(depositoCurriculums);
    const { error: errorSubida } = await almacenamiento.upload(rutaArchivo, solicitud.body, {
      contentType: 'application/pdf',
      upsert: false
    });
    if (errorSubida) {
      console.error('Error guardando el currículum en Supabase Storage.', {
        statusCode: errorSubida.statusCode,
        message: errorSubida.message
      });
      const depositoInexistente =
        Number(errorSubida.statusCode) === 404 || /bucket not found/i.test(errorSubida.message || '');
      return respuesta.status(depositoInexistente ? 503 : 502).json({
        error: depositoInexistente
          ? 'Storage privado todavía no está activado. Hace falta crear el bucket curriculums-candidatos.'
          : 'No se pudo guardar el currículum. Intenta de nuevo.'
      });
    }

    const { data: perfilActualizado, error: errorPerfil } = await contexto.supabase
      .from('perfiles_candidatos')
      .update({ curriculum_nombre: nombreArchivo, curriculum_url: rutaArchivo })
      .eq('id', contexto.perfil.id)
      .eq('usuario_id', contexto.usuario.id)
      .select('id')
      .maybeSingle();
    if (errorPerfil || !perfilActualizado) {
      const { error: errorLimpieza } = await almacenamiento.remove([rutaArchivo]);
      if (errorLimpieza) {
        console.error('No se pudo limpiar un currículum no vinculado al perfil.', {
          statusCode: errorLimpieza.statusCode,
          message: errorLimpieza.message
        });
      }
      return respuesta.status(500).json({ error: 'El archivo se recibió, pero no se pudo vincular al perfil.' });
    }

    const rutaAnterior = contexto.perfil.curriculum_url;
    if (
      rutaAnterior &&
      rutaAnterior !== rutaArchivo &&
      rutaAnterior.startsWith(`${contexto.perfil.id}/`) &&
      !rutaAnterior.includes('..')
    ) {
      const { data: referencias, error: errorReferencias } = await contexto.supabase.from('postulaciones').select('id').eq('curriculum_url', rutaAnterior).limit(1);
      const { error: errorEliminacion } = !errorReferencias && referencias?.length === 0
        ? await almacenamiento.remove([rutaAnterior]) : { error: null };
      if (errorEliminacion) {
        console.error('No se pudo retirar el currículum anterior del candidato.', {
          statusCode: errorEliminacion.statusCode,
          message: errorEliminacion.message
        });
      }
    }

    respuesta.set('Cache-Control', 'no-store');
    return respuesta.json({ guardado: true, curriculum_nombre: nombreArchivo });
  })
);

aplicacion.delete('/api/candidato/curriculum', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  try {
    const resultado = await quitarCurriculum(contexto);
    respuesta.set('Cache-Control', 'no-store');
    return respuesta.json(resultado);
  } catch (error) {
    return respuesta.status(503).json({ error: error.message });
  }
}));

aplicacion.get('/api/candidato/curriculum', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  const rutaArchivo = contexto.perfil.curriculum_url;
  if (
    !rutaArchivo ||
    !rutaArchivo.startsWith(`${contexto.perfil.id}/`) ||
    rutaArchivo.includes('..')
  ) {
    return respuesta.status(404).json({ error: 'No hay un currículum guardado para descargar.' });
  }

  const { data: archivo, error } = await contexto.supabase
    .storage
    .from(depositoCurriculums)
    .download(rutaArchivo);
  if (error || !archivo) {
    console.error('Error descargando el currículum privado.', {
      statusCode: error?.statusCode,
      message: error?.message
    });
    const depositoInexistente = /bucket not found/i.test(error?.message || '');
    return respuesta.status(depositoInexistente ? 503 : 404).json({
      error: depositoInexistente
        ? 'Storage privado todavía no está activado.'
        : 'No se encontró el archivo guardado.'
    });
  }

  respuesta.set('Cache-Control', 'private, no-store');
  respuesta.set('Content-Type', 'application/pdf');
  respuesta.set(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(contexto.perfil.curriculum_nombre || 'curriculum.pdf')}`
  );
  return respuesta.send(Buffer.from(await archivo.arrayBuffer()));
}));

aplicacion.put('/api/candidato/perfil', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  const datos = solicitud.body || {};
  const { telefono, ubicacion, titulo_profesional: tituloProfesionalSolicitud, resumen_laboral: resumenLaboralSolicitud } = datos;
  const campos = [telefono, ubicacion, tituloProfesionalSolicitud, resumenLaboralSolicitud];
  if (Object.hasOwn(datos, 'telefono') && !esTelefono(telefono)) return respuesta.status(400).json({ error: 'Escribe un teléfono válido de 8 a 15 dígitos.' });
  if (
    campos.some((valor) => valor !== undefined && valor !== null && typeof valor !== 'string') ||
    (typeof telefono === 'string' && telefono.length > 30) ||
    (typeof ubicacion === 'string' && ubicacion.length > 120) ||
    (typeof tituloProfesionalSolicitud === 'string' && tituloProfesionalSolicitud.length > 120) ||
    (typeof resumenLaboralSolicitud === 'string' && resumenLaboralSolicitud.length > 1000)
  ) {
    return respuesta.status(400).json({ error: 'Revisa los datos del perfil.' });
  }

  const actualizacionUsuario = {};
  const actualizacionPerfil = {};
  if (Object.hasOwn(datos, 'telefono')) {
    actualizacionUsuario.telefono = typeof telefono === 'string' ? telefono.trim() || null : null;
  }
  if (Object.hasOwn(datos, 'ubicacion')) {
    actualizacionUsuario.ubicacion = typeof ubicacion === 'string' ? ubicacion.trim() || null : null;
  }
  if (Object.hasOwn(datos, 'titulo_profesional')) {
    actualizacionPerfil.titulo_profesional =
      typeof tituloProfesionalSolicitud === 'string' ? tituloProfesionalSolicitud.trim() || null : null;
  }
  if (Object.hasOwn(datos, 'resumen_laboral')) {
    actualizacionPerfil.resumen_laboral =
      typeof resumenLaboralSolicitud === 'string' ? resumenLaboralSolicitud.trim() || null : null;
  }
  if (!Object.keys(actualizacionUsuario).length && !Object.keys(actualizacionPerfil).length) {
    return respuesta.status(400).json({ error: 'No hay campos del perfil para guardar.' });
  }

  if (Object.keys(actualizacionUsuario).length) {
    const { error } = await contexto.supabase
      .from('usuarios')
      .update(actualizacionUsuario)
      .eq('id', contexto.usuario.id);
    if (error) return respuesta.status(400).json({ error: 'No se pudieron guardar teléfono y ubicación.' });
  }
  if (Object.keys(actualizacionPerfil).length) {
    const { error } = await contexto.supabase
      .from('perfiles_candidatos')
      .update(actualizacionPerfil)
      .eq('id', contexto.perfil.id)
      .eq('usuario_id', contexto.usuario.id);
    if (error) {
      return respuesta.status(400).json({
        error: Object.keys(actualizacionUsuario).length
          ? 'Teléfono y ubicación se guardaron, pero no se pudo guardar profesión y resumen.'
          : 'No se pudo guardar profesión y resumen.'
      });
    }
  }
  await reportarAutomaticamente(contexto.supabase, { texto: [tituloProfesionalSolicitud, resumenLaboralSolicitud, ubicacion].filter(Boolean).join(' '), tipo: 'reporte', categoria: 'Reportes', origen: 'perfiles_candidatos', id: contexto.perfil.id, autor: contexto.usuario.nombre });
  return respuesta.json({ guardado: true });
}));

const esUuidValoracion = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
aplicacion.get('/api/candidato/postulaciones/:vacanteId', conManejoErrores(async (solicitudHttp, respuestaHttp) => {
  const contextoSolicitud = await obtenerCandidatoAutenticado(solicitudHttp, respuestaHttp); if (!contextoSolicitud) return;
  if (!esUuid(solicitudHttp.params.vacanteId)) return respuestaHttp.status(400).json({ error: 'Vacante no válida.' });
  if (!esUuidValoracion(solicitudHttp.params.vacanteId)) return respuestaHttp.status(400).json({error:'Vacante no válida.'});
  const {data: datosRespuesta,error} = await contextoSolicitud.supabase.from('postulaciones').select('id').eq('candidato_id',contextoSolicitud.perfil.id).eq('vacante_id',solicitudHttp.params.vacanteId).limit(1);
  if (error) return respuestaHttp.status(500).json({error:'No se pudo consultar tu postulación.'});
  return respuestaHttp.json({postulado:datosRespuesta.length > 0});
}));
aplicacion.get('/api/valoraciones-empresa/:id', conManejoErrores(async (solicitudHttp,respuestaHttp) => {
  if (!esUuidValoracion(solicitudHttp.params.id)) return respuestaHttp.status(400).json({error:'Empresa no válida.'});
  const clienteDatos=obtenerClienteOError(respuestaHttp); if (!clienteDatos) return;
  const {data: datosRespuesta,error}=await clienteDatos.from('valoraciones_empresas').select('id, calificacion, comentario').eq('empresa_id',solicitudHttp.params.id).eq('estado','Aprobada').order('creado_en',{ascending:false});
  if(error) return respuestaHttp.status(500).json({error:'No se pudieron cargar las valoraciones.'});
  return respuestaHttp.json({valoraciones:datosRespuesta || []});
}));
aplicacion.post('/api/candidato/valoraciones', conManejoErrores(async (solicitudHttp,respuestaHttp) => {
  const contextoSolicitud=await obtenerCandidatoAutenticado(solicitudHttp,respuestaHttp); if(!contextoSolicitud) return;
  const {empresa_id: identificadorEmpresa,calificacion,comentario}=solicitudHttp.body || {}; const texto=typeof comentario === 'string' ? comentario.trim() : '';
  if (!esUuidValoracion(identificadorEmpresa) || !Number.isInteger(calificacion) || calificacion<1 || calificacion>5 || texto.length<3 || texto.length>2000) return respuestaHttp.status(400).json({error:'Selecciona de 1 a 5 estrellas y escribe un comentario de 3 a 2000 caracteres.'});
  const empresa=await contextoSolicitud.supabase.from('empresas').select('id').eq('id',identificadorEmpresa).maybeSingle();
  if(empresa.error) return respuestaHttp.status(500).json({error:'No se pudo comprobar la empresa.'});
  if(!empresa.data) return respuestaHttp.status(404).json({error:'No se encontró la empresa.'});
  const {data: valoracion,error}=await contextoSolicitud.supabase.from('valoraciones_empresas').insert({empresa_id: identificadorEmpresa,candidato_id:contextoSolicitud.perfil.id,calificacion,comentario:texto,estado:'Aprobada'}).select('id').single();
  if(error) return respuestaHttp.status(500).json({error:'No se pudo guardar la valoración.'});
  await reportarAutomaticamente(contextoSolicitud.supabase, { texto, tipo: 'valoracion', categoria: 'Valoraciones', id: valoracion.id, autor: contextoSolicitud.usuario.nombre });
  return respuestaHttp.status(201).json({estado:'Aprobada'});
}));

registrarFlujoPostulaciones(aplicacion, { conManejoErrores, obtenerCandidatoAutenticado, obtenerEmpresaAutenticada, reportarAutomaticamente });

aplicacion.post('/api/candidato/:tipo', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  const configuracion = Object.hasOwn(tablasCandidato, solicitud.params.tipo)
    ? tablasCandidato[solicitud.params.tipo]
    : null;
  const registro = normalizarRegistroCandidato(solicitud.params.tipo, solicitud.body);
  if (!configuracion || !registro) {
    return respuesta.status(400).json({ error: 'Los datos enviados no son válidos.' });
  }
  const { data: datosRespuesta, error } = await contexto.supabase
    .from(configuracion.tabla)
    .insert({ ...registro, candidato_id: contexto.perfil.id })
    .select()
    .single();
  if (error) return respuesta.status(400).json({ error: 'No se pudo guardar el elemento.' });
  await reportarAutomaticamente(contexto.supabase, { texto: Object.values(registro).filter(v => typeof v === 'string').join(' '), tipo: 'reporte', categoria: 'Reportes', origen: configuracion.tabla, id: datosRespuesta.id, autor: contexto.usuario.nombre });
  return respuesta.status(201).json(datosRespuesta);
}));

aplicacion.put('/api/candidato/:tipo/:id', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  const configuracion = Object.hasOwn(tablasCandidato, solicitud.params.tipo)
    ? tablasCandidato[solicitud.params.tipo]
    : null;
  const registro = normalizarRegistroCandidato(solicitud.params.tipo, solicitud.body, true);
  if (!configuracion || !registro || !Object.keys(registro).length) {
    return respuesta.status(400).json({ error: 'Los datos enviados no son válidos.' });
  }
  const { data: datosRespuesta, error } = await contexto.supabase
    .from(configuracion.tabla)
    .update(registro)
    .eq('id', solicitud.params.id)
    .eq('candidato_id', contexto.perfil.id)
    .select()
    .maybeSingle();
  if (error) return respuesta.status(400).json({ error: 'No se pudo actualizar el elemento.' });
  if (!datosRespuesta) return respuesta.status(404).json({ error: 'El elemento no existe en tu perfil.' });
  await reportarAutomaticamente(contexto.supabase, { texto: Object.values(registro).filter(v => typeof v === 'string').join(' '), tipo: 'reporte', categoria: 'Reportes', origen: configuracion.tabla, id: datosRespuesta.id, autor: contexto.usuario.nombre });
  return respuesta.json(datosRespuesta);
}));

aplicacion.delete('/api/candidato/:tipo/:id', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  const configuracion = Object.hasOwn(tablasCandidato, solicitud.params.tipo)
    ? tablasCandidato[solicitud.params.tipo]
    : null;
  if (!configuracion) return respuesta.status(404).json({ error: 'Tipo de elemento no válido.' });
  const { data: datosRespuesta, error } = await contexto.supabase
    .from(configuracion.tabla)
    .delete()
    .eq('id', solicitud.params.id)
    .eq('candidato_id', contexto.perfil.id)
    .select('id')
    .maybeSingle();
  if (error) return respuesta.status(400).json({ error: 'No se pudo eliminar el elemento.' });
  if (!datosRespuesta) return respuesta.status(404).json({ error: 'El elemento no existe en tu perfil.' });
  return respuesta.json({ eliminado: true });
}));

aplicacion.get('/api/empresa/perfil', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
  if (!contexto) return;

  const [resultadoVacantes, resultadoPostulaciones] = await Promise.all([
    contexto.supabase
      .from('vacantes')
      .select('id, titulo, estado, sector, modalidad, creado_en')
      .eq('empresa_id', contexto.empresa.id)
      .order('creado_en', { ascending: false }),
    contexto.supabase
      .from('postulaciones')
      .select('id, vacantes!inner(empresa_id)')
      .eq('vacantes.empresa_id', contexto.empresa.id)
  ]);

  const { data: usuario } = await contexto.supabase
    .from('usuarios')
    .select('id, nombre, email, telefono, ubicacion, foto_url')
    .eq('id', contexto.usuario.id)
    .single();

  return respuesta.json({
    empresa: contexto.empresa,
    conteoVacantes: resultadoVacantes.data?.length || 0,
    conteoPostulaciones: resultadoPostulaciones.data?.length || 0,
    usuario: usuario || contexto.usuario
  });
}));

aplicacion.put('/api/empresa/perfil', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
  if (!contexto) return;

  const datos = solicitud.body || {};
  const nombreComercial = typeof datos.nombre_comercial === 'string' ? datos.nombre_comercial.trim() : '';
  const sector = typeof datos.sector === 'string' ? datos.sector.trim() : '';
  const departamento = typeof datos.departamento === 'string' ? datos.departamento.trim() : '';
  const municipio = typeof datos.municipio === 'string' ? datos.municipio.trim() : '';
  const correoContacto = typeof datos.contacto_email === 'string' ? datos.contacto_email.trim().toLowerCase() : '';
  const telefono = typeof datos.telefono === 'string' ? datos.telefono.trim() : '';

  if (nombreComercial.length < 3 || nombreComercial.length > 120) {
    return respuesta.status(400).json({ error: 'El nombre comercial debe tener entre 3 y 120 caracteres.' });
  }
  if (!sector) {
    return respuesta.status(400).json({ error: 'Selecciona el sector de la empresa.' });
  }
  if (!departamento || !municipio) {
    return respuesta.status(400).json({ error: 'Selecciona departamento y municipio válidos.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoContacto)) {
    return respuesta.status(400).json({ error: 'Escribe un correo de contacto válido.' });
  }
  if (!esTelefono(telefono, true)) {
    return respuesta.status(400).json({ error: 'Escribe un número de teléfono válido (mínimo 7 caracteres).' });
  }

  const camposActualizar = {
    nombre_comercial: nombreComercial,
    razon_social: typeof datos.razon_social === 'string' && datos.razon_social.trim() ? datos.razon_social.trim() : nombreComercial,
    nit: typeof datos.nit === 'string' && datos.nit.trim() ? datos.nit.trim() : '0000-000000-000-0',
    sector,
    departamento,
    municipio,
    direccion: typeof datos.direccion === 'string' ? datos.direccion.trim() || null : null,
    tamano: typeof datos.tamano === 'string' ? datos.tamano.trim() || '51-200 empleados' : '51-200 empleados',
    contacto_email: correoContacto,
    telefono,
    sitio_web: typeof datos.sitio_web === 'string' ? datos.sitio_web.trim() || null : null,
    descripcion: typeof datos.descripcion === 'string' ? datos.descripcion.trim() || null : null
  };
  if (!esUrlWeb(camposActualizar.sitio_web) || !esTexto(camposActualizar.razon_social, 3, 120) ||
      !esTexto(camposActualizar.nit, 10, 25) || (camposActualizar.descripcion && camposActualizar.descripcion.length > 10000) ||
      (camposActualizar.direccion && camposActualizar.direccion.length > 250)) {
    return respuesta.status(400).json({ error: 'Revisa razón social, NIT, sitio web y los límites de descripción y dirección.' });
  }

  const { data: empresaActualizada, error: errorEmpresa } = await contexto.supabase
    .from('empresas')
    .update(camposActualizar)
    .eq('id', contexto.empresa.id)
    .select()
    .single();

  if (errorEmpresa) {
    return respuesta.status(400).json({ error: 'No se pudo actualizar el perfil de la empresa: ' + errorEmpresa.message });
  }
  await contexto.supabase
    .from('usuarios')
    .update({
      nombre: nombreComercial,
      telefono: telefono || null,
      ubicacion: `${municipio}, ${departamento}`
    })
    .eq('id', contexto.usuario.id);

  await reportarAutomaticamente(contexto.supabase, { texto: [nombreComercial, camposActualizar.descripcion].join(' '), tipo: 'reporte', categoria: 'Reportes', origen: 'empresas', id: empresaActualizada.id, autor: contexto.usuario.nombre });
  return respuesta.json({ guardado: true, empresa: empresaActualizada });
}));

aplicacion.post(
  '/api/empresa/logo',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: tamanoMaximoFotoCandidato }),
  conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
    if (!contexto) return;
    try {
      const url = await guardarFoto(contexto, solicitud.body, true);
      return respuesta.json({ guardado: true, logo_url: url });
    } catch (error) {
      return respuesta.status(400).json({ error: error.message });
    }
  })
);
aplicacion.post('/api/empresa/vacantes', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
  if (!contexto) return;

  const validacion = validarVacanteEmpresa(solicitud.body || {});
  if (validacion.error) return respuesta.status(400).json({ error: validacion.error, errores: validacion.errores });
  const { titulo, sector, departamento, municipio, modalidad, tipo_contrato: tipoContrato, plazas,
    salario_min: salarioMin, salario_max: salarioMax, descripcion, funciones, requisitos, beneficios } = validacion.datos;

  const { data: vacante, error: errorVacante } = await contexto.supabase
    .from('vacantes')
    .insert({
      empresa_id: contexto.empresa.id,
      titulo,
      sector,
      departamento,
      municipio,
      modalidad,
      tipo_contrato: tipoContrato,
      salario_min: salarioMin,
      salario_max: salarioMax,
      plazas,
      fecha_limite: validacion.datos.fecha_limite,
      estado: 'Activa',
      descripcion,
      funciones,
      requisitos,
      beneficios
    })
    .select()
    .single();

  if (errorVacante) {
    return respuesta.status(400).json({ error: 'No se pudo publicar la vacante: ' + errorVacante.message });
  }

  await reportarAutomaticamente(contexto.supabase, { texto: [titulo, descripcion, ...funciones, ...requisitos, ...beneficios].join(' '), tipo: 'reporte', categoria: 'Reportes', origen: 'vacantes', id: vacante.id, autor: contexto.usuario.nombre });
  return respuesta.status(201).json({ guardado: true, vacante });
}));

registrarEdicionVacanteEmpresa(aplicacion, { conManejoErrores, obtenerEmpresaAutenticada, reportarAutomaticamente });

aplicacion.get('/api/empresa/vacantes', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
  if (!contexto) return;

  const { data: datosRespuesta, error } = await contexto.supabase
    .from('vacantes')
    .select('*')
    .eq('empresa_id', contexto.empresa.id)
    .order('creado_en', { ascending: false });

  if (error) {
    return respuesta.status(400).json({ error: 'No se pudieron consultar las vacantes: ' + error.message });
  }

  return respuesta.json({ vacantes: datosRespuesta || [] });
}));

aplicacion.put('/api/empresa/vacantes/:id/estado', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
  if (!contexto) return;

  const nuevoEstado = String(solicitud.body?.estado || '').trim();
  if (!['Activa', 'Inactiva', 'Pendiente'].includes(nuevoEstado)) {
    return respuesta.status(400).json({ error: 'Estado no válido. Debe ser Activa o Inactiva.' });
  }

  const { data: vacante, error: errorVacanteConsulta } = await contexto.supabase
    .from('vacantes')
    .select('id, empresa_id')
    .eq('id', solicitud.params.id)
    .eq('empresa_id', contexto.empresa.id)
    .maybeSingle();

  if (errorVacanteConsulta) return respuesta.status(503).json({ error: 'No se pudo consultar la vacante.' });
  if (!vacante) {
    return respuesta.status(404).json({ error: 'Vacante no encontrada o no pertenece a tu empresa.' });
  }

  const { error: errorActualizacion } = await contexto.supabase
    .from('vacantes')
    .update({ estado: nuevoEstado })
    .eq('id', solicitud.params.id);

  if (errorActualizacion) {
    return respuesta.status(400).json({ error: 'No se pudo actualizar el estado de la vacante: ' + errorActualizacion.message });
  }

  return respuesta.json({ actualizado: true, nuevoEstado });
}));

aplicacion.delete('/api/empresa/vacantes/:id', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
  if (!contexto) return;

  const { data: vacante, error: errorVacanteConsulta } = await contexto.supabase
    .from('vacantes')
    .select('id, empresa_id')
    .eq('id', solicitud.params.id)
    .eq('empresa_id', contexto.empresa.id)
    .maybeSingle();

  if (errorVacanteConsulta) return respuesta.status(503).json({ error: 'No se pudo consultar la vacante.' });
  if (!vacante) {
    return respuesta.status(404).json({ error: 'Vacante no encontrada o no pertenece a tu empresa.' });
  }
  const { error: errorPostulaciones } = await contexto.supabase
    .from('postulaciones')
    .delete()
    .eq('vacante_id', solicitud.params.id);
  if (errorPostulaciones) return respuesta.status(503).json({ error: 'No se pudieron eliminar las postulaciones de la vacante.' });

  const { error: errorEliminacionRemota } = await contexto.supabase
    .from('vacantes')
    .delete()
    .eq('id', solicitud.params.id)
    .eq('empresa_id', contexto.empresa.id);

  if (errorEliminacionRemota) {
    return respuesta.status(400).json({ error: 'No se pudo eliminar la vacante: ' + errorEliminacionRemota.message });
  }

  return respuesta.json({ eliminado: true });
}));

aplicacion.get('/api/empresa/postulaciones', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
  if (!contexto) return;

  const { data: datosRespuesta, error } = await contexto.supabase
    .from('postulaciones')
    .select(`
      id,
      vacante_id,
      candidato_id,
      curriculum_url,
      estado,
      creado_en,
      vacantes!inner(id, titulo, modalidad, sector, empresa_id),
      perfiles_candidatos!inner(id, titulo_profesional, usuarios!inner(nombre, email, telefono, ubicacion, foto_url))
    `)
    .eq('vacantes.empresa_id', contexto.empresa.id)
    .order('creado_en', { ascending: false });

  if (error) {
    return respuesta.status(400).json({ error: 'No se pudieron obtener las postulaciones: ' + error.message });
  }

  const { data: ocultas, error: errorOcultas } = await contexto.supabase.from('moderacion_reportes')
    .select('referencia').eq('estado', 'Oculto').like('detalles', 'Origen: postulaciones\n%');
  if (errorOcultas) return respuesta.status(503).json({ error: 'No se pudo comprobar la moderación de las postulaciones.' });
  const idsOcultos = new Set((ocultas || []).map((r) => r.referencia));
  const postulaciones = (datosRespuesta || []).filter((p) => !idsOcultos.has(p.id)).map((p) => ({
    id: p.id,
    estado: p.estado,
    creado_en: p.creado_en,
    curriculum_url: p.curriculum_url ? `/api/empresa/postulaciones/${p.id}/curriculum` : null,
    vacante: {
      id: p.vacantes?.id,
      titulo: p.vacantes?.titulo,
      modalidad: p.vacantes?.modalidad,
      sector: p.vacantes?.sector
    },
    candidato: {
      id: p.perfiles_candidatos?.id,
      nombre: p.perfiles_candidatos?.usuarios?.nombre || 'Candidato/a',
      email: p.perfiles_candidatos?.usuarios?.email || '',
      telefono: p.perfiles_candidatos?.usuarios?.telefono || '',
      ubicacion: p.perfiles_candidatos?.usuarios?.ubicacion || '',
      foto_url: p.perfiles_candidatos?.usuarios?.foto_url || '',
      titulo_profesional: p.perfiles_candidatos?.titulo_profesional || ''
    }
  }));

  return respuesta.json({ postulaciones });
}));

aplicacion.put('/api/empresa/postulaciones/:id/estado', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
  if (!contexto) return;

  const estadoRecibido = String(solicitud.body?.estado || '').trim();
  const mapaEstados = {
    'Aceptada': 'Contratada',
    'Aceptado': 'Contratada',
    'Contratada': 'Contratada',
    'Denegada': 'Rechazada',
    'Denegado': 'Rechazada',
    'Rechazada': 'Rechazada',
    'Descartada': 'Rechazada',
    'Finalista': 'Entrevista',
    'Entrevista': 'Entrevista',
    'En revisión': 'En revisión',
    'Nueva': 'Nueva'
  };
  const nuevoEstado = mapaEstados[estadoRecibido] || estadoRecibido;
  const estadosPermitidos = ['Nueva', 'En revisión', 'Entrevista', 'Contratada', 'Rechazada'];
  if (!estadosPermitidos.includes(nuevoEstado)) {
    return respuesta.status(400).json({ error: 'Estado de postulación no válido.' });
  }

  const { data: postulacion, error: errorPostulacion } = await contexto.supabase
    .from('postulaciones')
    .select('id, vacantes!inner(empresa_id)')
    .eq('id', solicitud.params.id)
    .eq('vacantes.empresa_id', contexto.empresa.id)
    .maybeSingle();

  if (errorPostulacion || !postulacion) {
    return respuesta.status(404).json({ error: 'Postulación no encontrada o no pertenece a tu empresa.' });
  }

  const { error: errorActualizacion } = await contexto.supabase
    .from('postulaciones')
    .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
    .eq('id', solicitud.params.id);

  if (errorActualizacion) {
    return respuesta.status(400).json({ error: 'No se pudo actualizar el estado: ' + errorActualizacion.message });
  }

  return respuesta.json({ actualizado: true, nuevoEstado });
}));
aplicacion.get('/api/estado-bd', (_solicitud, respuesta) => {
  const estado = verificarConfiguracionBaseDatos();
  respuesta.json({
    ...estado,
    tablas: Object.values(configuracionBaseDatos.tablas)
  });
});
aplicacion.get('/api/datos', async (solicitud, respuesta) => {
  respuesta.set('Cache-Control', 'no-store');
  const contexto = await obtenerContextoAutenticado(solicitud, respuesta, true);
  if (respuesta.headersSent) return;
  const esAdministrador = contexto?.rol === 'administrador';
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  try {
    const [
      resultadoUsuarios,
      resultadoEmpresas,
      resultadoVacantes,
      resultadoPostulaciones,
      resultadoModeracion,
      resultadoVerificaciones,
      resultadoRecursos
    ] = await Promise.all([
      esAdministrador
        ? supabase.from('usuarios').select('*').order('creado_en', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      esAdministrador
        ? supabase.from('empresas').select('*, usuarios(foto_url)').order('creado_en', { ascending: false })
        : supabase
            .from('empresas')
            .select('*, usuarios(foto_url)')
            .eq('estado_verificacion', 'Verificada')
            .order('creado_en', { ascending: false }),
      esAdministrador
        ? supabase
            .from('vacantes')
            .select('*, empresas(nombre_comercial, estado_verificacion)')
            .order('creado_en', { ascending: false })
        : supabase
            .from('vacantes')
            .select('*, empresas!inner(nombre_comercial, estado_verificacion)')
            .eq('estado', 'Activa')
            .eq('empresas.estado_verificacion', 'Verificada')
            .order('creado_en', { ascending: false }),
      esAdministrador
        ? supabase.from('postulaciones').select('id, estado, creado_en, perfiles_candidatos(usuarios(nombre, foto_url))')
        : Promise.resolve({ data: [], error: null }),
      esAdministrador
        ? supabase.from('moderacion_reportes').select('*').order('creado_en', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      esAdministrador
        ? supabase
            .from('solicitudes_verificacion')
            .select(
              '*, empresas(nombre_comercial, razon_social, nit, sector, tamano, contacto_email, telefono)'
            )
            .order('fecha_envio', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      esAdministrador
        ? supabase
            .from('recursos_laborales')
            .select('*, usuarios(nombre)')
            .order('creado_en', { ascending: false })
        : supabase
            .from('recursos_laborales')
            .select('*')
            .eq('estado_publicacion', 'Publicado')
            .order('creado_en', { ascending: false })
    ]);

    const errores = [
      resultadoUsuarios.error,
      resultadoEmpresas.error,
      resultadoVacantes.error,
      resultadoPostulaciones.error,
      resultadoModeracion.error,
      resultadoVerificaciones.error,
      resultadoRecursos.error
    ].filter(Boolean);

    if (errores.length > 0) {
      return respuesta.status(500).json({ error: errores[0].message });
    }

    const vacantesMapeadas = (resultadoVacantes.data || []).map(mapearVacante);
    const conteoVacantesPorEmpresa = new Map();
    for (const vac of vacantesMapeadas) {
      conteoVacantesPorEmpresa.set(
        vac.empresaId,
        (conteoVacantesPorEmpresa.get(vac.empresaId) || 0) + 1
      );
    }

    const usuarios = (resultadoUsuarios.data || []).map(mapearUsuario);
    const empresas = (resultadoEmpresas.data || []).map((fila) => {
      const empresa = mapearEmpresa(fila, conteoVacantesPorEmpresa.get(fila.id) || 0);
      if (!esAdministrador) {
        empresa.razonSocial = '';
        empresa.nit = '';
        empresa.contactoCorreo = '';
        empresa.telefono = '';
      }
      return empresa;
    });
    const candidatosPorPostulacion = new Map((resultadoPostulaciones.data || []).map((postulacion) => [postulacion.id, postulacion.perfiles_candidatos?.usuarios]));
    const elementosModeracion = (resultadoModeracion.data || []).map((reporte) => mapearModeracion({ ...reporte,
      candidato: reporte.detalles?.startsWith('Origen: postulaciones\n') ? candidatosPorPostulacion.get(reporte.referencia) : null
    }));
    const solicitudesVerificacion = (resultadoVerificaciones.data || []).map(
      mapearSolicitudVerificacion
    );
    const recursosLaborales = (resultadoRecursos.data || []).map((fila) =>
      mapearRecurso(esAdministrador ? fila : { ...fila, usuarios: null })
    );
    const estadisticasResumen = construirEstadisticasResumen(
      resultadoPostulaciones.data || [],
      vacantesMapeadas
    );

    return respuesta.json({
      usuarios,
      empresas,
      vacantes: vacantesMapeadas,
      elementosModeracion,
      solicitudesVerificacion,
      recursosLaborales,
      estadisticasResumen
    });
  } catch (error) {
    return respuesta.status(500).json({ error: error.message || 'Error consultando Supabase.' });
  }
});
aplicacion.put('/api/usuarios/:id', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { nombre, correo, rol } = solicitud.body || {};
  if (!esTexto(nombre, 3, 80) || !esCorreo(correo) || !['candidato', 'empresa', 'administrador'].includes(normalizarRol(rol))) {
    return respuesta.status(400).json({ error: 'Revisa nombre, correo y rol del usuario.' });
  }

  const { data: datosRespuesta, error } = await supabase
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

  return respuesta.json(mapearUsuario(datosRespuesta));
});
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

  const { data: datosRespuesta, error } = await supabase
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

  return respuesta.json(mapearUsuario(datosRespuesta));
});
aplicacion.patch('/api/empresas/:id/estado', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { estado } = solicitud.body || {};
  const estadosValidos = ['Verificada', 'Pendiente', 'Suspendida'];

  if (!estadosValidos.includes(estado)) {
    return respuesta.status(400).json({ error: 'Estado empresarial inválido.' });
  }

  const { data: datosRespuesta, error } = await supabase
    .from('empresas')
    .update({ estado_verificacion: estado })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  const { count: cantidadRegistros } = await supabase
    .from('vacantes')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', id);

  return respuesta.json(mapearEmpresa(datosRespuesta, cantidadRegistros || 0));
});
aplicacion.put('/api/vacantes/:id', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { titulo, salarioMin, salarioMax, modalidad, tipoContrato, descripcion } =
    solicitud.body || {};
  if (!esTexto(titulo, 3, 120) || !esTexto(descripcion, 10, 10000) ||
      !['Presencial', 'Híbrido', 'Remoto'].includes(modalidad) || !esTexto(tipoContrato, 2, 80) ||
      !esNumeroCampo(salarioMin) || !esNumeroCampo(salarioMax) ||
      !Number.isFinite(Number(salarioMin)) || !Number.isFinite(Number(salarioMax)) ||
      Number(salarioMin) < 0 || Number(salarioMax) < Number(salarioMin) || Number(salarioMax) > 1000000) {
    return respuesta.status(400).json({ error: 'Revisa título, descripción, modalidad, contrato y rango salarial.' });
  }

  const { data: datosRespuesta, error } = await supabase
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
    .select('*, empresas(nombre_comercial, estado_verificacion)')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.json(mapearVacante(datosRespuesta));
});
aplicacion.patch('/api/vacantes/:id/estado', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { estado } = solicitud.body || {};
  const estadosValidos = ['Pendiente', 'Activa', 'Inactiva'];

  if (!estadosValidos.includes(estado)) {
    return respuesta.status(400).json({ error: 'Estado de vacante inválido.' });
  }

  const { data: datosRespuesta, error } = await supabase
    .from('vacantes')
    .update({ estado })
    .eq('id', id)
    .select('*, empresas(nombre_comercial, estado_verificacion)')
    .single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  return respuesta.json(mapearVacante(datosRespuesta));
});
aplicacion.patch('/api/moderacion/:id/estado', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const { id } = solicitud.params;
  const { estado } = solicitud.body || {};
  const estadosValidos = ['Aprobado', 'Oculto'];

  if (!estadosValidos.includes(estado)) {
    return respuesta.status(400).json({ error: 'Estado de moderación inválido.' });
  }

  const { data: datosRespuesta, error } = await supabase.from('moderacion_reportes').select('*').eq('id', id).single();

  if (error) {
    return respuesta.status(400).json({ error: error.message });
  }

  const destino = destinoModeracion(datosRespuesta);
  if (destino) {
    const { error: errorContenido } = await supabase.from(destino.tabla)
      .update({ estado: estado === 'Oculto' ? destino.oculto : destino.visible })
      .eq('id', datosRespuesta.referencia);
    if (errorContenido) return respuesta.status(503).json({ error: 'No se pudo cambiar la visibilidad del contenido. Intenta de nuevo.' });
  }
  const { data: actualizado, error: errorEstado } = await supabase.from('moderacion_reportes')
    .update({ estado }).eq('id', id).select('*').single();
  if (errorEstado) return respuesta.status(503).json({ error: 'No se pudo actualizar el reporte. Intenta de nuevo.' });
  return respuesta.json(mapearModeracion(actualizado));
});
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

  const [resultadoEmpresas, resultadoVacantes] = await Promise.all([
    supabase.from('empresas').select('*').order('creado_en', { ascending: false }),
    supabase.from('vacantes').select('id, empresa_id')
  ]);

  const conteos = new Map();
  for (const vac of resultadoVacantes.data || []) {
    conteos.set(vac.empresa_id, (conteos.get(vac.empresa_id) || 0) + 1);
  }

  const empresas = (resultadoEmpresas.data || []).map((fila) =>
    mapearEmpresa(fila, conteos.get(fila.id) || 0)
  );

  return respuesta.json({
    solicitud: mapearSolicitudVerificacion(solicitudActualizada),
    empresas
  });
});
aplicacion.post('/api/recursos', async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;

  const datos = solicitud.body || {};
  if (!esTexto(datos.titulo, 8, 160) || !esTexto(datos.resumen, 20, 500) || !esTexto(datos.contenido, 30, 10000) ||
      !['Artículo', 'Consejo', 'Tutorial', 'Noticia'].includes(datos.categoria) ||
      !['Básico', 'Intermedio', 'Avanzado'].includes(datos.nivelLectura) ||
      !Number.isInteger(datos.tiempoLecturaMin) || datos.tiempoLecturaMin < 1 || datos.tiempoLecturaMin > 60 ||
      !['Publicado', 'Borrador'].includes(datos.estadoPublicacion) ||
      !Array.isArray(datos.audiencia) || !datos.audiencia.length || datos.audiencia.length > 10 || datos.audiencia.some((v) => !esTexto(v, 1, 80)) ||
      !esPortadaRecurso(datos.imagenPortadaUrl) ||
      (datos.etiquetas !== undefined && (!Array.isArray(datos.etiquetas) || datos.etiquetas.length > 30 || datos.etiquetas.some((v) => !esTexto(v, 1, 80))))) {
    return respuesta.status(400).json({ error: 'Revisa los campos obligatorios, la URL, el estado y la audiencia del recurso.' });
  }

  const { data: datosRespuesta, error } = await supabase
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

  return respuesta.status(201).json(mapearRecurso(datosRespuesta));
});

const CATEGORIAS_FORO = ['Búsqueda de empleo', 'Desarrollo profesional', 'Experiencias laborales'];

aplicacion.get('/api/foros/temas', conManejoErrores(async (_solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;
  respuesta.set('Cache-Control', 'no-store');
  const { data: datosRespuesta, error } = await supabase
    .from('foros_temas')
    .select('id, titulo, categoria, mensaje, creado_en, usuarios(nombre, foto_url), foros_respuestas(id, estado)')
    .eq('estado', 'Activo')
    .order('creado_en', { ascending: false });
  if (error) return respuesta.status(400).json({ error: 'No se pudieron cargar los temas.' });
  return respuesta.json((datosRespuesta || []).map((t) => {
    const respuestasActivas = Array.isArray(t.foros_respuestas)
      ? t.foros_respuestas.filter((r) => r.estado === 'Activo').length
      : 0;
    return {
      id: t.id,
      titulo: t.titulo,
      categoria: t.categoria,
      descripcion: t.mensaje,
      autor: t.usuarios?.nombre || 'Usuario',
      fotoUrl: t.usuarios?.foto_url || '',
      respuestas: respuestasActivas,
      creadoEn: t.creado_en
    };
  }));
}));

aplicacion.get('/api/foros/temas/:id/respuestas', conManejoErrores(async (solicitud, respuesta) => {
  const supabase = obtenerClienteOError(respuesta);
  if (!supabase) return;
  respuesta.set('Cache-Control', 'no-store');
  const { data: tema, error: errorTema } = await supabase.from('foros_temas').select('id').eq('id', solicitud.params.id).eq('estado', 'Activo').maybeSingle();
  if (errorTema) return respuesta.status(503).json({ error: 'No se pudo comprobar el tema.' });
  if (!tema) return respuesta.status(404).json({ error: 'El tema no está disponible.' });
  const { data: datosRespuesta, error } = await supabase
    .from('foros_respuestas')
    .select('id, respuesta, creado_en, usuarios(nombre, foto_url)')
    .eq('tema_id', solicitud.params.id)
    .eq('estado', 'Activo')
    .order('creado_en', { ascending: true });
  if (error) return respuesta.status(400).json({ error: 'No se pudieron cargar las respuestas.' });
  return respuesta.json((datosRespuesta || []).map((r) => ({
    id: r.id,
    autor: r.usuarios?.nombre || 'Usuario',
    fotoUrl: r.usuarios?.foto_url || '',
    contenido: r.respuesta,
    creadoEn: r.creado_en
  })));
}));

aplicacion.post('/api/foros/temas', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await exigirRol(solicitud, respuesta, ['candidato', 'empresa', 'administrador']);
  if (!contexto) return;
  if (typeof solicitud.body?.titulo !== 'string' || typeof solicitud.body?.categoria !== 'string' ||
      typeof (solicitud.body?.descripcion ?? solicitud.body?.mensaje) !== 'string') return respuesta.status(400).json({ error: 'Escribe título, categoría y descripción válidos.' });
  const titulo = String(solicitud.body?.titulo ?? '').trim();
  const categoria = String(solicitud.body?.categoria ?? '').trim();
  const mensaje = String(solicitud.body?.descripcion ?? solicitud.body?.mensaje ?? '').trim();
  if (titulo.length < 5 || titulo.length > 120 || !CATEGORIAS_FORO.includes(categoria) ||
      mensaje.length < 20 || mensaje.length > 2000) {
    return respuesta.status(400).json({ error: 'Revisa título, categoría y descripción (mínimo 20 caracteres).' });
  }
  const { data: datosRespuesta, error } = await contexto.supabase
    .from('foros_temas')
    .insert({ titulo, categoria, mensaje, autor_id: contexto.usuario.id, estado: 'Activo' })
    .select('id, titulo, categoria, mensaje, creado_en').single();
  if (error) return respuesta.status(400).json({ error: 'No se pudo publicar el tema: ' + error.message });
  await reportarAutomaticamente(contexto.supabase, { texto: `${titulo} ${mensaje}`, tipo: 'foro', categoria: 'Foros', id: datosRespuesta.id, autor: contexto.usuario.nombre });
  return respuesta.status(201).json(datosRespuesta);
}));

aplicacion.post('/api/foros/temas/:id/respuestas', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await exigirRol(solicitud, respuesta, ['candidato', 'empresa', 'administrador']);
  if (!contexto) return;
  if (typeof (solicitud.body?.contenido ?? solicitud.body?.respuesta) !== 'string') return respuesta.status(400).json({ error: 'Escribe una respuesta válida.' });
  const { data: tema, error: errorTema } = await contexto.supabase.from('foros_temas').select('id').eq('id', solicitud.params.id).eq('estado', 'Activo').maybeSingle();
  if (errorTema) return respuesta.status(503).json({ error: 'No se pudo comprobar el tema.' });
  if (!tema) return respuesta.status(404).json({ error: 'El tema no está disponible para responder.' });
  const texto = String(solicitud.body?.contenido ?? solicitud.body?.respuesta ?? '').trim();
  if (texto.length < 5 || texto.length > 1000) {
    return respuesta.status(400).json({ error: 'La respuesta debe tener entre 5 y 1000 caracteres.' });
  }
  const { data: datosRespuesta, error } = await contexto.supabase.from('foros_respuestas').insert({
    tema_id: solicitud.params.id,
    autor_id: contexto.usuario.id,
    respuesta: texto,
    estado: 'Activo'
  }).select('id, respuesta, creado_en, usuarios(nombre, foto_url)').single();
  if (error) return respuesta.status(400).json({ error: 'No se pudo guardar tu respuesta: ' + error.message });
  await reportarAutomaticamente(contexto.supabase, { texto, tipo: 'comentario', categoria: 'Comentarios', id: datosRespuesta.id, autor: contexto.usuario.nombre });
  return respuesta.status(201).json({
    guardada: true,
    respuesta: {
      id: datosRespuesta?.id,
      autor: datosRespuesta?.usuarios?.nombre || contexto.usuario.nombre || 'Usuario',
      fotoUrl: datosRespuesta?.usuarios?.foto_url || contexto.usuario.foto_url || '',
      contenido: datosRespuesta?.respuesta || texto,
      creadoEn: datosRespuesta?.creado_en
    }
  });
}));

aplicacion.post('/api/foros/temas/:id/reportar', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await exigirRol(solicitud, respuesta, ['candidato', 'empresa', 'administrador']);
  if (!contexto) return;
  const { data: tema } = await contexto.supabase
    .from('foros_temas').select('id, titulo').eq('id', solicitud.params.id).maybeSingle();
  if (!tema) return respuesta.status(404).json({ error: 'El tema no existe.' });
  const { error } = await contexto.supabase.from('moderacion_reportes').insert({
    reportado_por: contexto.usuario.id,
    tipo: 'foro',
    categoria: 'Foros',
    motivo_titulo: tema.titulo,
    referencia: tema.id,
    autor_nombre: contexto.usuario.nombre,
    detalles: `Tema reportado desde el foro por ${contexto.usuario.nombre}`
  });
  if (error) return respuesta.status(400).json({ error: 'No se pudo enviar el reporte: ' + error.message });
  return respuesta.status(201).json({ reportado: true });
}));
aplicacion.post('/api/reportes', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await exigirRol(solicitud, respuesta, ['candidato', 'empresa', 'administrador']);
  if (!contexto) return;
  const { origen, id, motivo } = solicitud.body || {};
  const destinos = {
    foros_temas: { tipo: 'foro', categoria: 'Foros', campos: 'id, titulo' },
    foros_respuestas: { tipo: 'comentario', categoria: 'Comentarios', campos: 'id, respuesta' },
    valoraciones_empresas: { tipo: 'valoracion', categoria: 'Valoraciones', campos: 'id, comentario' },
    postulaciones: { tipo: 'reporte', categoria: 'Reportes', campos: 'id, vacantes!inner(empresa_id)' },
    usuarios: { tipo: 'reporte', categoria: 'Reportes', campos: 'id, nombre' },
    vacantes: { tipo: 'reporte', categoria: 'Reportes', campos: 'id, titulo' }
  };
  const destino = Object.hasOwn(destinos, origen) ? destinos[origen] : null;
  if (!destino || !esUuidValoracion(id) || typeof motivo !== 'string' || motivo.trim().length < 5 || motivo.length > 1000) {
    return respuesta.status(400).json({ error: 'Selecciona contenido válido y escribe el motivo (5 a 1000 caracteres).' });
  }
  const { data: contenido, error } = await contexto.supabase.from(origen).select(destino.campos).eq('id', id).maybeSingle();
  if (error) return respuesta.status(503).json({ error: 'No se pudo consultar el contenido.' });
  if (!contenido) return respuesta.status(404).json({ error: 'El contenido no existe.' });
  if (origen === 'postulaciones' && contexto.rol !== 'administrador') {
    const { data: empresa, error: errorEmpresa } = await contexto.supabase.from('empresas').select('id')
      .eq('usuario_id', contexto.usuario.id).eq('id', contenido.vacantes.empresa_id).maybeSingle();
    if (errorEmpresa || !empresa) return respuesta.status(403).json({ error: 'Solo puedes reportar postulaciones recibidas por tu empresa.' });
  }
  const { error: errorReporte } = await contexto.supabase.from('moderacion_reportes').insert({
    reportado_por: contexto.usuario.id,
    tipo: destino.tipo,
    categoria: destino.categoria,
    referencia: id,
    motivo_titulo: motivo.trim(),
    autor_nombre: contexto.usuario.nombre,
    detalles: `Origen: ${origen}\nReporte manual: ${motivo.trim()}`,
    estado: 'Pendiente'
  });
  if (errorReporte) return respuesta.status(503).json({ error: 'No se pudo guardar el reporte.' });
  return respuesta.status(201).json({ reportado: true });
}));

registrarGestionContenido(aplicacion, { exigirRol, conManejoErrores, mapearRecurso, reportarAutomaticamente });
aplicacion.all('/api/*', (_solicitud, respuesta) => {
  respuesta.status(404).json({ error: 'Ruta de API no encontrada.' });
});

aplicacion.use((error, _solicitud, respuesta, _siguiente) => {
  console.error('Error inesperado en una ruta API.', error);
  const codigo = Number(error.status) >= 400 && Number(error.status) < 500 ? Number(error.status) : 500;
  respuesta.status(codigo).json({
    error: codigo === 400 ? 'La solicitud tiene un formato inválido.' : 'Error interno del servidor.'
  });
});
if (!process.env.VERCEL) {
  aplicacion.use(express.static(rutasArchivos.join(__directorioActual, 'publico')));

  aplicacion.get('*', (_solicitud, respuesta) => {
    respuesta.sendFile(rutasArchivos.join(__directorioActual, 'publico', 'index.html'));
  });

  aplicacion.listen(puerto, '0.0.0.0', () => {
    console.log(`Servidor Node.js de WorkConnect activo en http://0.0.0.0:${puerto}`);
  });
}

export default aplicacion;
