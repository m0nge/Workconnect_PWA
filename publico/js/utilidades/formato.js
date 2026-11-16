
export function escaparHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function textoSeguro(valor) {
  return String(valor || '').trim();
}

export function validarTexto(valor, minimo, maximo) {
  const texto = textoSeguro(valor);
  return texto.length >= minimo && texto.length <= maximo;
}

export function validarCorreo(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textoSeguro(valor));
}

export function validarNumero(valor, minimo, maximo) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo;
}

export function valorEnLista(valor, opciones) {
  return opciones.includes(valor);
}

export function iconoBusquedaSvg() {
  return `
    <svg class="icono-lupa" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  `;
}
