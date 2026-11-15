import { escaparHtml } from '../utilidades/formato.js';

export function renderizarP04Recursos(contenedor, datos, titulo = 'Recursos laborales') {
  const recursos = datos.recursosLaborales || [];
  contenedor.innerHTML = `<div class="pila-vertical"><div class="cabecera-pantalla"><h1 class="titulo-pantalla">${titulo}</h1><p class="subtitulo-pantalla">Artículos, consejos y herramientas para avanzar en tu carrera.</p></div><div class="filtros-recursos"><input id="buscar-recurso" class="campo-select" type="search" maxlength="80" placeholder="Buscar recurso..." /><select id="categoria-recurso" class="campo-select"><option value="">Todas las categorías</option>${[...new Set(recursos.map((recurso) => recurso.categoria).filter(Boolean))].map((categoria) => `<option>${escaparHtml(categoria)}</option>`).join('')}</select></div><div id="lista-recursos" class="cuadricula-recursos"></div></div>`;
  const pintar = () => {
    const termino = contenedor.querySelector('#buscar-recurso').value.trim().toLowerCase();
    const categoria = contenedor.querySelector('#categoria-recurso').value;
    const filtrados = recursos.filter((recurso) => (!termino || `${recurso.titulo} ${recurso.resumen}`.toLowerCase().includes(termino)) && (!categoria || recurso.categoria === categoria));
    contenedor.querySelector('#lista-recursos').innerHTML = filtrados.length ? filtrados.map((recurso) => `<article class="tarjeta tarjeta-recurso-publico"><span class="etiqueta-cuadrada">${escaparHtml(recurso.categoria || 'General')}</span><h2 class="titulo-tarjeta">${escaparHtml(recurso.titulo)}</h2><p class="texto-secundario">${escaparHtml(recurso.resumen || 'Contenido para tu desarrollo profesional.')}</p><p class="texto-secundario">${recurso.tiempoLecturaMin} min de lectura · ${escaparHtml(recurso.nivelLectura)}</p><button class="boton-secundario" type="button" data-recurso="${recurso.id}">Leer recurso</button></article>`).join('') : '<div class="tarjeta tarjeta-espaciado"><p class="subtitulo-pantalla">No hay recursos disponibles.</p></div>';
  };
  contenedor.querySelector('#buscar-recurso').addEventListener('input', pintar);
  contenedor.querySelector('#categoria-recurso').addEventListener('change', pintar);
  pintar();
}
