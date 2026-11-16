import { escaparHtml } from './formato.js';
import { solicitarApi } from './solicitudes.js';

export function enlazarVistaPreviaVacante(formulario, panel) {
  if (!panel) return;
  let empresa = {};
  const moneda = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const valor = (nombre) => formulario.querySelector(`#vacante-${nombre}`)?.value.trim() || '';
  const lista = (nombre, titulo) => {
    const elementos = valor(nombre).split(/\r?\n/).map((linea) => linea.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
    return elementos.length ? `<section class="detalle-empleo-bloque"><h3 class="detalle-empleo-titulo">${titulo}</h3><ul class="lista-detalle-empleo">${elementos.map((elemento) => `<li>${escaparHtml(elemento)}</li>`).join('')}</ul></section>` : '';
  };
  const actualizar = () => {
    const nombre = empresa.nombre_comercial || 'Tu empresa';
    const ubicacion = [valor('municipio'), valor('departamento')].filter(Boolean).join(', ');
    const etiquetas = [valor('modalidad'), valor('contrato'), `${valor('plazas') || '1'} plaza(s)`];
    const minimo = valor('salario-min'); const maximo = valor('salario-max');
    const salario = minimo !== '' && maximo !== '' ? `${moneda.format(Number(minimo))} – ${moneda.format(Number(maximo))}` : 'Salario por definir';
    const fecha = valor('fecha-limite');
    const fechaLegible = fecha ? new Intl.DateTimeFormat('es-SV', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${fecha}T12:00:00Z`)) : '';
    panel.innerHTML = `
      <div class="vacante-previa-rotulo"><h2>Vista previa</h2><span class="etiqueta-cuadrada">Sin publicar</span></div>
      <p class="texto-secundario">Así verán los candidatos tu oferta al publicarla.</p>
      <article class="vacante-previa-oferta">
        <header class="detalle-empleo-cabecera">
          <div class="detalle-empleo-identidad">
            ${empresa.logo_url ? `<img class="imagen-empresa" src="${escaparHtml(empresa.logo_url)}" alt="Logo de ${escaparHtml(nombre)}" />` : `<div class="avatar-cuadrado">${escaparHtml(nombre.slice(0, 2).toUpperCase())}</div>`}
            <div><span class="detalle-empleo-sector">${escaparHtml(valor('sector') || 'Sector de tu empresa')}</span>
              <h3 class="titulo-pantalla">${escaparHtml(valor('titulo') || 'Título del puesto')}</h3>
              <p class="subtitulo-pantalla">${escaparHtml(nombre)} · ${escaparHtml(ubicacion || 'Ubicación por definir')}</p>
            </div>
          </div>
          <div class="detalle-empleo-etiquetas">${etiquetas.filter(Boolean).map((etiqueta) => `<span class="etiqueta-cuadrada">${escaparHtml(etiqueta)}</span>`).join('')}</div>
        </header>
        <div class="vacante-previa-salario"><strong>${salario}</strong><span>Salario mensual</span>${fechaLegible ? `<span>Postúlate hasta el ${fechaLegible}</span>` : ''}</div>
        <section class="detalle-empleo-contenido"><h3 class="detalle-empleo-titulo">Descripción del puesto</h3><p class="vacante-previa-descripcion">${escaparHtml(valor('descripcion') || 'La descripción de la oportunidad aparecerá aquí mientras la escribís.')}</p>
          ${lista('funciones', 'Funciones y responsabilidades')}${lista('requisitos', 'Requisitos')}${lista('beneficios', 'Beneficios')}
        </section>
      </article>`;
  };
  formulario.addEventListener('input', actualizar);
  formulario.addEventListener('change', actualizar);
  formulario.addEventListener('reset', () => queueMicrotask(actualizar));
  actualizar();
  solicitarApi('/api/empresa/perfil').then((datos) => { empresa = datos.empresa || {}; actualizar(); }).catch(() => {});
}
