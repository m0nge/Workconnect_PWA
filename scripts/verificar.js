import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const carpetasObjetivo = ['api', 'configuracion', 'servicios', 'publico', 'scripts'];
const archivosJavaScript = ['servidor.js'];

function recolectarArchivosJs(rutaCarpeta) {
  if (!fs.existsSync(rutaCarpeta)) return;
  const entradas = fs.readdirSync(rutaCarpeta, { withFileTypes: true });
  for (const entrada of entradas) {
    const rutaCompleta = path.join(rutaCarpeta, entrada.name);
    if (entrada.isDirectory()) {
      recolectarArchivosJs(rutaCompleta);
    } else if (entrada.isFile() && entrada.name.endsWith('.js')) {
      archivosJavaScript.push(rutaCompleta);
    }
  }
}

for (const carpeta of carpetasObjetivo) {
  recolectarArchivosJs(carpeta);
}

for (const archivo of archivosJavaScript) {
  execFileSync(process.execPath, ['--check', archivo], { stdio: 'inherit' });
}

console.log(`Verificación exitosa: ${archivosJavaScript.length} archivos JavaScript validados sin errores de sintaxis.`);
