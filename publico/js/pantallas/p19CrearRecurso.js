import { escaparHtml } from '../utilidades/formato.js';

const estadoRecurso = {
  subpestana: 'Crear',
  titulo: '',
  categoria: 'Artículo',
  nivelLectura: 'Básico',
  tiempoLecturaMin: 5,
  resumen: '',
  contenido: '',
  etiquetas: '',
  estadoPublicacion: 'Publicado',
  audiencia: ['Visitantes', 'Candidatos registrados'],
  nombreArchivoPortada: '',
  nombreArchivoAdjunto: ''
};

export function renderizarP19CrearRecurso(contenedor, recursos, acciones) {
  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <span class="codigo-pantalla">P19 ADMINISTRACIÓN / RECURSOS LABORALES</span>
        <h1 class="titulo-pantalla">Crear recurso laboral</h1>
        <p class="subtitulo-pantalla">
          Formulario para redactar, categorizar y publicar artículos, consejos y tutoriales en el portal público.
        </p>
      </div>

      <div class="barra-pestanas" id="pestanas-recursos">
        <button type="button" class="boton-pestana ${estadoRecurso.subpestana === 'Publicados' ? 'activo' : ''}" data-subpestana="Publicados">
          Publicados (${recursos.length})
        </button>
        <button type="button" class="boton-pestana ${estadoRecurso.subpestana === 'MisRecursos' ? 'activo' : ''}" data-subpestana="MisRecursos">
          Mis recursos
        </button>
        <button type="button" class="boton-pestana ${estadoRecurso.subpestana === 'Crear' ? 'activo' : ''}" data-subpestana="Crear">
          <span>Crear recurso</span>
          <span class="punto-pestana vino"></span>
        </button>
      </div>

      <div id="contenido-subpestana-recurso"></div>
    </div>
  `;

  const zonaSubpestana = contenedor.querySelector('#contenido-subpestana-recurso');

  const pintarSubpestana = () => {
    if (estadoRecurso.subpestana === 'Publicados') {
      const tarjetasHtml = recursos
        .map(
          (rec) => `
            <div class="tarjeta" style="padding:1rem;">
              <div style="display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:0.25rem;">
                <span style="font-weight:700; color:#831843; text-transform:uppercase;">${escaparHtml(rec.categoria)}</span>
                <span>Lectura de ${rec.tiempoLecturaMin} min</span>
              </div>
              <h3 style="margin:0; font-size:0.875rem; font-weight:700; color:#0f172a;">${escaparHtml(rec.titulo)}</h3>
              <p style="margin:0.35rem 0 0; font-size:0.75rem; color:#475569; line-height:1.45;">
                ${escaparHtml(rec.resumen)}
              </p>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.75rem; padding-top:0.5rem; border-top:1px solid #f1f5f9; font-size:11px; color:#64748b;">
                <span>${escaparHtml(rec.fechaCreacion)}</span>
                <span class="etiqueta-cuadrada" style="color:#047857; background:#ecfdf5; border-color:#a7f3d0;">
                  ${escaparHtml(rec.estadoPublicacion)}
                </span>
              </div>
            </div>
          `
        )
        .join('');

      zonaSubpestana.innerHTML = `
        <div class="tarjeta tarjeta-espaciado pila-compacta">
          <div class="seccion-lista-cabecera" style="margin-bottom:0;">
            <h2 class="grafico-titulo">Catálogo de recursos activos</h2>
            <button type="button" id="ir-a-crear-recurso" class="enlace-accion-vino" style="text-decoration:none; font-weight:700;">
              + Redactar nuevo recurso
            </button>
          </div>
          <div class="cuadricula-publicados">
            ${tarjetasHtml}
          </div>
        </div>
      `;

      zonaSubpestana
        .querySelector('#ir-a-crear-recurso')
        .addEventListener('click', () => {
          estadoRecurso.subpestana = 'Crear';
          renderizarP19CrearRecurso(contenedor, recursos, acciones);
        });
      return;
    }

    if (estadoRecurso.subpestana === 'MisRecursos') {
      const filasHtml = recursos
        .map(
          (r) => `
            <tr>
              <td style="font-weight:600; color:#1e293b;">${escaparHtml(r.titulo)}</td>
              <td style="color:#475569;">${escaparHtml(r.categoria)}</td>
              <td style="color:#475569;">${escaparHtml(r.nivelLectura)}</td>
              <td>
                <span class="etiqueta-cuadrada" style="background:#f1f5f9; color:#334155; border-color:#e2e8f0; font-size:10px;">
                  ${escaparHtml(r.estadoPublicacion)}
                </span>
              </td>
            </tr>
          `
        )
        .join('');

      zonaSubpestana.innerHTML = `
        <div class="tarjeta tarjeta-espaciado pila-compacta">
          <h2 class="grafico-titulo">Historial y borradores editoriales</h2>
          <div class="desplazamiento-tabla">
            <table class="tabla-datos">
              <thead>
                <tr>
                  <th>TÍTULO</th>
                  <th>CATEGORÍA</th>
                  <th>NIVEL</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                ${filasHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
      return;
    }

    // Subpestaña Crear recurso
    zonaSubpestana.innerHTML = `
      <div class="cuadricula-recurso">
        <div class="tarjeta tarjeta-espaciado">
          <form id="formulario-crear-recurso" class="pila-compacta" novalidate>
            <div id="error-crear-recurso" class="alerta-error-formulario oculto"></div>

            <div>
              <div class="etiqueta-campo-fila">
                <label class="etiqueta-campo" for="recurso-titulo">Título del recurso *</label>
                <span id="contador-titulo" class="contador-caracteres">
                  ${estadoRecurso.titulo.length} caracteres (mínimo 8)
                </span>
              </div>
              <input
                id="recurso-titulo"
                type="text"
                class="campo-texto"
                placeholder="Ej. Cinco hábitos para buscar empleo con constancia"
                value="${escaparHtml(estadoRecurso.titulo)}"
                required
              />
            </div>

            <div class="cuadricula-campos-3">
              <div>
                <label class="etiqueta-campo" for="recurso-categoria">Categoría *</label>
                <select id="recurso-categoria" class="campo-select">
                  <option value="Artículo">Artículo</option>
                  <option value="Consejo">Consejo</option>
                  <option value="Tutorial">Tutorial</option>
                  <option value="Noticia">Noticia</option>
                </select>
              </div>
              <div>
                <label class="etiqueta-campo" for="recurso-nivel">Nivel de lectura</label>
                <select id="recurso-nivel" class="campo-select">
                  <option value="Básico">Básico</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                </select>
              </div>
              <div>
                <label class="etiqueta-campo" for="recurso-tiempo">Tiempo de lectura (min)</label>
                <input
                  id="recurso-tiempo"
                  type="number"
                  min="1"
                  max="60"
                  class="campo-texto"
                  value="${estadoRecurso.tiempoLecturaMin}"
                />
              </div>
            </div>

            <div>
              <div class="etiqueta-campo-fila">
                <label class="etiqueta-campo" for="recurso-resumen">Resumen del recurso (2-3 líneas) *</label>
                <span id="contador-resumen" class="contador-caracteres">
                  ${estadoRecurso.resumen.length} caracteres
                </span>
              </div>
              <textarea
                id="recurso-resumen"
                rows="2"
                class="campo-area"
                placeholder="Escribe una breve síntesis que motive al candidato a abrir el artículo..."
                required
              >${escaparHtml(estadoRecurso.resumen)}</textarea>
            </div>

            <div>
              <div class="etiqueta-campo-fila">
                <label class="etiqueta-campo" for="recurso-contenido">Cuerpo del recurso (Contenido) *</label>
                <span id="contador-contenido" class="contador-caracteres">
                  ${estadoRecurso.contenido.length} caracteres
                </span>
              </div>
              <textarea
                id="recurso-contenido"
                rows="5"
                class="campo-area"
                placeholder="Redacta el contenido informativo completo del recurso, pasos prácticos o recomendaciones..."
                required
              >${escaparHtml(estadoRecurso.contenido)}</textarea>
            </div>

            <div class="cuadricula-campos-2" style="padding-top:0.25rem;">
              <label class="caja-archivo-simulado" style="cursor:pointer; display:block;">
                <p style="margin:0; font-size:0.75rem; font-weight:600; color:#334155;">Imagen de portada</p>
                <p style="margin:0.15rem 0 0; font-size:10px; color:#64748b;">PNG, JPG hasta 2 MB (1200x630)</p>
                <input id="recurso-archivo-portada" type="file" accept="image/*" class="oculto" />
                <span id="etiqueta-archivo-portada" class="etiqueta-archivo">
                  🖼️ ${escaparHtml(estadoRecurso.nombreArchivoPortada || 'Seleccionar portada')}
                </span>
              </label>

              <label class="caja-archivo-simulado" style="cursor:pointer; display:block;">
                <p style="margin:0; font-size:0.75rem; font-weight:600; color:#334155;">Archivos adjuntos</p>
                <p style="margin:0.15rem 0 0; font-size:10px; color:#64748b;">PDF, DOCX hasta 5 MB (plantillas)</p>
                <input id="recurso-archivo-adjunto" type="file" accept=".pdf,.doc,.docx" class="oculto" />
                <span id="etiqueta-archivo-adjunto" class="etiqueta-archivo">
                  📎 ${escaparHtml(estadoRecurso.nombreArchivoAdjunto || 'Adjuntar archivo')}
                </span>
              </label>
            </div>

            <div>
              <label class="etiqueta-campo" for="recurso-etiquetas">Etiquetas (separadas por comas)</label>
              <input
                id="recurso-etiquetas"
                type="text"
                class="campo-texto"
                placeholder="Entrevistas, Salarios, CV, Desarrollo profesional"
                value="${escaparHtml(estadoRecurso.etiquetas)}"
              />
            </div>

            <div>
              <span class="etiqueta-campo">Estado de publicación *</span>
              <div class="grupo-opciones-linea">
                <label class="opcion-linea">
                  <input type="radio" name="estadoPublicacion" value="Borrador" ${estadoRecurso.estadoPublicacion === 'Borrador' ? 'checked' : ''} />
                  <span>Borrador</span>
                </label>
                <label class="opcion-linea">
                  <input type="radio" name="estadoPublicacion" value="Enviar a revisión" ${estadoRecurso.estadoPublicacion === 'Enviar a revisión' ? 'checked' : ''} />
                  <span>Enviar a revisión</span>
                </label>
                <label class="opcion-linea" style="font-weight:700; color:#0f172a;">
                  <input type="radio" name="estadoPublicacion" value="Publicado" ${estadoRecurso.estadoPublicacion === 'Publicado' ? 'checked' : ''} />
                  <span>Publicar ahora</span>
                </label>
              </div>
            </div>

            <div>
              <span class="etiqueta-campo">Visible para:</span>
              <div class="grupo-opciones-linea">
                <label class="opcion-linea">
                  <input type="checkbox" data-audiencia="Visitantes" ${estadoRecurso.audiencia.includes('Visitantes') ? 'checked' : ''} />
                  <span>Visitantes</span>
                </label>
                <label class="opcion-linea">
                  <input type="checkbox" data-audiencia="Candidatos registrados" ${estadoRecurso.audiencia.includes('Candidatos registrados') ? 'checked' : ''} />
                  <span>Candidatos registrados</span>
                </label>
                <label class="opcion-linea">
                  <input type="checkbox" data-audiencia="Empresas" ${estadoRecurso.audiencia.includes('Empresas') ? 'checked' : ''} />
                  <span>Empresas</span>
                </label>
              </div>
            </div>

            <div class="pie-modal derecha">
              <button type="button" id="limpiar-recurso" class="boton boton-mediano">Limpiar</button>
              <button type="submit" class="boton boton-mediano boton-primario">Guardar recurso</button>
            </div>
          </form>
        </div>

        <div class="pila-compacta">
          <div class="tarjeta" style="padding:1rem;">
            <span style="font-size:10px; text-transform:uppercase; font-weight:700; color:#64748b; letter-spacing:0.05em; display:block; margin-bottom:0.5rem;">
              Vista previa en el catálogo
            </span>

            <div class="tarjeta-vista-previa">
              <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:0.25rem;">
                <span id="previa-categoria" style="font-weight:700; color:#831843; text-transform:uppercase; font-size:10px;">
                  ${escaparHtml(estadoRecurso.categoria)}
                </span>
                <span id="previa-tiempo" class="texto-mono" style="font-size:10px;">
                  Lectura de ${estadoRecurso.tiempoLecturaMin} min
                </span>
              </div>

              <h3 id="previa-titulo" style="margin:0; font-weight:700; color:#0f172a; font-size:0.875rem; line-height:1.35;">
                ${escaparHtml(estadoRecurso.titulo) || 'Un título claro y específico para el candidato'}
              </h3>

              <p id="previa-resumen" style="margin:0.375rem 0 0; font-size:0.75rem; color:#475569; line-height:1.5;">
                ${escaparHtml(estadoRecurso.resumen) || 'Aquí se mostrará el resumen de 2-3 líneas que describe qué aprenderá el usuario con este recurso laboral.'}
              </p>

              <div style="margin-top:0.75rem; padding-top:0.5rem; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; font-size:10px; color:#64748b;">
                <span>Por: Equipo Editorial</span>
                <span style="font-weight:600; color:#334155;">WorkConnect</span>
              </div>
            </div>
          </div>

          <div class="tarjeta" style="padding:1rem;">
            <h3 style="margin:0 0 0.5rem; font-weight:700; color:#0f172a; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.04em;">
              Reglas de publicación
            </h3>
            <ul class="lista-reglas">
              <li>
                <span style="color:#831843; font-weight:700;">•</span>
                <span><strong>Título específico:</strong> Evita títulos genéricos como «Consejos».</span>
              </li>
              <li>
                <span style="color:#831843; font-weight:700;">•</span>
                <span><strong>Resumen de 2-3 líneas:</strong> Es lo que el candidato verá en la tarjeta.</span>
              </li>
              <li>
                <span style="color:#831843; font-weight:700;">•</span>
                <span><strong>Un solo tema:</strong> Un recurso, un tema sin dispersión.</span>
              </li>
              <li>
                <span style="color:#831843; font-weight:700;">•</span>
                <span><strong>Sin datos personales:</strong> Nada de casos individuales identificables.</span>
              </li>
              <li>
                <span style="color:#831843; font-weight:700;">•</span>
                <span><strong>Portada horizontal:</strong> 1200 x 630 px recomendada.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    `;

    const formulario = zonaSubpestana.querySelector('#formulario-crear-recurso');
    const cajaError = zonaSubpestana.querySelector('#error-crear-recurso');
    const campoTitulo = zonaSubpestana.querySelector('#recurso-titulo');
    const campoCategoria = zonaSubpestana.querySelector('#recurso-categoria');
    const campoNivel = zonaSubpestana.querySelector('#recurso-nivel');
    const campoTiempo = zonaSubpestana.querySelector('#recurso-tiempo');
    const campoResumen = zonaSubpestana.querySelector('#recurso-resumen');
    const campoContenido = zonaSubpestana.querySelector('#recurso-contenido');
    const campoEtiquetas = zonaSubpestana.querySelector('#recurso-etiquetas');

    const contadorTitulo = zonaSubpestana.querySelector('#contador-titulo');
    const contadorResumen = zonaSubpestana.querySelector('#contador-resumen');
    const contadorContenido = zonaSubpestana.querySelector('#contador-contenido');

    const previaCategoria = zonaSubpestana.querySelector('#previa-categoria');
    const previaTiempo = zonaSubpestana.querySelector('#previa-tiempo');
    const previaTitulo = zonaSubpestana.querySelector('#previa-titulo');
    const previaResumen = zonaSubpestana.querySelector('#previa-resumen');

    campoCategoria.value = estadoRecurso.categoria;
    campoNivel.value = estadoRecurso.nivelLectura;

    campoTitulo.addEventListener('input', (e) => {
      estadoRecurso.titulo = e.target.value;
      contadorTitulo.textContent = `${estadoRecurso.titulo.length} caracteres (mínimo 8)`;
      previaTitulo.textContent =
        estadoRecurso.titulo || 'Un título claro y específico para el candidato';
    });

    campoCategoria.addEventListener('change', (e) => {
      estadoRecurso.categoria = e.target.value;
      previaCategoria.textContent = estadoRecurso.categoria;
    });

    campoNivel.addEventListener('change', (e) => {
      estadoRecurso.nivelLectura = e.target.value;
    });

    campoTiempo.addEventListener('input', (e) => {
      estadoRecurso.tiempoLecturaMin = Number(e.target.value) || 1;
      previaTiempo.textContent = `Lectura de ${estadoRecurso.tiempoLecturaMin} min`;
    });

    campoResumen.addEventListener('input', (e) => {
      estadoRecurso.resumen = e.target.value;
      contadorResumen.textContent = `${estadoRecurso.resumen.length} caracteres`;
      previaResumen.textContent =
        estadoRecurso.resumen ||
        'Aquí se mostrará el resumen de 2-3 líneas que describe qué aprenderá el usuario con este recurso laboral.';
    });

    campoContenido.addEventListener('input', (e) => {
      estadoRecurso.contenido = e.target.value;
      contadorContenido.textContent = `${estadoRecurso.contenido.length} caracteres`;
    });

    campoEtiquetas.addEventListener('input', (e) => {
      estadoRecurso.etiquetas = e.target.value;
    });

    const inputPortada = zonaSubpestana.querySelector('#recurso-archivo-portada');
    const etiquetaPortada = zonaSubpestana.querySelector('#etiqueta-archivo-portada');
    if (inputPortada && etiquetaPortada) {
      inputPortada.addEventListener('change', (e) => {
        const archivo = e.target.files?.[0];
        estadoRecurso.nombreArchivoPortada = archivo ? archivo.name : '';
        etiquetaPortada.textContent = `🖼️ ${estadoRecurso.nombreArchivoPortada || 'Seleccionar portada'}`;
      });
    }

    const inputAdjunto = zonaSubpestana.querySelector('#recurso-archivo-adjunto');
    const etiquetaAdjunto = zonaSubpestana.querySelector('#etiqueta-archivo-adjunto');
    if (inputAdjunto && etiquetaAdjunto) {
      inputAdjunto.addEventListener('change', (e) => {
        const archivo = e.target.files?.[0];
        estadoRecurso.nombreArchivoAdjunto = archivo ? archivo.name : '';
        etiquetaAdjunto.textContent = `📎 ${estadoRecurso.nombreArchivoAdjunto || 'Adjuntar archivo'}`;
      });
    }

    zonaSubpestana.querySelectorAll('input[name="estadoPublicacion"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          estadoRecurso.estadoPublicacion = e.target.value;
        }
      });
    });

    zonaSubpestana.querySelectorAll('[data-audiencia]').forEach((casilla) => {
      casilla.addEventListener('change', () => {
        const valor = casilla.getAttribute('data-audiencia');
        if (casilla.checked) {
          if (!estadoRecurso.audiencia.includes(valor)) {
            estadoRecurso.audiencia.push(valor);
          }
        } else {
          estadoRecurso.audiencia = estadoRecurso.audiencia.filter((a) => a !== valor);
        }
      });
    });

    const limpiarFormulario = () => {
      estadoRecurso.titulo = '';
      estadoRecurso.categoria = 'Artículo';
      estadoRecurso.nivelLectura = 'Básico';
      estadoRecurso.tiempoLecturaMin = 5;
      estadoRecurso.resumen = '';
      estadoRecurso.contenido = '';
      estadoRecurso.etiquetas = '';
      estadoRecurso.estadoPublicacion = 'Publicado';
      estadoRecurso.audiencia = ['Visitantes', 'Candidatos registrados'];
      estadoRecurso.nombreArchivoPortada = '';
      estadoRecurso.nombreArchivoAdjunto = '';
      pintarSubpestana();
    };

    zonaSubpestana.querySelector('#limpiar-recurso').addEventListener('click', limpiarFormulario);

    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const tituloLimpio = estadoRecurso.titulo.trim();
      const resumenLimpio = estadoRecurso.resumen.trim();
      const contenidoLimpio = estadoRecurso.contenido.trim();

      if (!tituloLimpio || tituloLimpio.length < 8) {
        cajaError.textContent = 'El título debe tener al menos 8 caracteres.';
        cajaError.classList.remove('oculto');
        campoTitulo.focus();
        return;
      }

      if (!resumenLimpio || resumenLimpio.length < 20) {
        cajaError.textContent = 'El resumen debe tener al menos 20 caracteres.';
        cajaError.classList.remove('oculto');
        campoResumen.focus();
        return;
      }

      if (!contenidoLimpio || contenidoLimpio.length < 30) {
        cajaError.textContent = 'El contenido debe tener al menos 30 caracteres.';
        cajaError.classList.remove('oculto');
        campoContenido.focus();
        return;
      }

      cajaError.classList.add('oculto');

      await acciones.alCrearRecurso({
        titulo: tituloLimpio,
        categoria: estadoRecurso.categoria,
        nivelLectura: estadoRecurso.nivelLectura,
        tiempoLecturaMin: Number(estadoRecurso.tiempoLecturaMin) || 5,
        resumen: resumenLimpio,
        contenido: contenidoLimpio,
        imagenPortadaUrl: estadoRecurso.nombreArchivoPortada || null,
        adjuntos: estadoRecurso.nombreArchivoAdjunto ? [estadoRecurso.nombreArchivoAdjunto] : [],
        etiquetas: estadoRecurso.etiquetas
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        estadoPublicacion: estadoRecurso.estadoPublicacion,
        audiencia: [...estadoRecurso.audiencia]
      });

      limpiarFormulario();
    });
  };

  contenedor.querySelectorAll('#pestanas-recursos [data-subpestana]').forEach((boton) => {
    boton.addEventListener('click', () => {
      estadoRecurso.subpestana = boton.getAttribute('data-subpestana');
      renderizarP19CrearRecurso(contenedor, recursos, acciones);
    });
  });

  pintarSubpestana();
}
