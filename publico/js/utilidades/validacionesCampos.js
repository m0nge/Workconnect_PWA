export const esTexto = (valor, min, max) => typeof valor === 'string' && valor.trim().length >= min && valor.trim().length <= max;
export const esNumeroCampo = (valor) => (typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '')) && Number.isFinite(Number(valor));
export function esFecha(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(Date.parse(`${valor}T00:00:00Z`)) && new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) === valor;
}
