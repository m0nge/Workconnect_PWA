import { abrirModal } from './modal.js';
import { solicitarApi } from '../utilidades/solicitudes.js';
import { escaparHtml } from '../utilidades/formato.js';
import { renderizarAvatar } from '../utilidades/avatar.js';
import { mostrarAvisoContextual } from './avisoContextual.js';

const periodo = (inicio, fin, actual) => [inicio?.slice(0, 7), actual ? 'Actualidad' : fin?.slice(0, 7) || 'Sin fecha de finalización'].filter(Boolean).map(escaparHtml).join(' — ');
const lista = (elementos, renderizar) => elementos.length ? `<ul class="perfil-postulante-lista">${elementos.map((elemento) => `<li>${renderizar(elemento)}</li>`).join('')}</ul>` : '<p class="texto-secundario">No hay información registrada.</p>';

export function abrirPerfilPostulante(postulacionId) {
  abrirModal({
    titulo: 'Perfil del candidato',
    contenidoHtml: '<div class="perfil-postulante" aria-busy="true"><p role="status">Cargando perfil...</p></div>',
    alMontar(cuerpo, cerrar) {
      const contenedor = cuerpo.querySelector('.perfil-postulante');
      const cargar = async () => {
        contenedor.setAttribute('aria-busy', 'true');
        try {
          const datos = await solicitarApi(`/api/empresa/postulaciones/${encodeURIComponent(postulacionId)}/perfil`, { cache: 'no-store' });
          if (!contenedor.isConnected) return;
          contenedor.className = 'perfil-postulante';
          contenedor.removeAttribute('role');
          const perfil = datos.perfil;
          contenedor.innerHTML = `<header class="celda-identidad">${renderizarAvatar({ nombre: perfil.nombre, fotoUrl: perfil.foto_url, grande: true })}<div><h2>${escaparHtml(perfil.nombre)}</h2><p>${escaparHtml(perfil.titulo_profesional || 'Perfil profesional')}</p></div></header>
            <dl class="perfil-postulante-contacto">${[['Correo', perfil.email], ['Teléfono', perfil.telefono], ['Ubicación', perfil.ubicacion]].map(([etiqueta, valor]) => `<div><dt>${etiqueta}</dt><dd>${escaparHtml(valor || 'No registrado')}</dd></div>`).join('')}</dl>
            <section><h3>Presentación profesional</h3><p class="perfil-postulante-texto">${escaparHtml(perfil.resumen_laboral || 'Sin presentación registrada.')}</p></section>
            <section><h3>Experiencia laboral</h3>${lista(datos.experiencias, (experiencia) => `<strong>${escaparHtml(experiencia.puesto)}</strong><p>${escaparHtml(experiencia.empresa)}</p><p class="texto-secundario">${periodo(experiencia.fecha_inicio, experiencia.fecha_fin, experiencia.es_trabajo_actual)}</p>${experiencia.descripcion ? `<p class="perfil-postulante-texto">${escaparHtml(experiencia.descripcion)}</p>` : ''}`)}</section>
            <section><h3>Estudios</h3>${lista(datos.estudios, (estudio) => `<strong>${escaparHtml(estudio.carrera_programa)}</strong><p>${escaparHtml(estudio.institucion)} · ${escaparHtml(estudio.nivel_academico)}</p><p class="texto-secundario">${escaparHtml(estudio.anio_inicio)} — ${escaparHtml(estudio.anio_fin || 'En curso')}</p>`)}</section>
            <section><h3>Habilidades</h3>${lista(datos.habilidades, (habilidad) => `<strong>${escaparHtml(habilidad.habilidad)}</strong>${habilidad.nivel_dominio ? `<span class="etiqueta-cuadrada">${escaparHtml(habilidad.nivel_dominio)}</span>` : ''}`)}</section>
            <div class="grupo-acciones">${datos.curriculum_url ? `<a class="boton" href="${escaparHtml(datos.curriculum_url)}" target="_blank" rel="noopener">Ver currículum</a>` : ''}<button type="button" class="boton" data-cerrar-perfil>Cerrar</button></div>`;
          contenedor.querySelector('[data-cerrar-perfil]').addEventListener('click', cerrar);
        } catch (error) {
          if (contenedor.isConnected) mostrarAvisoContextual(contenedor, { titulo: 'No se pudo abrir el perfil', mensaje: error.message, accion: 'Reintentar', alAccionar: cargar });
        } finally { contenedor.setAttribute('aria-busy', 'false'); }
      };
      cargar();
    }
  });
}
