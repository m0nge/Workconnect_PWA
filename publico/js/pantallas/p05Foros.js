import { renderizarGestionForos } from './gestionForos.js';
import { reportarContenido } from '../utilidades/reportes.js';
import { escaparHtml } from '../utilidades/formato.js';
import { abrirModal } from '../componentes/modal.js';

let temas = [];

function renderizarAvatarForo(autor, fotoUrl) {
  const nombreSeguro = escaparHtml(autor || 'Usuario');
  const iniciales = escaparHtml((autor || 'U').slice(0, 2).toUpperCase());
  const urlLimpia = typeof fotoUrl === 'string' ? fotoUrl.trim() : '';
  if (urlLimpia) {
    return `<img class="foro-avatar" src="${escaparHtml(urlLimpia)}" alt="${nombreSeguro}" onerror="this.outerHTML='<span class=\\'foro-avatar\\'>${iniciales}</span>'" />`;
  }
  return `<span class="foro-avatar" aria-hidden="true">${iniciales}</span>`;
}

export async function renderizarP05Foros(contenedor, alNavegar, rolActual = 'visitante', mostrarNotificacion = () => {}, { integrado = false } = {}) {
  if (rolActual === 'administrador' && !integrado) return renderizarGestionForos(contenedor, alNavegar);
  try {
    const r = await fetch('/api/foros/temas');
    temas = r.ok ? await r.json() : [];
  } catch {
    temas = [];
  }

  const puedeCrearTema = ['candidato', 'empresa', 'administrador'].includes(rolActual);
  const puedeResponder = ['candidato', 'empresa', 'administrador'].includes(rolActual);
  const categorias = ['Todas las categorías', ...new Set(temas.map((tema) => tema.categoria))];

  contenedor.innerHTML = `
    <div class="pila-vertical foros-pantalla ${integrado ? 'foros-integrados' : ''}">
      <div class="cabecera-pantalla">
        <${integrado ? 'h2' : 'h1'} class="titulo-pantalla">Foros</${integrado ? 'h2' : 'h1'}>
        <p class="subtitulo-pantalla">
          Participa en conversaciones y comparte experiencias laborales.
        </p>
      </div>
      <div class="foros-disposicion">
        <aside class="foros-categorias tarjeta">
          <strong>Categorías</strong>
          <nav id="categorias-foros" aria-label="Categorías de foros">
            ${categorias.map((categoria, indice) => `<button type="button" class="${indice === 0 ? 'activo' : ''}" data-categoria-foro="${escaparHtml(categoria)}">${escaparHtml(categoria)} <small>${indice === 0 ? temas.length : temas.filter((tema) => tema.categoria === categoria).length}</small></button>`).join('')}
          </nav>
        </aside>
        <section class="foros-conversaciones">
          <div class="seccion-lista-cabecera">
            <h2 class="grafico-titulo">Conversaciones</h2>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              ${puedeCrearTema ? '<button class="boton-principal" id="crear-tema" type="button">Crear tema</button>' : ''}
            </div>
          </div>
          <div id="lista-foros" class="lista-tarjetas-publicas"></div>
        </section>
      </div>
    </div>
  `;

  contenedor.querySelector('#crear-tema')?.addEventListener('click', () => alNavegar('P28'));

  const pintarTemas = (categoriaSeleccionada = '') => {
    const lista = contenedor.querySelector('#lista-foros');
    const temasFiltrados = temas.filter((tema) => !categoriaSeleccionada || tema.categoria === categoriaSeleccionada);

    if (temasFiltrados.length === 0) {
      lista.innerHTML = `
        <div class="tarjeta tarjeta-espaciado" style="text-align:center; color:var(--color-texto-atenuado); padding:2.5rem 1rem;">
          <p style="margin:0 0 0.5rem; font-weight:600; color:var(--color-texto-secundario);">No hay temas en esta categoría todavía.</p>
          ${puedeCrearTema ? '<button class="boton-principal" id="crear-primer-tema" type="button">Sé el primero en abrir un tema</button>' : ''}
        </div>
      `;
      lista.querySelector('#crear-primer-tema')?.addEventListener('click', () => alNavegar('P28'));
      return;
    }

    lista.innerHTML = temasFiltrados.map((tema) => `
      <article class="tarjeta tarjeta-foro-publico">
        <div class="foro-tema-identidad">
          ${renderizarAvatarForo(tema.autor, tema.fotoUrl)}
          <div>
            <span class="etiqueta-cuadrada">${escaparHtml(tema.categoria)}</span>
            <${integrado ? 'h3' : 'h2'} class="titulo-tarjeta">${escaparHtml(tema.titulo)}</${integrado ? 'h3' : 'h2'}>
            <p class="texto-secundario" data-conteo-id="${tema.id}">Por ${escaparHtml(tema.autor)} · ${tema.respuestas} respuestas</p>
          </div>
        </div>
        <button class="boton-secundario" type="button" data-tema-id="${escaparHtml(tema.id)}">Ver discusión</button>
      </article>
    `).join('');

    lista.querySelectorAll('[data-tema-id]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const temaId = boton.dataset.temaId;
        const tema = temas.find((elemento) => elemento.id === temaId);
        if (!tema) return;

        abrirModal({
          titulo: tema.titulo,
          subtitulo: `${tema.autor} · ${tema.categoria}`,
          contenidoHtml: `
            <div class="caja-tema-detalle" style="margin-bottom:1.25rem; padding:0.875rem 1rem; background:var(--color-superficie-secundaria); border-radius:6px; border:1px solid var(--color-borde);">
              <div style="display:flex; align-elementos:center; gap:0.75rem; margin-bottom:0.75rem;">
                ${renderizarAvatarForo(tema.autor, tema.fotoUrl)}
                <div>
                  <strong style="color:var(--color-texto); font-size:0.875rem; display:block;">${escaparHtml(tema.autor)}</strong>
                  <span style="font-size:0.75rem; color:var(--color-texto-atenuado);">${escaparHtml(tema.categoria)}</span>
                </div>
              </div>
              <p style="margin:0; font-size:0.875rem; color:var(--color-texto); line-height:1.6; white-space:pre-wrap;">${escaparHtml(tema.descripcion)}</p>
            </div>

            <h3 class="foro-respuestas-titulo" id="contador-respuestas">${tema.respuestas} respuestas</h3>
            <div class="foro-respuestas" id="contenedor-respuestas-foro">
              <p class="texto-secundario" style="padding:1rem 0;">Cargando respuestas...</p>
            </div>

            ${
              puedeResponder
                ? `
                  <form id="formulario-respuesta-foro" class="foro-formulario-respuesta" novalidate>
                    <div id="alerta-error-respuesta" class="alerta-error-formulario oculto" style="margin-bottom:0.75rem;"></div>
                    <label class="campo-formulario">
                      <span>Tu respuesta</span>
                      <textarea id="campo-texto-respuesta" name="respuesta" rows="4" minlength="5" maxlength="1000" placeholder="Escribe tu recomendación o respuesta (mínimo 5 caracteres)..." required></textarea>
                    </label>
                    <div class="acciones-formulario">
                      <button class="boton-principal" id="boton-enviar-respuesta" type="submit">Responder</button>
                      <button class="boton-secundario" type="button" id="reportar-tema">Reportar tema</button>
                    </div>
                  </form>
                `
                : `
                  <div style="margin-top:1.25rem; padding:0.875rem 1rem; background:var(--color-superficie-secundaria); border-radius:6px; border:1px solid var(--color-borde);">
                    <p class="texto-secundario" style="margin:0;">Inicia sesión con tu cuenta para responder en este foro.</p>
                  </div>
                `
            }
          `,
          alMontar(cuerpo, cerrar) {
            const contenedorRespuestas = cuerpo.querySelector('#contenedor-respuestas-foro');
            const contadorElemento = cuerpo.querySelector('#contador-respuestas');
            const alertaError = cuerpo.querySelector('#alerta-error-respuesta');
            const formulario = cuerpo.querySelector('#formulario-respuesta-foro');
            const botonReportar = cuerpo.querySelector('#reportar-tema');

            const actualizarConteoEnTarjeta = (nuevoTotal) => {
              tema.respuestas = nuevoTotal;
              const elementoConteo = contenedor.querySelector(`[data-conteo-id="${tema.id}"]`);
              if (elementoConteo) {
                elementoConteo.textContent = `Por ${tema.autor} · ${nuevoTotal} respuestas`;
              }
            };

            const cargarRespuestas = async () => {
              try {
                const respuestaHttp = await fetch(`/api/foros/temas/${tema.id}/respuestas`);
                if (!respuestaHttp.ok) throw new Error('No se pudieron cargar las respuestas.');
                const lista = await respuestaHttp.json();
                actualizarConteoEnTarjeta(lista.length);
                if (contadorElemento) {
                  contadorElemento.textContent = `${lista.length} ${lista.length === 1 ? 'respuesta' : 'respuestas'}`;
                }
                if (lista.length === 0) {
                  contenedorRespuestas.innerHTML = `
                    <p class="texto-secundario" style="padding:1rem 0; font-style:italic;">
                      Aún no hay respuestas en esta conversación. ¡Sé el primero en responder!
                    </p>
                  `;
                  return;
                }
                contenedorRespuestas.innerHTML = lista.map((r) => `
                  <article class="foro-respuesta">
                    ${renderizarAvatarForo(r.autor, r.fotoUrl)}
                    <div style="flex:1;">
                      <div style="display:flex; justify-content:space-between; align-elementos:center;">
                        <strong>${escaparHtml(r.autor)}</strong>
                        ${puedeResponder ? `<button class="boton" type="button" data-reportar-respuesta="${escaparHtml(r.id)}">Reportar</button>` : ''}
                      </div>
                      <p style="white-space:pre-wrap;">${escaparHtml(r.contenido)}</p>
                    </div>
                  </article>
                `).join('');
                contenedorRespuestas.querySelectorAll('[data-reportar-respuesta]').forEach((boton) => {
                  boton.addEventListener('click', () => reportarContenido('foros_respuestas', boton.dataset.reportarRespuesta, mostrarNotificacion));
                });
              } catch (errorCapturado) {
                if (contenedorRespuestas) {
                  contenedorRespuestas.innerHTML = `
                    <p class="texto-secundario" style="padding:1rem 0; color:var(--color-rosa);">
                      No se pudieron cargar las respuestas en este momento.
                    </p>
                  `;
                }
              }
            };

            cargarRespuestas();

            if (formulario) {
              formulario.addEventListener('submit', async (evento) => {
                evento.preventDefault();
                const campoTexto = formulario.querySelector('#campo-texto-respuesta');
                const texto = campoTexto ? campoTexto.value.trim() : '';
                if (texto.length < 5 || texto.length > 1000) {
                  if (alertaError) {
                    alertaError.textContent = 'La respuesta debe tener entre 5 y 1000 caracteres.';
                    alertaError.classList.remove('oculto');
                  }
                  campoTexto?.focus();
                  return;
                }
                if (alertaError) alertaError.classList.add('oculto');

                const botonEnviar = formulario.querySelector('#boton-enviar-respuesta');
                if (botonEnviar) {
                  botonEnviar.disabled = true;
                  botonEnviar.textContent = 'Guardando...';
                }

                try {
                  const respuestaHttp = await fetch(`/api/foros/temas/${tema.id}/respuestas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contenido: texto })
                  });
                  const resultado = await respuestaHttp.json().catch(() => ({}));
                  if (!respuestaHttp.ok) {
                    throw new Error(resultado.error || 'No se pudo guardar la respuesta.');
                  }
                  campoTexto.value = '';
                  mostrarNotificacion('¡Tu respuesta se guardó correctamente!');
                  await cargarRespuestas();
                } catch (error) {
                  if (alertaError) {
                    alertaError.textContent = error.message || 'Error al guardar la respuesta.';
                    alertaError.classList.remove('oculto');
                  }
                } finally {
                  if (botonEnviar) {
                    botonEnviar.disabled = false;
                    botonEnviar.textContent = 'Responder';
                  }
                }
              });
            }

            if (botonReportar) {
              botonReportar.addEventListener('click', async () => {
                botonReportar.disabled = true;
                try {
                  const respuestaHttp = await fetch(`/api/foros/temas/${tema.id}/reportar`, { method: 'POST' });
                  const resultado = await respuestaHttp.json().catch(() => ({}));
                  if (!respuestaHttp.ok) throw new Error(resultado.error || 'No se pudo enviar el reporte.');
                  mostrarNotificacion('Tema enviado a moderación.');
                  botonReportar.textContent = 'Reportado';
                } catch (error) {
                  mostrarNotificacion(error.message || 'Error al enviar el reporte.');
                  botonReportar.disabled = false;
                }
              });
            }
          }
        });
      });
    });
  };

  contenedor.querySelectorAll('[data-categoria-foro]').forEach((boton) => {
    boton.addEventListener('click', () => {
      contenedor.querySelectorAll('[data-categoria-foro]').forEach((elemento) => elemento.classList.toggle('activo', elemento === boton));
      pintarTemas(boton.dataset.categoriaForo === 'Todas las categorías' ? '' : boton.dataset.categoriaForo);
    });
  });

  pintarTemas();
}
