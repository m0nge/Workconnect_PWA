import { escaparHtml } from '../utilidades/formato.js';

const temas = [
  { categoria: 'Búsqueda de empleo', titulo: 'Consejos para preparar una entrevista', autor: 'Comunidad WorkConnect', respuestas: 4 },
  { categoria: 'Desarrollo profesional', titulo: '¿Qué habilidades son más solicitadas?', autor: 'Comunidad WorkConnect', respuestas: 7 },
  { categoria: 'Experiencias laborales', titulo: 'Comparte tu experiencia buscando empleo', autor: 'Comunidad WorkConnect', respuestas: 3 }
];

export function renderizarP05Foros(contenedor, alNavegar) {
  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <h1 class="titulo-pantalla">Foros</h1>
        <p class="subtitulo-pantalla">
          Participa en conversaciones y comparte experiencias laborales.
        </p>
      </div>
      <div class="seccion-lista-cabecera">
        <h2 class="grafico-titulo">Discusiones recientes</h2>
        <button class="boton-principal" id="crear-tema" type="button">Crear tema</button>
      </div>
      <div id="lista-foros" class="lista-tarjetas-publicas">
        ${temas
          .map(
            (tema) => `
              <article class="tarjeta tarjeta-foro-publico">
                <div>
                  <span class="etiqueta-cuadrada">${escaparHtml(tema.categoria)}</span>
                  <h2 class="titulo-tarjeta">${escaparHtml(tema.titulo)}</h2>
                  <p class="texto-secundario">
                    Por ${escaparHtml(tema.autor)} · ${tema.respuestas} respuestas
                  </p>
                </div>
                <button class="boton-secundario" type="button">Ver discusión</button>
              </article>
            `
          )
          .join('')}
      </div>
    </div>
  `;

  contenedor.querySelector('#crear-tema').addEventListener('click', () => alNavegar('P28'));
}
