import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'node:crypto';
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
const bucketCurriculums = 'curriculums-candidatos';
const tamanoMaximoCurriculum = 5 * 1024 * 1024;

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

function obtenerClientesSupabase(respuesta) {
  const datos = obtenerClienteOError(respuesta);
  if (!datos) return null;
  const autenticacion = obtenerClienteOError(respuesta);
  if (!autenticacion) return null;
  return { datos, autenticacion };
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

function guardarCookiesSesion(solicitud, respuesta, sesion) {
  respuesta.append(
    'Set-Cookie',
    `workconnect-access=${encodeURIComponent(sesion.access_token)}; ${atributosCookie(
      solicitud,
      Number(sesion.expires_in) || 3600
    )}`
  );
  respuesta.append(
    'Set-Cookie',
    `workconnect-refresh=${encodeURIComponent(sesion.refresh_token)}; ${atributosCookie(
      solicitud,
      60 * 60 * 24 * 30
    )}`
  );
}

function borrarCookiesSesion(solicitud, respuesta) {
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
  const valor = String(rol || '').trim().toLowerCase();
  if (valor === 'candidato' || valor === 'candidato/a') return 'candidato';
  if (valor === 'empresa') return 'empresa';
  if (valor === 'administrador' || valor === 'administración/a') return 'administrador';
  return 'visitante';
}

function mapearCuenta(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.email,
    rol: normalizarRol(usuario.rol)
  };
}

async function obtenerContextoAutenticado(solicitud, respuesta, opcional = false) {
  const clientes = obtenerClientesSupabase(respuesta);
  if (!clientes) return null;
  const { datos: supabase, autenticacion: supabaseAuth } = clientes;

  let tokenAcceso = leerCookie(solicitud, 'workconnect-access');
  const tokenRenovacion = leerCookie(solicitud, 'workconnect-refresh');
  if (!tokenAcceso && !tokenRenovacion) {
    if (!opcional) respuesta.status(401).json({ error: 'Inicia sesión para continuar.' });
    return null;
  }

  let usuarioAuth = null;
  let errorAuth = null;
  if (tokenAcceso) {
    const resultado = await supabaseAuth.auth.getUser(tokenAcceso);
    usuarioAuth = resultado.data.user;
    errorAuth = resultado.error;
  }

  if (!usuarioAuth && tokenRenovacion) {
    const renovacion = await supabaseAuth.auth.refreshSession({
      refresh_token: tokenRenovacion
    });
    if (renovacion.data.session && renovacion.data.user) {
      guardarCookiesSesion(solicitud, respuesta, renovacion.data.session);
      usuarioAuth = renovacion.data.user;
      errorAuth = null;
    } else {
      errorAuth = renovacion.error;
    }
  }

  if (!usuarioAuth) {
    borrarCookiesSesion(solicitud, respuesta);
    const codigo = Number(errorAuth?.status) >= 500 ? 503 : 401;
    respuesta.status(codigo).json({
      error:
        codigo === 503
          ? 'No se pudo validar la sesión. Intenta de nuevo.'
          : 'La sesión venció. Inicia sesión nuevamente.'
    });
    return null;
  }

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, auth_uid, nombre, email, rol, estado')
    .eq('auth_uid', usuarioAuth.id)
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

  return { supabase, usuario, rol: normalizarRol(usuario.rol) };
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

  const { data, error } = await supabase
    .from('perfiles_candidatos')
    .insert({ usuario_id: usuarioId })
    .select('id, usuario_id, titulo_profesional, resumen_laboral, curriculum_nombre, curriculum_url')
    .single();
  if (error) throw new Error('No se pudo preparar el perfil del candidato.');
  return data;
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

  for (const campo of ['puesto', 'empresa', 'carrera_programa', 'institucion', 'nivel_academico', 'habilidad', 'nombre_alerta', 'sector', 'frecuencia', 'descripcion']) {
    if (Object.hasOwn(registro, campo) && registro[campo] !== null) {
      if (typeof registro[campo] !== 'string') return null;
      registro[campo] = registro[campo].trim();
      if (!registro[campo] && configuracion.requeridos.includes(campo)) return null;
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
  if (Object.hasOwn(registro, 'es_trabajo_actual') && typeof registro.es_trabajo_actual !== 'boolean') {
    return null;
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
  if (Object.hasOwn(registro, 'activa') && typeof registro.activa !== 'boolean') return null;
  if (Object.hasOwn(registro, 'nivel_dominio') && !['Básico', 'Intermedio', 'Avanzado'].includes(registro.nivel_dominio)) {
    return null;
  }
  if (Object.hasOwn(registro, 'frecuencia') && !['Diaria', 'Semanal', 'Mensual'].includes(registro.frecuencia)) {
    return null;
  }
  if (registro.anio_inicio && registro.anio_fin && registro.anio_fin < registro.anio_inicio) return null;
  return registro;
}

aplicacion.post('/api/auth/registro', conManejoErrores(async (solicitud, respuesta) => {
  const clientes = obtenerClientesSupabase(respuesta);
  if (!clientes) return;
  const { datos: supabase, autenticacion: supabaseAuth } = clientes;
  const { nombre, email, password, rol } = solicitud.body || {};
  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
  const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (
    nombreLimpio.length < 3 ||
    nombreLimpio.length > 80 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    typeof password !== 'string' ||
    password.length < 6 ||
    password.length > 80 ||
    !['candidato', 'empresa'].includes(rol)
  ) {
    return respuesta.status(400).json({ error: 'Revisa nombre, correo, contraseña y tipo de cuenta.' });
  }

  const { data, error } = await supabaseAuth.auth.signUp({
    email: correo,
    password,
    options: { data: { nombre: nombreLimpio, rol } }
  });
  if (error || !data.user) {
    return respuesta.status(400).json({
      error: error?.message || 'No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.'
    });
  }

  let usuario;
  try {
    const { data: vinculado, error: errorVinculo } = await supabase
      .from('usuarios')
      .select('id, auth_uid, nombre, email, rol, estado')
      .eq('auth_uid', data.user.id)
      .maybeSingle();
    if (errorVinculo) throw new Error('La cuenta Auth se creó, pero no se pudo validar su perfil.');

    if (vinculado) {
      usuario = vinculado;
      if (vinculado.estado !== 'Activo') {
        return respuesta.status(403).json({ error: 'La cuenta está inactiva. Contacta con soporte.' });
      }
      if (normalizarRol(vinculado.rol) !== rol) {
        return respuesta.status(409).json({
          error: 'Esta cuenta ya está vinculada con otro tipo de perfil. Contacta con soporte.'
        });
      }
    } else {
      const { data: nuevoUsuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .insert({
          auth_uid: data.user.id,
          nombre: nombreLimpio,
          email: correo,
          rol: rol === 'candidato' ? 'Candidato/a' : 'Empresa',
          estado: 'Activo'
        })
        .select('id, auth_uid, nombre, email, rol, estado')
        .single();
      if (errorUsuario) {
        throw new Error(
          errorUsuario.code === '23505'
            ? 'Ya existe un perfil con ese correo. La cuenta anterior debe verificarse y vincularse.'
            : 'La cuenta Auth se creó, pero no se pudo guardar el perfil de WorkConnect.'
        );
      }
      usuario = nuevoUsuario;
    }

    if (rol === 'candidato') {
      await asegurarPerfilCandidato(supabase, usuario.id);
    }
  } catch (errorVinculo) {
    return respuesta.status(409).json({ error: errorVinculo.message });
  }

  respuesta.set('Cache-Control', 'no-store');
  if (data.session) guardarCookiesSesion(solicitud, respuesta, data.session);
  return respuesta.status(201).json({
    usuario: mapearCuenta(usuario),
    confirmacionRequerida: !data.session
  });
}));

aplicacion.post('/api/auth/login', conManejoErrores(async (solicitud, respuesta) => {
  const clientes = obtenerClientesSupabase(respuesta);
  if (!clientes) return;
  const { datos: supabase, autenticacion: supabaseAuth } = clientes;
  const { email, password } = solicitud.body || {};
  const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || typeof password !== 'string' || !password) {
    return respuesta.status(400).json({ error: 'Escribe un correo y una contraseña válidos.' });
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: correo, password });
  if (error || !data.user || !data.session) {
    return respuesta.status(401).json({ error: 'Correo o contraseña incorrectos, o cuenta sin confirmar.' });
  }

  const { data: usuario, error: errorUsuario } = await supabase
    .from('usuarios')
    .select('id, auth_uid, nombre, email, rol, estado')
    .eq('auth_uid', data.user.id)
    .maybeSingle();
  if (errorUsuario) {
    console.error('Error consultando la cuenta WorkConnect durante el inicio de sesión.', {
      code: errorUsuario.code,
      status: errorUsuario.status
    });
    await supabase.auth.admin.signOut(data.session.access_token, 'local');
    return respuesta.status(500).json({
      error: 'No se pudo consultar el perfil de la cuenta. Intenta de nuevo.'
    });
  }
  if (!usuario) {
    await supabase.auth.admin.signOut(data.session.access_token, 'local');
    return respuesta.status(403).json({
      error: 'La cuenta Auth no está vinculada con un perfil de WorkConnect.'
    });
  }
  if (usuario.estado !== 'Activo') {
    await supabase.auth.admin.signOut(data.session.access_token, 'local');
    return respuesta.status(403).json({ error: 'La cuenta está inactiva. Contacta con soporte.' });
  }

  if (normalizarRol(usuario.rol) === 'candidato') {
    try {
      await asegurarPerfilCandidato(supabase, usuario.id);
    } catch (errorPerfil) {
      await supabase.auth.admin.signOut(data.session.access_token, 'local');
      return respuesta.status(500).json({ error: errorPerfil.message });
    }
  }

  respuesta.set('Cache-Control', 'no-store');
  guardarCookiesSesion(solicitud, respuesta, data.session);
  return respuesta.json({ usuario: mapearCuenta(usuario) });
}));

aplicacion.get('/api/auth/sesion', conManejoErrores(async (solicitud, respuesta) => {
  respuesta.set('Cache-Control', 'no-store');
  const contexto = await obtenerContextoAutenticado(solicitud, respuesta, true);
  if (respuesta.headersSent) return;
  return respuesta.json({ autenticado: Boolean(contexto), usuario: contexto ? mapearCuenta(contexto.usuario) : null });
}));

aplicacion.post('/api/auth/logout', conManejoErrores(async (solicitud, respuesta) => {
  const token = leerCookie(solicitud, 'workconnect-access');
  const supabase = crearClienteBaseDatos();
  if (token && supabase) {
    const { error } = await supabase.auth.admin.signOut(token, 'local');
    if (error && Number(error.status) >= 500) {
      return respuesta.status(503).json({ error: 'No se pudo cerrar la sesión. Intenta de nuevo.' });
    }
  }
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
    .select('id, nombre, email, telefono, ubicacion')
    .eq('id', contexto.usuario.id)
    .single();
  if (errorUsuario) return respuesta.status(500).json({ error: 'No se pudieron cargar los datos de la cuenta.' });

  return respuesta.json({
    perfil: {
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono || '',
      ubicacion: usuario.ubicacion || '',
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

    const rutaArchivo = `${contexto.perfil.id}/${randomUUID()}.pdf`;
    const storage = contexto.supabase.storage.from(bucketCurriculums);
    const { error: errorSubida } = await storage.upload(rutaArchivo, solicitud.body, {
      contentType: 'application/pdf',
      upsert: false
    });
    if (errorSubida) {
      console.error('Error guardando el currículum en Supabase Storage.', {
        statusCode: errorSubida.statusCode,
        message: errorSubida.message
      });
      const bucketInexistente =
        Number(errorSubida.statusCode) === 404 || /bucket not found/i.test(errorSubida.message || '');
      return respuesta.status(bucketInexistente ? 503 : 502).json({
        error: bucketInexistente
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
      const { error: errorLimpieza } = await storage.remove([rutaArchivo]);
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
      const { error: errorEliminacion } = await storage.remove([rutaAnterior]);
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
    .from(bucketCurriculums)
    .download(rutaArchivo);
  if (error || !archivo) {
    console.error('Error descargando el currículum privado.', {
      statusCode: error?.statusCode,
      message: error?.message
    });
    const bucketInexistente = /bucket not found/i.test(error?.message || '');
    return respuesta.status(bucketInexistente ? 503 : 404).json({
      error: bucketInexistente
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
  const { telefono, ubicacion, titulo_profesional, resumen_laboral } = datos;
  const campos = [telefono, ubicacion, titulo_profesional, resumen_laboral];
  if (campos.some((valor) => valor !== undefined && valor !== null && typeof valor !== 'string')) {
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
      typeof titulo_profesional === 'string' ? titulo_profesional.trim() || null : null;
  }
  if (Object.hasOwn(datos, 'resumen_laboral')) {
    actualizacionPerfil.resumen_laboral =
      typeof resumen_laboral === 'string' ? resumen_laboral.trim() || null : null;
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
  return respuesta.json({ guardado: true });
}));


const esUuidValoracion = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
aplicacion.get('/api/candidato/postulaciones/:vacanteId', conManejoErrores(async (req, res) => {
  const ctx = await obtenerCandidatoAutenticado(req, res); if (!ctx) return;
  if (!esUuidValoracion(req.params.vacanteId)) return res.status(400).json({error:'Vacante no válida.'});
  const {data,error} = await ctx.supabase.from('postulaciones').select('id').eq('candidato_id',ctx.perfil.id).eq('vacante_id',req.params.vacanteId).limit(1);
  if (error) return res.status(500).json({error:'No se pudo consultar tu postulación.'});
  return res.json({postulado:data.length > 0});
}));
aplicacion.get('/api/valoraciones-empresa/:id', conManejoErrores(async (req,res) => {
  if (!esUuidValoracion(req.params.id)) return res.status(400).json({error:'Empresa no válida.'});
  const db=obtenerClienteOError(res); if (!db) return;
  const {data,error}=await db.from('valoraciones_empresas').select('calificacion, comentario').eq('empresa_id',req.params.id).eq('estado','Aprobada').order('creado_en',{ascending:false});
  if(error) return res.status(500).json({error:'No se pudieron cargar las valoraciones.'});
  return res.json({valoraciones:data || []});
}));
aplicacion.post('/api/candidato/valoraciones', conManejoErrores(async (req,res) => {
  const ctx=await obtenerCandidatoAutenticado(req,res); if(!ctx) return;
  const {empresa_id,calificacion,comentario}=req.body || {}; const texto=typeof comentario === 'string' ? comentario.trim() : '';
  if (!esUuidValoracion(empresa_id) || !Number.isInteger(calificacion) || calificacion<1 || calificacion>5 || texto.length<3 || texto.length>2000) return res.status(400).json({error:'Selecciona de 1 a 5 estrellas y escribe un comentario de 3 a 2000 caracteres.'});
  const empresa=await ctx.supabase.from('empresas').select('id').eq('id',empresa_id).maybeSingle();
  if(empresa.error) return res.status(500).json({error:'No se pudo comprobar la empresa.'});
  if(!empresa.data) return res.status(404).json({error:'No se encontró la empresa.'});
  const {error}=await ctx.supabase.from('valoraciones_empresas').insert({empresa_id,candidato_id:ctx.perfil.id,calificacion,comentario:texto,estado:'Pendiente'});
  if(error) return res.status(500).json({error:'No se pudo guardar la valoración.'});
  return res.status(201).json({estado:'Pendiente'});
}));

aplicacion.post('/api/candidato/postulaciones', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  const vacanteId = solicitud.body?.vacante_id;
  if (typeof vacanteId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vacanteId)) {
    return respuesta.status(400).json({ error: 'La vacante seleccionada no es válida.' });
  }
  if (!contexto.perfil.curriculum_url) {
    return respuesta.status(400).json({ error: 'Primero guarda tu currículum PDF en Mi perfil para postularte.' });
  }
  const { data: vacante, error: errorVacante } = await contexto.supabase
    .from('vacantes').select('id, estado, fecha_limite').eq('id', vacanteId).maybeSingle();
  if (errorVacante) return respuesta.status(500).json({ error: 'No se pudo comprobar la vacante.' });
  if (!vacante || vacante.estado !== 'Activa') return respuesta.status(404).json({ error: 'Esta vacante no está disponible.' });
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (vacante.fecha_limite && vacante.fecha_limite < hoy) return respuesta.status(400).json({ error: 'El plazo de esta vacante ya finalizó.' });
  const { data: existente, error: errorConsulta } = await contexto.supabase
    .from('postulaciones').select('id').eq('candidato_id', contexto.perfil.id).eq('vacante_id', vacanteId).limit(1);
  if (errorConsulta) return respuesta.status(500).json({ error: 'No se pudo comprobar si ya te postulaste.' });
  if (existente.length) return respuesta.status(409).json({ error: 'Ya te postulaste a esta vacante. Puedes revisarla en Mis postulaciones.' });
  const { data, error } = await contexto.supabase.from('postulaciones').insert({
    vacante_id: vacanteId,
    candidato_id: contexto.perfil.id,
    curriculum_url: contexto.perfil.curriculum_url,
    estado: 'Nueva'
  }).select('id, estado, creado_en').single();
  if (error) return respuesta.status(500).json({ error: 'No se pudo guardar la postulación. Intenta nuevamente.' });
  return respuesta.status(201).json(data);
}));

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
  const { data, error } = await contexto.supabase
    .from(configuracion.tabla)
    .insert({ ...registro, candidato_id: contexto.perfil.id })
    .select()
    .single();
  if (error) return respuesta.status(400).json({ error: 'No se pudo guardar el elemento.' });
  return respuesta.status(201).json(data);
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
  const { data, error } = await contexto.supabase
    .from(configuracion.tabla)
    .update(registro)
    .eq('id', solicitud.params.id)
    .eq('candidato_id', contexto.perfil.id)
    .select()
    .maybeSingle();
  if (error) return respuesta.status(400).json({ error: 'No se pudo actualizar el elemento.' });
  if (!data) return respuesta.status(404).json({ error: 'El elemento no existe en tu perfil.' });
  return respuesta.json(data);
}));

aplicacion.delete('/api/candidato/:tipo/:id', conManejoErrores(async (solicitud, respuesta) => {
  const contexto = await obtenerCandidatoAutenticado(solicitud, respuesta);
  if (!contexto) return;
  const configuracion = Object.hasOwn(tablasCandidato, solicitud.params.tipo)
    ? tablasCandidato[solicitud.params.tipo]
    : null;
  if (!configuracion) return respuesta.status(404).json({ error: 'Tipo de elemento no válido.' });
  const { data, error } = await contexto.supabase
    .from(configuracion.tabla)
    .delete()
    .eq('id', solicitud.params.id)
    .eq('candidato_id', contexto.perfil.id)
    .select('id')
    .maybeSingle();
  if (error) return respuesta.status(400).json({ error: 'No se pudo eliminar el elemento.' });
  if (!data) return respuesta.status(404).json({ error: 'El elemento no existe en tu perfil.' });
  return respuesta.json({ eliminado: true });
}));

// Estado de configuración de la base de datos (sin exponer secretos)
aplicacion.get('/api/estado-bd', (_solicitud, respuesta) => {
  const estado = verificarConfiguracionBaseDatos();
  respuesta.json({
    ...estado,
    tablas: Object.values(configuracionBaseDatos.tablas)
  });
});

// Obtener datos públicos o, para administración, el panel completo.
aplicacion.get('/api/datos', async (solicitud, respuesta) => {
  respuesta.set('Cache-Control', 'no-store');
  const contexto = await obtenerContextoAutenticado(solicitud, respuesta, true);
  if (respuesta.headersSent) return;
  const esAdministrador = contexto?.rol === 'administrador';
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
      esAdministrador
        ? supabase.from('usuarios').select('*').order('creado_en', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      esAdministrador
        ? supabase.from('empresas').select('*').order('creado_en', { ascending: false })
        : supabase
            .from('empresas')
            .select('*')
            .eq('estado_verificacion', 'Verificada')
            .order('creado_en', { ascending: false }),
      esAdministrador
        ? supabase
            .from('vacantes')
            .select('*, empresas(nombre_comercial)')
            .order('creado_en', { ascending: false })
        : supabase
            .from('vacantes')
            .select('*, empresas(nombre_comercial)')
            .eq('estado', 'Activa')
            .order('creado_en', { ascending: false }),
      esAdministrador
        ? supabase.from('postulaciones').select('id, estado, creado_en')
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
    const empresas = (resEmpresas.data || []).map((fila) => {
      const empresa = mapearEmpresa(fila, conteoVacantesPorEmpresa.get(fila.id) || 0);
      if (!esAdministrador) {
        empresa.razonSocial = '';
        empresa.nit = '';
        empresa.contactoCorreo = '';
        empresa.telefono = '';
      }
      return empresa;
    });
    const elementosModeracion = (resModeracion.data || []).map(mapearModeracion);
    const solicitudesVerificacion = (resVerificaciones.data || []).map(
      mapearSolicitudVerificacion
    );
    const recursosLaborales = (resRecursos.data || []).map((fila) =>
      mapearRecurso(esAdministrador ? fila : { ...fila, usuarios: null })
    );
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

aplicacion.use((error, _solicitud, respuesta, _siguiente) => {
  console.error('Error inesperado en una ruta API.', error);
  const codigo = Number(error.status) >= 400 && Number(error.status) < 500 ? Number(error.status) : 500;
  respuesta.status(codigo).json({
    error: codigo === 400 ? 'La solicitud tiene un formato inválido.' : 'Error interno del servidor.'
  });
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
