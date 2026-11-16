import { escaparHtml } from '../utilidades/formato.js';
import { abrirModal } from './modal.js';

export function abrirDetalleRecurso(recurso, { mostrarEstado = false } = {}) {
  abrirModal({
    titulo: recurso.titulo || 'Recurso laboral',
    subtitulo: `${recurso.categoria || 'General'} · ${recurso.tiempoLecturaMin || 0} min de lectura`,
    contenidoHtml: `<article class="recurso-detalle-lectura">
      ${recurso.imagenPortadaUrl ? `<img class="recurso-detalle-portada" src="${escaparHtml(recurso.imagenPortadaUrl)}" alt="${escaparHtml(recurso.titulo)}" onerror="this.remove()" />` : ''}
      <div class="grupo-acciones"><span class="etiqueta-cuadrada">${escaparHtml(recurso.nivelLectura || 'General')}</span>${mostrarEstado ? `<span class="etiqueta-cuadrada">${escaparHtml(recurso.estadoPublicacion || recurso.estado || 'Borrador')}</span>` : ''}</div>
      ${recurso.autor ? `<p class="texto-secundario">Por ${escaparHtml(recurso.autor)}</p>` : ''}
      <p class="detalle-texto recurso-detalle-texto">${escaparHtml(recurso.contenido || recurso.resumen || 'Contenido no disponible.')}</p>
      ${recurso.etiquetas?.length ? `<div class="grupo-acciones">${recurso.etiquetas.map((etiqueta) => `<span class="etiqueta-cuadrada">${escaparHtml(etiqueta)}</span>`).join('')}</div>` : ''}
    </article>`,
    alMontar(cuerpo, cerrar) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'boton';
      boton.textContent = 'Cerrar';
      boton.addEventListener('click', cerrar);
      cuerpo.append(boton);
    }
  });
}
