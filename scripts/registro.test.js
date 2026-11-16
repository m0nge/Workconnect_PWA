import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import cifrado from 'bcryptjs';
import { crearUsuarioRegistrado, eliminarRegistroIncompleto } from '../servicios/registro.js';

const datos = { nombre: 'Persona temporal', correo: 'persona@example.invalid', contrasena: 'clave-temporal', rol: 'candidato', telefono: null, ubicacion: null };

prueba('el registro cifra la contraseña y solo devuelve los campos públicos de la cuenta', async () => {
  let fila;
  let columnas;
  const cliente = { from: () => ({
    select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    insert: (valor) => {
      fila = valor;
      return { select: (campos) => { columnas = campos; return { single: async () => ({ data: { id: 'temporal' }, error: null }) }; } };
    }
  }) };
  const resultado = await crearUsuarioRegistrado(cliente, datos);
  comprobar.equal(resultado.data.id, 'temporal');
  comprobar.equal(fila.rol, 'Candidato/a');
  comprobar.equal(fila.estado, 'Activo');
  comprobar.notEqual(fila.password_hash, datos.contrasena);
  comprobar.equal(await cifrado.compare(datos.contrasena, fila.password_hash), true);
  comprobar.match(fila.password_hash, /^\$2a\$12\$/);
  comprobar.equal(columnas.includes('password_hash'), false);
});

prueba('rechaza roles no permitidos, correos existentes y fallos de consulta sin insertar', async () => {
  let consultas = 0;
  const cliente = (resultado) => ({ from: () => {
    consultas++;
    return { select: () => ({ ilike: () => ({ maybeSingle: async () => resultado }) }) };
  } });
  comprobar.equal((await crearUsuarioRegistrado(cliente({}), { ...datos, rol: 'administrador' })).error.code, '22023');
  comprobar.equal(consultas, 0);
  comprobar.equal((await crearUsuarioRegistrado(cliente({ data: { id: 'existente' } }), datos)).error.code, '23505');
  comprobar.equal((await crearUsuarioRegistrado(cliente({ error: { code: 'conexion' } }), datos)).error.code, 'conexion');
});

prueba('retira los perfiles antes de eliminar una cuenta cuyo registro quedó incompleto', async () => {
  const operaciones = [];
  const cliente = { from: (tabla) => ({ delete: () => ({ eq: async (campo, valor) => {
    operaciones.push([tabla, campo, valor]);
    return { error: null };
  } }) }) };
  comprobar.equal(await eliminarRegistroIncompleto(cliente, 'temporal'), true);
  comprobar.deepEqual(operaciones, [
    ['perfiles_candidatos', 'usuario_id', 'temporal'], ['empresas', 'usuario_id', 'temporal'], ['usuarios', 'id', 'temporal']
  ]);
});

prueba('informa si la limpieza de un registro incompleto falla', async () => {
  const cliente = { from: () => ({ delete: () => ({ eq: async () => ({ error: { code: 'conexion' } }) }) }) };
  comprobar.equal(await eliminarRegistroIncompleto(cliente, 'temporal'), false);
});
