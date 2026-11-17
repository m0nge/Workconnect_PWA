import { solicitarApi } from './solicitudes.js';

export async function subirAdjuntosRecursos(archivos, subidos, alProgresar = () => {}) {
  for (let indice = subidos.length; indice < archivos.length; indice++) {
    const archivo = archivos[indice];
    alProgresar(`Subiendo ${indice + 1} de ${archivos.length}: ${archivo.name}`);
    const respuesta = await fetch('/api/recursos/adjuntos', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(archivo.name) }, body: archivo });
    const resultado = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo subir el archivo. Intenta de nuevo.');
    subidos.push(resultado.adjunto);
  }
  return [...subidos];
}

export function retirarSubidasRecursos(adjuntos) {
  return Promise.allSettled(adjuntos.map((adjunto) => solicitarApi('/api/recursos/adjuntos', { method: 'DELETE', body: JSON.stringify({ adjunto }) })));
}
