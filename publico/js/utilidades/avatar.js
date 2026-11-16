import { escaparHtml } from './formato.js';

export function renderizarAvatar({ nombre = '', fotoUrl = '', cuadrado = false, grande = false } = {}) {
  const iniciales = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || 'WC';
  const clase = `${cuadrado ? 'avatar-cuadrado' : 'avatar-circular'}${grande ? ' grande' : ''}`;
  const respaldo = `<span class="${clase}">${escaparHtml(iniciales)}</span>`;
  if (!fotoUrl) return respaldo;
  return `<span class="avatar-con-respaldo">${respaldo}<img class="${clase}" src="${escaparHtml(fotoUrl)}" alt="${escaparHtml(nombre)}" loading="lazy" onerror="this.remove()" /></span>`;
}
