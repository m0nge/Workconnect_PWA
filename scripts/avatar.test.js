import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { renderizarAvatar } from '../publico/js/utilidades/avatar.js';
import { mapearEmpresa, mapearModeracion } from '../servicios/supabase.js';

prueba('las empresas conservan su logo y las fotos anteriores del usuario como alternativa', () => {
  comprobar.equal(mapearEmpresa({ logo_url: 'logo', usuarios: { foto_url: 'anterior' } }).logoUrl, 'logo');
  comprobar.equal(mapearEmpresa({ usuarios: { foto_url: 'anterior' } }).logoUrl, 'anterior');
  comprobar.equal(mapearEmpresa({}).logoUrl, '');
  const reporte = mapearModeracion({ candidato: { nombre: 'Persona temporal', foto_url: 'foto' } });
  comprobar.equal(reporte.fotoUrl, 'foto');
  comprobar.equal(reporte.candidatoNombre, 'Persona temporal');
});

prueba('los avatares muestran fotos con respaldo y escapan los datos del usuario', () => {
  const html = renderizarAvatar({ nombre: '<Persona temporal>', fotoUrl: 'https://example.invalid/foto?valor="', cuadrado: true });
  comprobar.match(html, /<img/);
  comprobar.match(html, /avatar-cuadrado/);
  comprobar.match(html, /this.remove\(\)/);
  comprobar.match(html, /&lt;Persona temporal&gt;/);
  comprobar.match(html, /&quot;/);
  comprobar.equal(renderizarAvatar({ nombre: 'Persona temporal' }).includes('<img'), false);
});
