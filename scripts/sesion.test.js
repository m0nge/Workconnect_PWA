import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { crearTokenSesion, validarTokenSesion, duracionSesion } from '../servicios/sesion.js';

prueba('valida la firma y rechaza sesiones modificadas, vencidas o con otra clave', () => {
  const secretoAnterior = process.env.SESSION_SECRET;
  const ahoraOriginal = Date.now;
  try {
    process.env.SESSION_SECRET = 'clave-para-pruebas-de-sesion';
    const token = crearTokenSesion('usuario-123');
    comprobar.equal(validarTokenSesion(token)?.usuarioId, 'usuario-123');
    const [contenido, firma] = token.split('.');
    const alterado = Buffer.from(JSON.stringify({ usuarioId: 'otro', exp: 9999999999 })).toString('base64url');
    comprobar.equal(validarTokenSesion(`${alterado}.${firma}`), null);
    comprobar.equal(validarTokenSesion(`${contenido}.invalida`), null);
    comprobar.equal(validarTokenSesion(''), null);
    comprobar.equal(validarTokenSesion(`${token}.extra`), null);
    process.env.SESSION_SECRET = 'otra-clave';
    comprobar.equal(validarTokenSesion(token), null);
    process.env.SESSION_SECRET = 'clave-para-pruebas-de-sesion';
    const ahora = ahoraOriginal();
    Date.now = () => ahora + (duracionSesion + 1) * 1000;
    comprobar.equal(validarTokenSesion(token), null);
  } finally {
    Date.now = ahoraOriginal;
    if (secretoAnterior === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = secretoAnterior;
  }
});
