import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { identificarFoto, guardarFoto } from '../servicios/fotos.js';

prueba('reconoce el contenido de JPG, PNG y WebP y rechaza archivos ajenos a esos formatos', () => {
  comprobar.equal(identificarFoto(Buffer.from([255, 216, 255, 224])).tipo, 'image/jpeg');
  comprobar.equal(identificarFoto(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])).tipo, 'image/png');
  comprobar.equal(identificarFoto(Buffer.from('RIFF1234WEBP1234')).tipo, 'image/webp');
  comprobar.equal(identificarFoto(Buffer.from('<svg onload="alert(1)">')), null);
  comprobar.equal(identificarFoto(Buffer.alloc(0)), null);
});

prueba('elimina la imagen recién subida si no se puede guardar su referencia en el perfil', async () => {
  let subida; let eliminadas;
  const almacen = {
    upload: async (ruta) => { subida = ruta; return { error: null }; },
    getPublicUrl: (ruta) => ({ data: { publicUrl: `https://example.invalid/${ruta}` } }),
    remove: async (rutas) => { eliminadas = rutas; return { error: null }; }
  };
  const supabase = {
    storage: { from: () => almacen },
    from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ error: { code: 'conexion' } }) }) }) }) })
  };
  await comprobar.rejects(guardarFoto({ supabase, usuario: { id: 'temporal' } }, Buffer.from([255, 216, 255, 224])), /No se pudo guardar/);
  comprobar.deepEqual(eliminadas, [subida]);
});
