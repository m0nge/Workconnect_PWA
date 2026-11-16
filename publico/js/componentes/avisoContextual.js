export function mostrarAvisoContextual(contenedor, { titulo, mensaje, tipo = 'error', accion, alAccionar } = {}) {
  if (!contenedor) return;
  contenedor.replaceChildren();
  contenedor.hidden = false;
  contenedor.className = `aviso-contextual aviso-contextual-${tipo}`;
  contenedor.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  contenedor.setAttribute('tabindex', '-1');
  const encabezado = document.createElement('strong');
  encabezado.textContent = titulo || (tipo === 'error' ? 'Revisa este paso' : 'Información');
  const texto = document.createElement('p');
  texto.textContent = mensaje;
  contenedor.append(encabezado, texto);
  if (accion && alAccionar) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton';
    boton.textContent = accion;
    boton.addEventListener('click', alAccionar);
    contenedor.append(boton);
  }
  contenedor.focus({ preventScroll: true });
  contenedor.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}
