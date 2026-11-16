import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { quitarCurriculum } from '../servicios/curriculum.js';

function preparar({ errorReferencias = null, errorPerfil = null, referencias = [] } = {}) {
  const llamadas = [];
  const supabase = {
    from(tabla) {
      const consulta = {
        select() { return this; },
        eq() { return this; },
        is() { return this; },
        update() { llamadas.push('actualizar'); return this; },
        limit: async () => ({ data: referencias, error: errorReferencias }),
        maybeSingle: async () => ({ data: errorPerfil ? null : { id: 'perfil' }, error: errorPerfil })
      };
      llamadas.push(tabla);
      return consulta;
    },
    storage: { from: () => ({ remove: async () => { llamadas.push('borrar archivo'); return { error: null }; } }) }
  };
  return { contexto: { supabase, perfil: { id: 'perfil', curriculum_url: 'perfil/documento.pdf' }, usuario: { id: 'usuario' } }, llamadas };
}

prueba('no borra archivos ni cambia el perfil si falla la consulta de postulaciones', async () => {
  const { contexto, llamadas } = preparar({ errorReferencias: { code: 'conexion' } });
  await comprobar.rejects(quitarCurriculum(contexto), /No se pudo comprobar/);
  comprobar.equal(llamadas.includes('actualizar'), false);
  comprobar.equal(llamadas.includes('borrar archivo'), false);
});

prueba('no borra el archivo si falla la actualización del perfil', async () => {
  const { contexto, llamadas } = preparar({ errorPerfil: { code: 'conexion' } });
  await comprobar.rejects(quitarCurriculum(contexto), /No se pudo quitar/);
  comprobar.equal(llamadas.includes('borrar archivo'), false);
});

prueba('desvincula el CV sin borrar el documento recibido por las empresas', async () => {
  const { contexto, llamadas } = preparar({ referencias: [{ id: 'postulacion' }] });
  comprobar.equal((await quitarCurriculum(contexto)).eliminado, true);
  comprobar.equal(llamadas.includes('actualizar'), true);
  comprobar.equal(llamadas.includes('borrar archivo'), false);
});
