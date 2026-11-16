const reglas = {
  violencia: /\b(matar(?:te|los|las|lo|la)?|matare|asesin(?:ar|ato|a|o|os)|violencia|muerte|muert[oa]s?|suicid(?:io|arse)|apuñalar|apunalar|disparar|balazo|amenaz(?:a|as|ar)|golpear|viola(?:r|cion))\b/gu,
  sexual: /\b(sexo|sexual(?:es)?|porn(?:o|ografia)|desnud[oa]s?|prostitu(?:ta|cion)|pene|vagina|verga|masturba\w*)\b/gu,
  insultos: /\b(put[oa]s?|mierda|pendej[oa]s?|cerot[ea]s?|hijueputa|hijueputas|cabron(?:es)?|culer[oa]s?|joder|maricon(?:es)?|idiotas?|imbecil(?:es)?)\b/gu
};

export function detectarLenguaje(texto) {
  const normalizado = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return Object.entries(reglas).flatMap(([categoria, patron]) => {
    const coincidencias = [...new Set(normalizado.match(patron) || [])];
    return coincidencias.length ? [{ categoria, coincidencias }] : [];
  });
}

export async function reportarAutomaticamente(supabase, { texto, tipo, categoria, id, autor, origen }) {
  const hallazgos = detectarLenguaje(texto);
  if (!hallazgos.length) return false;
  const { error } = await supabase.from('moderacion_reportes').insert({
    tipo,
    categoria,
    referencia: id,
    motivo_titulo: `Detección automática: ${hallazgos.map((h) => h.categoria).join(', ')}`,
    autor_nombre: autor || 'Sistema',
    detalles: `${origen ? `Origen: ${origen}\n` : ''}Revisión automática por palabras: ${hallazgos.flatMap((h) => h.coincidencias).join(', ')}.\n${texto}`,
    estado: 'Pendiente'
  });
  if (error) throw new Error('El contenido se guardó, pero no se pudo generar su reporte automático.');
  return true;
}

export function destinoModeracion(reporte) {
  if (!/^[0-9a-f-]{36}$/i.test(reporte.referencia || '')) return null;
  const tipos = {
    foro: { tabla: 'foros_temas', visible: 'Activo', oculto: 'Oculto' },
    comentario: { tabla: 'foros_respuestas', visible: 'Activo', oculto: 'Oculto' },
    valoracion: { tabla: 'valoraciones_empresas', visible: 'Aprobada', oculto: 'Pendiente' }
  };
  if (tipos[reporte.tipo]) return tipos[reporte.tipo];
  if (reporte.tipo === 'reporte' && reporte.detalles?.startsWith('Origen: vacantes\n')) {
    return { tabla: 'vacantes', visible: 'Activa', oculto: 'Inactiva' };
  }
  return null;
}
