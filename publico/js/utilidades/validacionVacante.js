import { esTexto, esFecha, esNumeroCampo } from './validacionesCampos.js';

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
  const errores = {};
  for (const [campo, minimo, maximo, mensaje] of [
    ['titulo', 5, 120, 'Escribe un título de entre 5 y 120 caracteres.'],
    ['sector', 2, 100, 'Selecciona el sector económico.'],
    ['departamento', 2, 100, 'Selecciona el departamento.'],
    ['municipio', 2, 100, 'Selecciona el municipio.'],
    ['tipo_contrato', 2, 80, 'Selecciona el tipo de contrato.'],
    ['descripcion', 10, 10000, 'Escribe una descripción de entre 10 y 10,000 caracteres.']
  ]) if (!esTexto(campos[campo], minimo, maximo)) errores[campo] = mensaje;
  if (!['Presencial', 'Híbrido', 'Remoto'].includes(campos.modalidad)) errores.modalidad = 'Selecciona la modalidad: presencial, híbrida o remota.';
  if ((datos.plazas !== undefined && !esNumeroCampo(datos.plazas)) || !Number.isInteger(campos.plazas) || campos.plazas < 1 || campos.plazas > 10000) errores.plazas = 'Indica un número entero de plazas entre 1 y 10,000.';
  if (!esNumeroCampo(datos.salario_min) || campos.salario_min < 0 || campos.salario_min > 1000000) errores.salario_min = 'Indica el salario mínimo entre 0 y 1,000,000 USD.';
  else if (Math.abs(campos.salario_min * 100 - Math.round(campos.salario_min * 100)) > 0.000001) errores.salario_min = 'Escribe el salario mínimo con un máximo de dos decimales.';
  if (!esNumeroCampo(datos.salario_max) || campos.salario_max < 0 || campos.salario_max > 1000000) errores.salario_max = 'Indica el salario máximo entre 0 y 1,000,000 USD.';
  else if (Math.abs(campos.salario_max * 100 - Math.round(campos.salario_max * 100)) > 0.000001) errores.salario_max = 'Escribe el salario máximo con un máximo de dos decimales.';
  else if (!errores.salario_min && campos.salario_max < campos.salario_min) errores.salario_max = 'El salario máximo debe ser igual o mayor que el salario mínimo.';
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (campos.fecha_limite && (!esFecha(campos.fecha_limite) || (campos.fecha_limite !== fechaAnterior && campos.fecha_limite < hoy))) errores.fecha_limite = 'Selecciona una fecha válida de hoy en adelante, o deja este campo vacío.';
  for (const campo of ['funciones', 'requisitos', 'beneficios']) {
    if (!campos[campo] || campos[campo].length > 100 || campos[campo].some((elemento) => elemento.length > 1000)) errores[campo] = 'Escribe como máximo 100 elementos, uno por línea, de hasta 1,000 caracteres cada uno.';
    else if (campo !== 'beneficios' && !campos[campo].length) errores[campo] = `Escribe al menos ${campo === 'funciones' ? 'una función' : 'un requisito'}, uno por línea.`;
  }
  return Object.keys(errores).length ? { error: Object.values(errores)[0], errores } : { datos: campos };
}
