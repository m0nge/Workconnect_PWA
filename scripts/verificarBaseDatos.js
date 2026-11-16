import 'dotenv/config';
import comprobar from 'node:assert/strict';
import { readFile as leerArchivo } from 'node:fs/promises';
import { randomUUID as crearIdentificador, randomBytes as crearBytes, randomInt as numeroAleatorio } from 'node:crypto';

process.env.VERCEL = '1';
process.env.SESSION_SECRET = crearBytes(32).toString('hex');
const { default: aplicacion } = await import('../servidor.js');
const { crearClienteBaseDatos } = await import('../servicios/supabase.js');
const { crearTokenSesion } = await import('../servicios/sesion.js');
const cliente = crearClienteBaseDatos();
if (!cliente) throw new Error('Falta la configuración de la base de datos.');
const marcador = `revision-${crearIdentificador()}`;
const correos = [];
const referencias = new Set();
const recursos = [];
const temas = [];
let verificaciones = 0;
const servidor = await new Promise((resolver) => { const instancia = aplicacion.listen(0, '127.0.0.1', () => resolver(instancia)); });
const origen = `http://127.0.0.1:${servidor.address().port}`;

async function consultar(consulta) {
  const { data: datos, error } = await consulta;
  if (error) throw new Error(`La comprobación de base de datos falló (${error.code || 'sin código'}).`);
  return datos || [];
}

async function solicitar(metodo, ruta, datos, sesion, esperado = 200, cabeceras = {}) {
  const esArchivo = Buffer.isBuffer(datos);
  const respuesta = await fetch(origen + ruta, {
    method: metodo, headers: { ...(esArchivo ? {} : { 'Content-Type': 'application/json' }), ...(sesion ? { Cookie: sesion.cookie } : {}), ...cabeceras },
    ...(datos === undefined ? {} : { body: esArchivo ? datos : JSON.stringify(datos) }), signal: AbortSignal.timeout(20000)
  });
  const cuerpo = respuesta.headers.get('content-type')?.includes('application/json') ? await respuesta.json() : Buffer.from(await respuesta.arrayBuffer());
  if (respuesta.status !== esperado) throw new Error(`${metodo} ${ruta}: HTTP ${respuesta.status}; ${cuerpo.error || 'respuesta inesperada'}`);
  verificaciones++;
  return { cuerpo, cookie: respuesta.headers.getSetCookie().map((valor) => valor.split(';')[0]).join('; ') };
}

async function registrar(tipo, indice) {
  const correo = `${marcador}-${tipo}-${indice}@example.invalid`;
  correos.push(correo);
  const digitos = numeroAleatorio(0, 100000000).toString().padStart(8, '0') + numeroAleatorio(0, 1000000).toString().padStart(6, '0');
  const datos = { nombre: `Revisión temporal ${tipo} ${indice}`, email: correo, password: crearBytes(18).toString('hex'), rol: tipo, estado_verificacion: 'Verificada',
    ...(tipo === 'empresa' ? { sector: 'Servicios', telefono: '2222-3333', departamento: 'San Salvador', municipio: 'San Salvador',
      nit: `${digitos.slice(0, 4)}-${digitos.slice(4, 10)}-${digitos.slice(10, 13)}-${digitos.slice(13)}`, tamano: '1-10 empleados' } : {}) };
  const registro = await solicitar('POST', '/api/auth/registro', datos, null, 201);
  comprobar.ok(registro.cuerpo.usuario?.id);
  const sesion = { cookie: registro.cookie, id: registro.cuerpo.usuario.id, datos };
  referencias.add(sesion.id);
  const lectura = await solicitar('GET', '/api/auth/sesion', undefined, sesion);
  comprobar.equal(lectura.cuerpo.autenticado, true);
  const entrada = await solicitar('POST', '/api/auth/login', { email: correo, password: datos.password });
  comprobar.equal(entrada.cuerpo.usuario.id, sesion.id);
  await solicitar('POST', '/api/auth/registro', datos, null, 409);
  return sesion;
}

function crearPdf() {
  const contenido = 'BT /F1 12 Tf 40 740 Td (Revision temporal) Tj ET';
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let texto = '%PDF-1.4\n'; const posiciones = [0];
  objetos.forEach((objeto, indice) => { posiciones.push(Buffer.byteLength(texto)); texto += `${indice + 1} 0 obj\n${objeto}\nendobj\n`; });
  const inicioIndice = Buffer.byteLength(texto);
  texto += `xref\n0 6\n0000000000 65535 f \n${posiciones.slice(1).map((posicion) => `${String(posicion).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${inicioIndice}\n%%EOF`;
  return Buffer.from(texto);
}

async function limpiar() {
  const usuarios = await consultar(cliente.from('usuarios').select('id').in('email', correos));
  const identificadores = usuarios.map((usuario) => usuario.id);
  if (!identificadores.length) return;
  const perfiles = await consultar(cliente.from('perfiles_candidatos').select('id, curriculum_url').in('usuario_id', identificadores));
  const empresas = await consultar(cliente.from('empresas').select('id').in('usuario_id', identificadores));
  for (const prefijo of [...identificadores, ...empresas.map((empresa) => `empresas/${empresa.id}`)]) {
    const { data: imagenes, error: errorLista } = await cliente.storage.from('fotos-candidatos').list(prefijo);
    if (errorLista) throw new Error('No se pudieron consultar las fotos temporales.');
    if (imagenes.length) {
      const { error } = await cliente.storage.from('fotos-candidatos').remove(imagenes.map((imagen) => `${prefijo}/${imagen.name}`));
      if (error) throw new Error('No se pudieron retirar las fotos temporales.');
    }
  }
  const ofertas = empresas.length ? await consultar(cliente.from('vacantes').select('id').in('empresa_id', empresas.map((empresa) => empresa.id))) : [];
  const postulaciones = perfiles.length ? await consultar(cliente.from('postulaciones').select('id').in('candidato_id', perfiles.map((perfil) => perfil.id))) : [];
  [...identificadores, ...perfiles.map((p) => p.id), ...ofertas.map((v) => v.id), ...postulaciones.map((p) => p.id)].forEach((id) => referencias.add(id));
  if (temas.length) {
    const respuestas = await consultar(cliente.from('foros_respuestas').select('id').in('tema_id', temas));
    respuestas.forEach((respuesta) => referencias.add(respuesta.id));
  }
  if (referencias.size) await consultar(cliente.from('moderacion_reportes').delete().in('referencia', [...referencias]));
  if (temas.length) {
    await consultar(cliente.from('foros_respuestas').delete().in('tema_id', temas));
    await consultar(cliente.from('foros_temas').delete().in('id', temas));
  }
  if (recursos.length) await consultar(cliente.from('recursos_laborales').delete().in('id', recursos));
  if (empresas.length) await consultar(cliente.from('valoraciones_empresas').delete().in('empresa_id', empresas.map((empresa) => empresa.id)));
  if (perfiles.length) {
    for (const tabla of ['postulaciones', 'experiencias_laborales', 'estudios_candidatos', 'habilidades_candidatos', 'alertas_laborales']) {
      await consultar(cliente.from(tabla).delete().in('candidato_id', perfiles.map((perfil) => perfil.id)));
    }
    for (const perfil of perfiles) {
      const almacen = cliente.storage.from('curriculums-candidatos');
      const { data: archivos, error: errorLista } = await almacen.list(perfil.id);
      if (errorLista) throw new Error('No se pudieron consultar los PDF temporales.');
      if (archivos.length) {
        const { error } = await almacen.remove(archivos.map((archivo) => `${perfil.id}/${archivo.name}`));
        if (error) throw new Error('No se pudieron retirar los PDF temporales.');
      }
    }
  }
  if (ofertas.length) await consultar(cliente.from('vacantes').delete().in('id', ofertas.map((oferta) => oferta.id)));
  if (empresas.length) await consultar(cliente.from('empresas').delete().in('id', empresas.map((empresa) => empresa.id)));
  if (perfiles.length) await consultar(cliente.from('perfiles_candidatos').delete().in('id', perfiles.map((perfil) => perfil.id)));
  await consultar(cliente.from('usuarios').delete().in('id', identificadores));
  console.log('Registros temporales eliminados.');
}

try {
  const candidatas = [await registrar('candidato', 1), await registrar('candidato', 2)];
  const empresas = [await registrar('empresa', 1), await registrar('empresa', 2)];
  console.log('Registro, login, sesión y correo duplicado: correctos.');
  const administradores = await consultar(cliente.from('usuarios').select('id, rol').eq('email', 'daniela.monge@catolica.edu.sv').eq('estado', 'Activo'));
  comprobar.equal(administradores.length, 1);
  const administracion = { cookie: `workconnect-session=${crearTokenSesion(administradores[0].id)}` };
  const candidata = candidatas[0]; const empresa = empresas[0];
  const imagen = await leerArchivo(new URL('../publico/multimedia/icono.png', import.meta.url));
  for (const [sesion, ruta, campo] of [[candidata, '/api/candidato/foto', 'foto_url'], [empresa, '/api/empresa/logo', 'logo_url']]) {
    const primera = (await solicitar('POST', ruta, imagen, sesion, 200, { 'Content-Type': 'image/png' })).cuerpo[campo];
    const segunda = (await solicitar('POST', ruta, imagen, sesion, 200, { 'Content-Type': 'image/png' })).cuerpo[campo];
    comprobar.notEqual(primera, segunda);
    const publicada = await fetch(segunda);
    comprobar.equal(publicada.status, 200);
    comprobar.deepEqual(Buffer.from(await publicada.arrayBuffer()), imagen);
    const cuenta = await consultar(cliente.from('usuarios').select('foto_url').eq('id', sesion.id));
    comprobar.equal(cuenta[0].foto_url, segunda);
    await solicitar('POST', ruta, Buffer.from('archivo que no es una imagen'), sesion, 400, { 'Content-Type': 'image/png' });
  }
  console.log('Fotos y logos: reemplazo sin caché, persistencia y descarga correctos.');
  await solicitar('PUT', `/api/usuarios/${candidata.id}`, { nombre: 'Persona temporal actualizada', correo: candidata.datos.email, rol: 'Candidato/a' }, administracion);
  await solicitar('PATCH', `/api/usuarios/${candidata.id}/estado`, {}, administracion);
  await solicitar('GET', '/api/auth/sesion', undefined, candidata, 403);
  await solicitar('PATCH', `/api/usuarios/${candidata.id}/estado`, {}, administracion);
  await solicitar('POST', '/api/reportes', {}, null, 401);
  await solicitar('POST', '/api/candidato/valoraciones', {}, null, 401);
  await solicitar('POST', '/api/foros/temas', {}, null, 401);
  await solicitar('PUT', '/api/candidato/perfil', { titulo_profesional: 'Asistente temporal', resumen_laboral: 'Experiencia en atención y organización.' }, candidata);
  const listas = {
    experiencias: { puesto: 'Asistente temporal', empresa: 'Revisión temporal', fecha_inicio: '2020-01-01', fecha_fin: '2021-01-01', es_trabajo_actual: false },
    estudios: { carrera_programa: 'Administración', institucion: 'Revisión temporal', nivel_academico: 'Licenciatura / Ingeniería', anio_inicio: 2020, anio_fin: 2023 },
    habilidades: { habilidad: 'Organización temporal', nivel_dominio: 'Intermedio' },
    alertas: { nombre_alerta: 'Alerta temporal', sector: 'Servicios', frecuencia: 'Semanal', activa: true }
  };
  for (const [tipo, datos] of Object.entries(listas)) {
    const alta = await solicitar('POST', `/api/candidato/${tipo}`, datos, candidata, 201);
    referencias.add(alta.cuerpo.id);
    await solicitar('PUT', `/api/candidato/${tipo}/${alta.cuerpo.id}`, datos, candidatas[1], 404);
    await solicitar('DELETE', `/api/candidato/${tipo}/${alta.cuerpo.id}`, undefined, candidatas[1], 404);
    await solicitar('PUT', `/api/candidato/${tipo}/${alta.cuerpo.id}`, datos, candidata);
    await solicitar('DELETE', `/api/candidato/${tipo}/${alta.cuerpo.id}`, undefined, candidata);
  }
  console.log('Perfil, experiencia, estudios, habilidades y alertas: CRUD y permisos correctos.');
  const perfilEmpresa = (await solicitar('GET', '/api/empresa/perfil', undefined, empresa)).cuerpo.empresa;
  comprobar.equal(perfilEmpresa.estado_verificacion, 'Pendiente');
  await solicitar('PATCH', `/api/empresas/${perfilEmpresa.id}/estado`, { estado: 'Verificada' }, empresa, 403);
  await solicitar('PUT', '/api/empresa/perfil', { ...perfilEmpresa, estado_verificacion: 'Verificada', descripcion: 'Empresa temporal de verificación de operaciones.' }, empresa);
  comprobar.equal((await solicitar('GET', '/api/empresa/perfil', undefined, empresa)).cuerpo.empresa.estado_verificacion, 'Pendiente');
  const datosPublicos = (await solicitar('GET', '/api/datos')).cuerpo;
  comprobar.equal(datosPublicos.empresas.some((registro) => registro.id === perfilEmpresa.id), false);
  const datosAdministracion = (await solicitar('GET', '/api/datos', undefined, administracion)).cuerpo;
  comprobar.ok(datosAdministracion.empresas.some((registro) => registro.id === perfilEmpresa.id && registro.estado === 'Pendiente'));
  const oferta = { titulo: 'Oferta temporal de revisión', sector: 'Servicios', departamento: 'San Salvador', municipio: 'San Salvador', modalidad: 'Presencial', tipo_contrato: 'Tiempo completo', plazas: 1, salario_min: 500, salario_max: 700, descripcion: 'Oferta temporal para comprobar el flujo de datos.', funciones: ['Organizar documentos'], requisitos: ['Experiencia administrativa'], beneficios: ['Capacitación'] };
  const vacante = (await solicitar('POST', '/api/empresa/vacantes', oferta, empresa, 201)).cuerpo.vacante;
  referencias.add(vacante.id);
  comprobar.equal((await solicitar('GET', '/api/datos')).cuerpo.vacantes.some((registro) => registro.id === vacante.id), false);
  await solicitar('PATCH', `/api/empresas/${perfilEmpresa.id}/estado`, { estado: 'Verificada' }, administracion);
  comprobar.equal((await solicitar('GET', '/api/empresa/perfil', undefined, empresa)).cuerpo.empresa.estado_verificacion, 'Verificada');
  comprobar.ok((await solicitar('GET', '/api/datos')).cuerpo.vacantes.some((registro) => registro.id === vacante.id && registro.empresaVerificada));
  console.log('Empresas nuevas: pendientes, sin autoaprobación y públicas únicamente después de aprobación administrativa.');
  await solicitar('PUT', `/api/empresa/vacantes/${vacante.id}`, oferta, empresas[1], 404);
  await solicitar('DELETE', `/api/empresa/vacantes/${vacante.id}`, undefined, empresas[1], 404);
  await solicitar('PUT', `/api/empresa/vacantes/${vacante.id}`, { ...oferta, titulo: 'Oferta temporal actualizada' }, empresa);
  await solicitar('PUT', `/api/empresa/vacantes/${vacante.id}/estado`, { estado: 'Inactiva' }, empresa);
  await solicitar('PUT', `/api/empresa/vacantes/${vacante.id}/estado`, { estado: 'Activa' }, empresa);
  console.log('Perfil de empresa y ofertas: creación, edición, estado y aislamiento correctos.');
  await solicitar('POST', '/api/candidato/curriculum', crearPdf(), candidata, 200, { 'Content-Type': 'application/pdf', 'X-File-Name': 'revision-temporal.pdf' });
  const postulacion = (await solicitar('POST', '/api/candidato/postulaciones', { vacante_id: vacante.id }, candidata, 201)).cuerpo;
  referencias.add(postulacion.id);
  await solicitar('POST', '/api/candidato/postulaciones', { vacante_id: vacante.id }, candidata, 409);
  await solicitar('POST', '/api/candidato/curriculum', crearPdf(), candidatas[1], 200, { 'Content-Type': 'application/pdf', 'X-File-Name': 'revision-sin-postulaciones.pdf' });
  await solicitar('DELETE', '/api/candidato/curriculum', undefined, null, 401);
  await solicitar('DELETE', '/api/candidato/curriculum', undefined, empresa, 403);
  await solicitar('DELETE', '/api/candidato/curriculum', { candidato_id: candidatas[1].id }, candidata);
  comprobar.equal((await solicitar('GET', '/api/candidato/perfil', undefined, candidata)).cuerpo.perfil.curriculum_nombre, '');
  await solicitar('GET', '/api/candidato/curriculum', undefined, candidata, 404);
  comprobar.equal((await solicitar('GET', '/api/candidato/perfil', undefined, candidatas[1])).cuerpo.perfil.curriculum_nombre, 'revision-sin-postulaciones.pdf');
  await solicitar('DELETE', '/api/candidato/curriculum', undefined, candidatas[1]);
  const perfilSinPostulaciones = (await consultar(cliente.from('perfiles_candidatos').select('id').eq('usuario_id', candidatas[1].id)))[0];
  const { data: archivosRetirados, error: errorListaCurriculums } = await cliente.storage.from('curriculums-candidatos').list(perfilSinPostulaciones.id);
  comprobar.equal(errorListaCurriculums, null);
  comprobar.equal(archivosRetirados.length, 0);
  const recibidas = (await solicitar('GET', '/api/empresa/postulaciones', undefined, empresa)).cuerpo.postulaciones;
  comprobar.ok(recibidas.some((registro) => registro.id === postulacion.id));
  comprobar.ok(recibidas.find((registro) => registro.id === postulacion.id).candidato.foto_url);
  await solicitar('POST', '/api/reportes', { origen: 'postulaciones', id: postulacion.id, motivo: 'Reporte temporal para verificar la foto del candidato' }, empresa, 201);
  const datosConFotos = (await solicitar('GET', '/api/datos', undefined, administracion)).cuerpo;
  comprobar.ok(datosConFotos.empresas.find((registro) => registro.id === perfilEmpresa.id).logoUrl);
  const reportePostulacion = datosConFotos.elementosModeracion.find((registro) => registro.referencia === postulacion.id);
  comprobar.ok(reportePostulacion.fotoUrl);
  comprobar.ok(reportePostulacion.candidatoNombre);
  console.log('Fotos de empresas y candidatos presentes en las listas y reportes de administración.');
  await solicitar('GET', `/api/empresa/postulaciones/${postulacion.id}/curriculum`, undefined, empresa);
  await solicitar('GET', `/api/empresa/postulaciones/${postulacion.id}/curriculum`, undefined, empresas[1], 404);
  await solicitar('PUT', `/api/empresa/postulaciones/${postulacion.id}/estado`, { estado: 'Entrevista' }, empresa);
  console.log('Currículum y postulaciones: envío, recepción, descarga y actualización correctos.');
  const tema = (await solicitar('POST', '/api/foros/temas', { titulo: `Revisión temporal ${marcador}`, categoria: 'Desarrollo profesional', descripcion: 'Conversación temporal de revisión de las operaciones del portal.' }, candidata, 201)).cuerpo;
  temas.push(tema.id); referencias.add(tema.id);
  const comentario = (await solicitar('POST', `/api/foros/temas/${tema.id}/respuestas`, { contenido: 'Comentario temporal para comprobar inserciones y lecturas.' }, candidata, 201)).cuerpo.respuesta;
  referencias.add(comentario.id);
  const automatico = (await solicitar('POST', `/api/foros/temas/${tema.id}/respuestas`, { contenido: 'Comentario temporal con violencia para verificar la detección automática.' }, candidata, 201)).cuerpo.respuesta;
  referencias.add(automatico.id);
  const detectados = await consultar(cliente.from('moderacion_reportes').select('id').eq('referencia', automatico.id));
  comprobar.equal(detectados.length, 1);
  await solicitar('POST', '/api/reportes', { origen: 'foros_respuestas', id: comentario.id, motivo: 'Reporte temporal de comprobación' }, candidata, 201);
  const reporte = (await consultar(cliente.from('moderacion_reportes').select('id').eq('referencia', comentario.id)))[0];
  await solicitar('PATCH', `/api/moderacion/${reporte.id}/estado`, { estado: 'Oculto' }, administracion);
  await solicitar('PATCH', `/api/moderacion/${reporte.id}/estado`, { estado: 'Aprobado' }, administracion);
  await solicitar('DELETE', `/api/moderacion/${reporte.id}`, undefined, administracion);
  await solicitar('PUT', `/api/admin/foros/${tema.id}`, { titulo: 'Tema temporal actualizado', categoria: tema.categoria, contenido: 'Descripción temporal actualizada para comprobar la edición.' }, administracion);
  await solicitar('PATCH', `/api/admin/foros/${tema.id}/estado`, { estado: 'Oculto' }, administracion);
  await solicitar('PATCH', `/api/admin/foros/${tema.id}/estado`, { estado: 'Activo' }, administracion);
  await solicitar('DELETE', `/api/admin/foros/${tema.id}`, undefined, administracion);
  console.log('Foros, respuestas, reportes y moderación: operaciones correctas.');
  const recurso = { titulo: `Recurso temporal ${marcador}`, categoria: 'Artículo', nivelLectura: 'Básico', tiempoLecturaMin: 5, resumen: 'Resumen temporal para verificar las operaciones con recursos.', contenido: 'Contenido temporal para verificar inserciones, ediciones y eliminaciones.', estadoPublicacion: 'Publicado', audiencia: ['Visitantes'], etiquetas: ['Temporal'] };
  const recursoCreado = (await solicitar('POST', '/api/recursos', recurso, administracion, 201)).cuerpo;
  recursos.push(recursoCreado.id);
  await solicitar('PUT', `/api/recursos/${recursoCreado.id}`, { ...recurso, titulo: 'Recurso temporal actualizado' }, administracion);
  await solicitar('PATCH', `/api/recursos/${recursoCreado.id}/estado`, { estado: 'Borrador' }, administracion);
  await solicitar('DELETE', `/api/recursos/${recursoCreado.id}`, undefined, administracion);
  await solicitar('POST', '/api/candidato/valoraciones', { empresa_id: perfilEmpresa.id, calificacion: 5, comentario: 'Valoración temporal de revisión de operaciones.' }, candidata, 201);
  await solicitar('DELETE', `/api/empresa/vacantes/${vacante.id}`, undefined, empresa);
  console.log(`Verificación real completada: ${verificaciones} operaciones correctas.`);
} finally {
  try { await limpiar(); } finally { await new Promise((resolver) => servidor.close(resolver)); }
}
