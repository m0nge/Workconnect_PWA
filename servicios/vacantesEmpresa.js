import { esTexto, esFecha, esNumeroCampo } from './validaciones.js';

export function validarVacanteEmpresa(datos, fechaAnterior = null) {
  const texto = (campo) => typeof datos[campo] === 'string' ? datos[campo].trim() : '';
  const lista = (campo) => {
    const valor = datos[campo];
    if (valor === undefined || valor === null) return [];
    if (typeof valor === 'string') return valor.split(/\r?\n/).map((linea) => linea.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
    if (Array.isArray(valor) && valor.every((elemento) => typeof elemento === 'string')) return valor.map((elemento) => elemento.trim()).filter(Boolean);
    return null;
  };
  const campos = {
    titulo: texto('titulo'), sector: texto('sector'), departamento: texto('departamento'), municipio: texto('municipio'),
    modalidad: texto('modalidad'), tipo_contrato: texto('tipo_contrato'), descripcion: texto('descripcion'),
    plazas: datos.plazas === undefined ? 1 : Number(datos.plazas), salario_min: Number(datos.salario_min), salario_max: Number(datos.salario_max),
    fecha_limite: datos.fecha_limite || null, funciones: lista('funciones'), requisitos: lista('requisitos'), beneficios: lista('beneficios')
  };
  if (!esTexto(campos.titulo, 5, 120) || !esTexto(campos.sector, 2, 100) || !esTexto(campos.departamento, 2, 100) ||
      !esTexto(campos.municipio, 2, 100) || !esTexto(campos.tipo_contrato, 2, 80) || !esTexto(campos.descripcion, 10, 10000) ||
      !['Presencial', 'Híbrido', 'Remoto'].includes(campos.modalidad)) return { error: 'Revisa título, sector, ubicación, modalidad, contrato y descripción.' };
  if ((datos.plazas !== undefined && !esNumeroCampo(datos.plazas)) || !Number.isInteger(campos.plazas) || campos.plazas < 1 || campos.plazas > 10000 ||
      !esNumeroCampo(datos.salario_min) || !esNumeroCampo(datos.salario_max) || campos.salario_min < 0 ||
      campos.salario_max < campos.salario_min || campos.salario_max > 1000000) return { error: 'Revisa las plazas y el rango salarial.' };
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (campos.fecha_limite && (!esFecha(campos.fecha_limite) || (campos.fecha_limite !== fechaAnterior && campos.fecha_limite < hoy))) return { error: 'Selecciona una fecha límite válida que no haya pasado.' };
  if ([campos.funciones, campos.requisitos, campos.beneficios].some((elementos) => !elementos || elementos.length > 100 || elementos.some((elemento) => elemento.length > 1000)) ||
      !campos.funciones?.length || !campos.requisitos?.length) return { error: 'Escribe funciones y requisitos. Cada lista admite hasta 100 elementos de 1000 caracteres.' };
  return { datos: campos };
}

export function registrarEdicionVacanteEmpresa(aplicacion, { conManejoErrores, obtenerEmpresaAutenticada, reportarAutomaticamente }) {
  aplicacion.put('/api/empresa/vacantes/:id', conManejoErrores(async (solicitud, respuesta) => {
    const contexto = await obtenerEmpresaAutenticada(solicitud, respuesta);
    if (!contexto) return;
    const { data: existente, error: errorConsulta } = await contexto.supabase.from('vacantes').select('id, fecha_limite')
      .eq('id', solicitud.params.id).eq('empresa_id', contexto.empresa.id).maybeSingle();
    if (errorConsulta) return respuesta.status(503).json({ error: 'No se pudo consultar la oferta.' });
    if (!existente) return respuesta.status(404).json({ error: 'La oferta no existe o no pertenece a tu empresa.' });
    const validacion = validarVacanteEmpresa(solicitud.body || {}, existente.fecha_limite);
    if (validacion.error) return respuesta.status(400).json({ error: validacion.error });
    const { data: vacante, error } = await contexto.supabase.from('vacantes').update(validacion.datos)
      .eq('id', solicitud.params.id).eq('empresa_id', contexto.empresa.id).select('*').maybeSingle();
    if (error) return respuesta.status(503).json({ error: 'No se pudo guardar la oferta.' });
    if (!vacante) return respuesta.status(404).json({ error: 'La oferta ya no está disponible.' });
    let avisoModeracion = false;
    try {
      await reportarAutomaticamente(contexto.supabase, { texto: [vacante.titulo, vacante.descripcion, ...vacante.funciones, ...vacante.requisitos, ...vacante.beneficios].join(' '), tipo: 'reporte', categoria: 'Reportes', origen: 'vacantes', id: vacante.id, autor: contexto.usuario.nombre });
    } catch { avisoModeracion = true; }
    return respuesta.json({ guardado: true, vacante, ...(avisoModeracion ? { avisoModeracion: true } : {}) });
  }));
}
