import { escaparHtml } from '../utilidades/formato.js';

function abrirDialogo({ titulo, mensaje, entrada = false, cancelable = true, etiqueta = 'Aceptar' }) {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo-interaccion';
    dialogo.setAttribute('aria-labelledby', 'titulo-dialogo-interaccion');
    dialogo.innerHTML = `<form method="dialog" class="pila-compacta">
      <h2 id="titulo-dialogo-interaccion" class="titulo-pantalla">${escaparHtml(titulo)}</h2>
      <p>${escaparHtml(mensaje)}</p>
      ${entrada ? '<label class="campo-formulario"><span>Motivo del reporte</span><textarea name="texto" rows="4" minlength="5" maxlength="1000" required autofocus></textarea></label>' : ''}
      <div class="grupo-acciones">
        ${cancelable ? '<button type="button" class="boton" data-cancelar>Cancelar</button>' : ''}
        <button class="boton" data-accion-visual="${etiqueta === 'Eliminar' ? 'eliminar' : 'principal'}" value="aceptar">${escaparHtml(etiqueta)}</button>
      </div>
    </form>`;
    dialogo.querySelector('[data-cancelar]')?.addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('close', () => {
      const aceptado = dialogo.returnValue === 'aceptar';
      const texto = entrada ? dialogo.querySelector('textarea').value.trim() : null;
      dialogo.remove();
      resolver(entrada ? (aceptado ? texto : null) : aceptado);
    }, { once: true });
    document.body.append(dialogo);
    dialogo.showModal();
  });
}

export const confirmarAccion = (mensaje) => abrirDialogo({ titulo: 'Confirmar eliminación', mensaje, etiqueta: 'Eliminar' });
export const pedirMotivo = () => abrirDialogo({ titulo: 'Reportar contenido', mensaje: 'Describe el motivo del reporte (5 a 1000 caracteres).', entrada: true, etiqueta: 'Enviar reporte' });
export const mostrarAviso = (mensaje) => abrirDialogo({ titulo: 'Aviso', mensaje, cancelable: false });
