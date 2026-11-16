import { validarTexto, valorEnLista } from '../utilidades/formato.js';

export function renderizarP28CrearTema(contenedor, alNavegar, mostrarNotificacion = () => {}) {
  contenedor.innerHTML = `
    <div class="pila-vertical">
      <div class="cabecera-pantalla">
        <h1 class="titulo-pantalla">Crear tema en foros</h1>
        <p class="subtitulo-pantalla">Abre una conversación para la comunidad laboral.</p>
      </div>
      <form id="formulario-tema" class="tarjeta tarjeta-espaciado formulario-publico" novalidate>
        <div id="alerta-error-tema" class="alerta-error-formulario oculto" style="margin-bottom:1rem;"></div>
        <label class="campo-formulario">
          <span>Título del tema *</span>
          <input id="tema-titulo" type="text" minlength="5" maxlength="120" placeholder="Ej. ¿Cómo negociar el salario inicial?" required />
        </label>
        <label class="campo-formulario">
          <span>Categoría *</span>
          <select id="tema-categoria" required>
            <option value="">Selecciona una categoría</option>
            <option value="Búsqueda de empleo">Búsqueda de empleo</option>
            <option value="Desarrollo profesional">Desarrollo profesional</option>
            <option value="Experiencias laborales">Experiencias laborales</option>
          </select>
        </label>
        <label class="campo-formulario">
          <span>Descripción *</span>
          <textarea id="tema-descripcion" minlength="20" maxlength="2000" rows="7" placeholder="Detalla tu pregunta, caso o experiencia con suficiente contexto (mínimo 20 caracteres)..." required></textarea>
        </label>
        <div class="acciones-formulario">
          <button class="boton-secundario" id="cancelar-tema" type="button">Cancelar</button>
          <button class="boton-principal" id="boton-publicar-tema" type="submit">Publicar tema</button>
        </div>
      </form>
    </div>
  `;

  const formulario = contenedor.querySelector('#formulario-tema');
  const alertaError = contenedor.querySelector('#alerta-error-tema');
  const botonCancelar = contenedor.querySelector('#cancelar-tema');
  const botonPublicar = contenedor.querySelector('#boton-publicar-tema');

  botonCancelar.addEventListener('click', () => alNavegar('P05'));

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const titulo = contenedor.querySelector('#tema-titulo').value.trim();
    const categoria = contenedor.querySelector('#tema-categoria').value;
    const descripcion = contenedor.querySelector('#tema-descripcion').value.trim();

    if (
      !validarTexto(titulo, 5, 120) ||
      !valorEnLista(categoria, ['Búsqueda de empleo', 'Desarrollo profesional', 'Experiencias laborales']) ||
      !validarTexto(descripcion, 20, 2000)
    ) {
      if (alertaError) {
        alertaError.textContent = 'Por favor completa todos los campos: título (5-120 caracteres), categoría válida y descripción (mínimo 20 caracteres).';
        alertaError.classList.remove('oculto');
      }
      formulario.reportValidity();
      return;
    }

    if (alertaError) alertaError.classList.add('oculto');
    botonPublicar.disabled = true;
    botonPublicar.textContent = 'Publicando...';

    try {
      const res = await fetch('/api/foros/temas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, categoria, descripcion })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo publicar el tema.');
      }
      mostrarNotificacion('El tema se publicó correctamente en los foros.');
      alNavegar('P05');
    } catch (err) {
      if (alertaError) {
        alertaError.textContent = err.message || 'Error al publicar el tema.';
        alertaError.classList.remove('oculto');
      }
    } finally {
      botonPublicar.disabled = false;
      botonPublicar.textContent = 'Publicar tema';
    }
  });
}
