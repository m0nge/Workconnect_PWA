import { escaparHtml } from '../utilidades/formato.js';

// Controlador de ventana modal reutilizable
export function abrirModal({ titulo, subtitulo = '', contenidoHtml, alMontar }) {
  const modalRaiz = document.getElementById('modal-raiz');
  if (!modalRaiz) return;

  modalRaiz.innerHTML = `
    <div class="modal-fondo" id="modal-fondo-cerrar">
      <div class="modal-ventana" role="dialog" aria-modal="true" aria-labelledby="modal-titulo-texto">
        <div class="modal-cabecera">
          <div>
            <h3 id="modal-titulo-texto" class="modal-titulo">${escaparHtml(titulo)}</h3>
            ${subtitulo ? `<p class="modal-subtitulo">${escaparHtml(subtitulo)}</p>` : ''}
          </div>
          <button type="button" class="modal-boton-cerrar" id="modal-cerrar-x" aria-label="Cerrar modal">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-cuerpo" id="modal-cuerpo-contenido">
          ${contenidoHtml}
        </div>
      </div>
    </div>
  `;

  const botonCerrar = modalRaiz.querySelector('#modal-cerrar-x');
  const fondoModal = modalRaiz.querySelector('#modal-fondo-cerrar');
  const cuerpoModal = modalRaiz.querySelector('#modal-cuerpo-contenido');

  if (botonCerrar) {
    botonCerrar.addEventListener('click', cerrarModal);
  }

  if (fondoModal) {
    fondoModal.addEventListener('click', (evento) => {
      if (evento.target === fondoModal) {
        cerrarModal();
      }
    });
  }

  if (typeof alMontar === 'function' && cuerpoModal) {
    alMontar(cuerpoModal, cerrarModal);
  }
}

export function cerrarModal() {
  const modalRaiz = document.getElementById('modal-raiz');
  if (modalRaiz) {
    modalRaiz.innerHTML = '';
  }
}
