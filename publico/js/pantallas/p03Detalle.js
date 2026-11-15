import { escaparHtml } from '../utilidades/formato.js';

export function renderizarP03Detalle(contenedor, datos, idVacante, alNavegar, mostrarNotificacion) {
  const vacante = datos.vacantes.find((item) => item.id === idVacante) || datos.vacantes.find((item) => item.estado === 'Activa');
  if (!vacante) { contenedor.innerHTML = '<div class="tarjeta tarjeta-espaciado"><p>No hay una vacante disponible.</p></div>'; return; }
  const lista = (items) => items.length ? `<ul class="lista-detalle-empleo">${items.map((item) => `<li>${escaparHtml(item)}</li>`).join('')}</ul>` : '<p class="texto-secundario">Información no especificada.</p>';
  contenedor.innerHTML = `<div class="pila-vertical">
    <button class="enlace-accion-vino" id="volver-resultados" type="button">← Volver a resultados</button>
    <div class="detalle-empleo-publico">
      <main class="pila-vertical"><section class="tarjeta tarjeta-espaciado"><span class="etiqueta-cuadrada">${escaparHtml(vacante.modalidad || 'Presencial')}</span><h1 class="titulo-pantalla">${escaparHtml(vacante.titulo)}</h1><p class="subtitulo-pantalla">${escaparHtml(vacante.empresa)} · ${escaparHtml(vacante.fechaPublicacion)}</p><h2 class="grafico-titulo">Descripción del empleo</h2><p>${escaparHtml(vacante.descripcion || 'Descripción no disponible.')}</p><h2 class="grafico-titulo">Funciones</h2>${lista(vacante.funciones)}<h2 class="grafico-titulo">Requisitos</h2>${lista(vacante.requisitos)}<h2 class="grafico-titulo">Beneficios</h2>${lista(vacante.beneficios)}</section></main>
      <aside class="pila-vertical"><section class="tarjeta tarjeta-espaciado"><h2 class="grafico-titulo">Condiciones</h2><div class="fila-resumen"><span>Salario</span><strong>${vacante.salarioMin ? `$${vacante.salarioMin} - $${vacante.salarioMax}` : 'A convenir'}</strong></div><div class="fila-resumen"><span>Ubicación</span><strong>${escaparHtml(vacante.municipio || vacante.departamento || 'El Salvador')}</strong></div><div class="fila-resumen"><span>Plazas</span><strong>${vacante.plazas}</strong></div><button id="aplicar-empleo" class="boton-principal ancho-completo" type="button">Aplicar a esta vacante</button><p class="texto-secundario">Para completar la postulación debes iniciar sesión o registrarte.</p></section><section class="tarjeta tarjeta-espaciado"><h2 class="grafico-titulo">Empresa</h2><p><strong>${escaparHtml(vacante.empresa)}</strong></p><button class="boton-secundario ancho-completo" type="button" id="reportar-empleo">Reportar publicación</button></section></aside>
    </div></div>`;
  contenedor.querySelector('#volver-resultados').addEventListener('click', () => alNavegar('P02'));
  contenedor.querySelector('#aplicar-empleo').addEventListener('click', () => mostrarNotificacion('Debes iniciar sesión para postularte.'));
  contenedor.querySelector('#reportar-empleo').addEventListener('click', () => mostrarNotificacion('Gracias. Revisaremos esta publicación.'));
}
