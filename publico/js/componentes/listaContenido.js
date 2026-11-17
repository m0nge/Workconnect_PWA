import { escaparHtml } from '../utilidades/formato.js';
import { abrirModal } from './modal.js';
import { solicitarApi } from '../utilidades/solicitudes.js';
import { confirmarAccion } from './dialogos.js';

export function solicitarContenido(ruta, metodo = 'GET', datos) {
  return solicitarApi(ruta, {
    method: metodo,
    ...(datos === undefined ? {} : { body: JSON.stringify(datos) })
  });
}

export function filtrarContenido(elementosLista, { busqueda = '', categoria = '', estado = '' }) {
  const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return elementosLista.filter((elementoLista) => (!busqueda || normalizar(`${elementoLista.titulo} ${elementoLista.autor || ''}`).includes(normalizar(busqueda))) &&
    (!categoria || elementoLista.categoria === categoria) && (!estado || elementoLista.estado === estado));
}

export function editarContenido(elementoLista, campos, alGuardar) {
  abrirModal({
    titulo: 'Editar contenido',
    contenidoHtml: `<form id="editar-contenido" class="formulario-publico pila-compacta">
      ${campos.map((campo) => campo.casillas ? `<fieldset class="audiencia-edicion"><legend>${escaparHtml(campo.etiqueta)}</legend>${campo.casillas.map((opcion) => `<label class="opcion-linea"><input type="checkbox" name="${campo.clave}" value="${escaparHtml(opcion)}" ${(elementoLista[campo.clave] || []).includes(opcion) ? 'checked' : ''} />${escaparHtml(opcion)}</label>`).join('')}</fieldset>` : `<label class="campo-formulario"><span>${escaparHtml(campo.etiqueta)}</span>
        ${campo.opciones ? `<select name="${campo.clave}">${campo.opciones.map((opcion) => `<option value="${escaparHtml(opcion)}" ${elementoLista[campo.clave] === opcion ? 'selected' : ''}>${escaparHtml(opcion)}</option>`).join('')}</select>` :
          campo.multilinea ? `<textarea name="${campo.clave}" rows="${campo.clave === 'contenido' ? 10 : 4}" ${campo.min ? `minlength="${campo.min}" required` : ''} maxlength="${campo.max || 10000}">${escaparHtml(elementoLista[campo.clave] || '')}</textarea>` :
          `<input name="${campo.clave}" type="${campo.numero ? 'number' : 'text'}" value="${escaparHtml(elementoLista[campo.clave] ?? '')}" ${campo.min ? `${campo.numero ? 'min' : 'minlength'}="${campo.min}" required` : ''} ${campo.max ? `${campo.numero ? 'max' : 'maxlength'}="${campo.max}"` : ''} />`}
      </label>`).join('')}
      <p id="error-editar-contenido" class="alerta-error-formulario oculto" role="alert"></p>
      <div class="grupo-acciones"><button type="button" id="cancelar-edicion" class="boton">Cancelar</button><button type="submit" class="boton boton-primario">Guardar cambios</button></div>
    </form>`,
    alMontar(cuerpo, cerrar) {
      cuerpo.querySelector('#cancelar-edicion').addEventListener('click', cerrar);
      cuerpo.querySelector('form').addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const boton = evento.target.querySelector('[type="submit"]');
        boton.disabled = true;
        try {
          const datos = Object.fromEntries(new FormData(evento.target));
          campos.filter((campo) => campo.casillas).forEach((campo) => { datos[campo.clave] = new FormData(evento.target).getAll(campo.clave); });
          if (campos.some((campo) => campo.casillas && !datos[campo.clave].length)) throw new Error('Selecciona al menos un grupo en Visible para. Usa Borrador para ocultar el recurso a todos.');
          campos.filter((c) => c.numero).forEach((c) => { datos[c.clave] = Number(datos[c.clave]); });
          await alGuardar(datos);
          cerrar();
        } catch (error) {
          const alerta = cuerpo.querySelector('#error-editar-contenido');
          alerta.textContent = error.message;
          alerta.classList.remove('oculto');
        } finally { boton.disabled = false; }
      });
    }
  });
}

export function renderizarListaContenido(contenedor, { elementos: elementosLista, camposEdicion, alGuardar, alAlternar, alEliminar, alVer, estadosDisponibles = ['Activo', 'Inactivo'] }) {
  let datos = [...elementosLista];
  const categorias = [...new Set(datos.map((i) => i.categoria).filter(Boolean))];
  const estados = [...new Set(datos.map((i) => i.estado).filter(Boolean))];
  contenedor.innerHTML = `<div class="tarjeta tarjeta-espaciado pila-compacta">
    <div class="filtros-gestion-contenido">
      <label class="campo-formulario"><span>Buscar</span><input data-filtro="busqueda" type="search" placeholder="Buscar por título o autor" /></label>
      <label class="campo-formulario"><span>Categoría</span><select data-filtro="categoria"><option value="">Todas las categorías</option>${categorias.map((c) => `<option>${escaparHtml(c)}</option>`).join('')}</select></label>
      <label class="campo-formulario"><span>Estado</span><select data-filtro="estado"><option value="">Todos los estados</option>${[...new Set([...estados, ...estadosDisponibles])].map((e) => `<option>${escaparHtml(e)}</option>`).join('')}</select></label>
    </div>
    <p data-conteo class="texto-secundario" aria-live="polite"></p>
    <p data-error class="alerta-error-formulario oculto" role="alert"></p>
    <div class="desplazamiento-tabla"><table class="tabla-datos tabla-gestion-contenido">
      <thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Acciones</th></tr></thead><tbody></tbody>
    </table></div>
  </div>`;
  const pintar = () => {
    const filtros = Object.fromEntries([...contenedor.querySelectorAll('[data-filtro]')].map((c) => [c.dataset.filtro, c.value]));
    const visibles = filtrarContenido(datos, filtros);
    contenedor.querySelector('[data-conteo]').textContent = `${visibles.length} de ${datos.length}`;
    const cuerpoFilas = contenedor.querySelector('tbody');
    cuerpoFilas.innerHTML = visibles.length ? visibles.map((elementoLista) => `<tr ${alVer ? `data-ver-contenido="${escaparHtml(elementoLista.id)}" class="fila-con-detalle"` : ''}>
      <td>${alVer ? `<button type="button" class="titulo-con-detalle" aria-label="Ver recurso: ${escaparHtml(elementoLista.titulo)}">${escaparHtml(elementoLista.titulo)}</button>` : `<strong>${escaparHtml(elementoLista.titulo)}</strong>`}${elementoLista.autor ? `<p class="texto-secundario">${escaparHtml(elementoLista.autor)}</p>` : ''}</td>
      <td>${escaparHtml(elementoLista.categoria)}</td><td><span class="etiqueta-cuadrada">${escaparHtml(elementoLista.estado)}</span></td>
      <td><div class="grupo-acciones"><button type="button" class="boton" data-editar="${escaparHtml(elementoLista.id)}">Editar</button>
      <button type="button" class="boton" data-alternar="${escaparHtml(elementoLista.id)}">${elementoLista.activo ? 'Desactivar' : 'Activar'}</button>
      <button type="button" class="boton boton-peligro" data-eliminar="${escaparHtml(elementoLista.id)}">Eliminar</button></div></td></tr>`).join('') : '<tr><td colspan="4" class="texto-centro">No hay resultados con estos filtros.</td></tr>';
    cuerpoFilas.querySelectorAll('[data-ver-contenido]').forEach((fila) => fila.addEventListener('click', (evento) => {
      if (evento.target.closest('button:not(.titulo-con-detalle), a, input, select, textarea')) return;
      const elemento = datos.find((dato) => String(dato.id) === fila.dataset.verContenido);
      if (elemento) alVer(elemento);
    }));
    cuerpoFilas.querySelectorAll('[data-editar], [data-alternar], [data-eliminar]').forEach((boton) => boton.addEventListener('click', async () => {
      const accion = Object.keys(boton.dataset)[0];
      const elementoLista = datos.find((i) => i.id === boton.dataset[accion]);
      if (!elementoLista) return;
      const guardar = async (cambios) => {
        const actualizado = await alGuardar(elementoLista, cambios);
        datos = datos.map((i) => i.id === elementoLista.id ? actualizado : i);
        pintar();
      };
      if (accion === 'editar') return editarContenido(elementoLista, camposEdicion, guardar);
      if (accion === 'eliminar' && !await confirmarAccion(`¿Eliminar "${elementoLista.titulo}"? Esta acción no se puede deshacer.`)) return;
      boton.disabled = true;
      try {
        if (accion === 'eliminar') { await alEliminar(elementoLista); datos = datos.filter((i) => i.id !== elementoLista.id); }
        else { const actualizado = await alAlternar(elementoLista); datos = datos.map((i) => i.id === elementoLista.id ? actualizado : i); }
        pintar();
      } catch (error) {
        const alerta = contenedor.querySelector('[data-error]');
        alerta.textContent = error.message; alerta.classList.remove('oculto');
      } finally { boton.disabled = false; }
    }));
  };
  contenedor.querySelectorAll('[data-filtro]').forEach((campo) => campo.addEventListener(campo.type === 'search' ? 'input' : 'change', pintar));
  pintar();
}
