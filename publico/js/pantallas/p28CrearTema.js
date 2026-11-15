export function renderizarP28CrearTema(contenedor, alNavegar, mostrarNotificacion) {
  contenedor.innerHTML = `<div class="pila-vertical"><div class="cabecera-pantalla"><h1 class="titulo-pantalla">Crear tema en foros</h1><p class="subtitulo-pantalla">Abre una conversación para la comunidad.</p></div><form id="formulario-tema" class="tarjeta tarjeta-espaciado formulario-publico"><label class="campo-formulario"><span>Título del tema *</span><input id="tema-titulo" type="text" minlength="5" maxlength="120" required /></label><label class="campo-formulario"><span>Categoría *</span><select id="tema-categoria" required><option value="">Selecciona una categoría</option><option>Búsqueda de empleo</option><option>Desarrollo profesional</option><option>Experiencias laborales</option></select></label><label class="campo-formulario"><span>Descripción *</span><textarea id="tema-descripcion" minlength="20" maxlength="2000" rows="7" required></textarea></label><div class="acciones-formulario"><button class="boton-secundario" id="cancelar-tema" type="button">Cancelar</button><button class="boton-principal" type="submit">Publicar tema</button></div></form></div>`;
  contenedor.querySelector('#cancelar-tema').addEventListener('click', () => alNavegar('P05'));
  contenedor.querySelector('#formulario-tema').addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!evento.currentTarget.checkValidity()) { evento.currentTarget.reportValidity(); return; }
    mostrarNotificacion('El tema se publicó correctamente.');
    alNavegar('P05');
  });
}
