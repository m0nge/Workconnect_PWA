import sistemaArchivos from 'node:fs';
import rutasArchivos from 'node:path';
import { execFileSync as ejecutarArchivo } from 'node:child_process';

const carpetasObjetivo = ['api', 'configuracion', 'servicios', 'publico', 'scripts'];
const archivosJavaScript = ['servidor.js'];

function recolectarArchivosJs(rutaCarpeta) {
  if (!sistemaArchivos.existsSync(rutaCarpeta)) return;
  const entradas = sistemaArchivos.readdirSync(rutaCarpeta, { withFileTypes: true });
  for (const entrada of entradas) {
    const rutaCompleta = rutasArchivos.join(rutaCarpeta, entrada.name);
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
  ejecutarArchivo(process.execPath, ['--check', archivo], { stdio: 'inherit' });
}

console.log(`Verificación exitosa: ${archivosJavaScript.length} archivos JavaScript validados sin errores de sintaxis.`);
