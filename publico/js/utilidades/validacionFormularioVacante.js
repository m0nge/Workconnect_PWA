import { validarVacanteEmpresa } from './validacionVacante.js';

export function enlazarValidacionVacante(formulario, fechaAnterior = null) {
  formulario.noValidate = true;
  const campos = { titulo: 'titulo', sector: 'sector', departamento: 'departamento', municipio: 'municipio', modalidad: 'modalidad', tipo_contrato: 'contrato', plazas: 'plazas', salario_min: 'salario-min', salario_max: 'salario-max', fecha_limite: 'fecha-limite', descripcion: 'descripcion', funciones: 'funciones', requisitos: 'requisitos', beneficios: 'beneficios' };
  const resumen = formulario.querySelector('#vacante-mensaje-estado');
  let intentado = false;
  const entradas = Object.fromEntries(Object.entries(campos).map(([campo, sufijo]) => [campo, formulario.querySelector(`#vacante-${sufijo}`)]));
  const obtenerDatos = () => Object.fromEntries(Object.entries(entradas).map(([campo, entrada]) => [campo, entrada.value]));
  const comprobar = () => {
    const resultado = validarVacanteEmpresa(obtenerDatos(), fechaAnterior);
    if (entradas.fecha_limite.validity.badInput) {
      resultado.errores = { ...resultado.errores, fecha_limite: 'Completa la fecha o deja este campo vacío.' };
      resultado.error = Object.values(resultado.errores)[0];
    }
    return resultado;
  };
  const mostrarErrores = (errores, enfocar = true) => {
    intentado = true;
    for (const [campo, entrada] of Object.entries(entradas)) {
      const id = `${entrada.id}-error`;
      let mensaje = formulario.querySelector(`#${id}`);
      if (!mensaje) {
        mensaje = document.createElement('p');
        mensaje.id = id;
        mensaje.className = 'error-campo-vacante';
        entrada.after(mensaje);
      }
      mensaje.textContent = errores[campo] || '';
      mensaje.hidden = !errores[campo];
      const descripciones = (entrada.getAttribute('aria-describedby') || '').split(' ').filter((valor) => valor && valor !== id);
      if (errores[campo]) descripciones.push(id);
      if (descripciones.length) entrada.setAttribute('aria-describedby', descripciones.join(' '));
      else entrada.removeAttribute('aria-describedby');
      if (errores[campo]) entrada.setAttribute('aria-invalid', 'true');
      else entrada.removeAttribute('aria-invalid');
    }
    resumen.replaceChildren();
    resumen.removeAttribute('style');
    resumen.className = 'aviso-contextual aviso-contextual-error';
    const pendientes = Object.keys(errores).filter((campo) => entradas[campo]);
    resumen.classList.toggle('oculto', !pendientes.length);
    if (!pendientes.length) return;
    const titulo = document.createElement('strong');
    titulo.textContent = `Revisa ${pendientes.length === 1 ? 'este campo' : `estos ${pendientes.length} campos`} para continuar`;
    const lista = document.createElement('ul');
    for (const campo of pendientes) {
      const elemento = document.createElement('li');
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'enlace-error-campo';
      const etiqueta = entradas[campo].labels?.[0]?.textContent.trim().replace(/\s*\*+\s*$/, '') || campo;
      boton.textContent = `${etiqueta}: ${errores[campo]}`;
      boton.addEventListener('click', () => { entradas[campo].focus(); entradas[campo].scrollIntoView({ block: 'center' }); });
      elemento.append(boton); lista.append(elemento);
    }
    resumen.append(titulo, lista);
    if (enfocar) {
      entradas[pendientes[0]].focus({ preventScroll: true });
      entradas[pendientes[0]].scrollIntoView({ block: 'center' });
    }
  };
  const validar = () => {
    const resultado = comprobar();
    mostrarErrores(resultado.errores || {});
    return resultado.error ? null : resultado.datos;
  };
  const revisar = () => { if (intentado) mostrarErrores(comprobar().errores || {}, false); };
  formulario.addEventListener('input', revisar);
  formulario.addEventListener('change', revisar);
  formulario.addEventListener('reset', () => { mostrarErrores({}, false); intentado = false; });
  return { validar, mostrarErrores };
}
