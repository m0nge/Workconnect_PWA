import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { validarVacanteEmpresa, registrarEdicionVacanteEmpresa } from '../servicios/vacantesEmpresa.js';
import { filtrarOfertas } from '../publico/js/utilidades/ofertas.js';

const oferta = {
  titulo: 'Técnico de mantenimiento', sector: 'Servicios', departamento: 'Santa Ana', municipio: 'Metapán', modalidad: 'Presencial',
  tipo_contrato: 'Tiempo completo', plazas: 2, salario_min: 620, salario_max: 1020, descripcion: 'Mantenimiento de equipos e instalaciones.',
  funciones: ['Inspeccionar equipos'], requisitos: ['Experiencia técnica'], beneficios: ['Capacitación']
};

prueba('el buscador encuentra ofertas por título, ubicación y estado sin distinguir tildes', () => {
  const ofertas = [{ ...oferta, estado: 'Inactiva' }];
  for (const termino of ['tecnico', 'METAPAN', 'santa ana', 'inactiva', 'tiempo completo', '']) comprobar.equal(filtrarOfertas(ofertas, termino).length, 1);
  comprobar.equal(filtrarOfertas(ofertas, 'Sin coincidencias').length, 0);
});

prueba('la edición conserva contenido y no permite cambiar empresa ni estado', () => {
  const validacion = validarVacanteEmpresa({ ...oferta, empresa_id: 'ajena', estado: 'Activa', funciones: '- Inspeccionar equipos\n- Reparar fallas' });
  comprobar.deepEqual(validacion.datos.funciones, ['Inspeccionar equipos', 'Reparar fallas']);
  comprobar.equal(validacion.datos.empresa_id, undefined);
  comprobar.equal(validacion.datos.estado, undefined);
  comprobar.equal(validarVacanteEmpresa({ ...oferta, salario_max: 100 }).datos, undefined);
  comprobar.equal(validarVacanteEmpresa({ ...oferta, plazas: true }).datos, undefined);
  comprobar.equal(validarVacanteEmpresa({ ...oferta, requisitos: [] }).datos, undefined);
  comprobar.equal(validarVacanteEmpresa({ ...oferta, fecha_limite: '2000-01-01' }).datos, undefined);
  comprobar.ok(validarVacanteEmpresa({ ...oferta, fecha_limite: '2000-01-01' }, '2000-01-01').datos);
});

function preparar(existente, autorizada = true) {
  const consultas = [];
  const cliente = { from(tabla) {
    const consulta = { tabla, filtros: [] }; consultas.push(consulta);
    return {
      select() { return this; }, eq(campo, valor) { consulta.filtros.push([campo, valor]); return this; },
      update(campos) { consulta.campos = campos; return this; },
      maybeSingle: async () => ({ data: consulta.campos ? { id: 'oferta', ...consulta.campos, estado: 'Inactiva' } : existente, error: null })
    };
  } };
  let manejar;
  registrarEdicionVacanteEmpresa({ put: (_ruta, accion) => { manejar = accion; } }, {
    conManejoErrores: (accion) => accion,
    obtenerEmpresaAutenticada: async (_solicitud, respuesta) => {
      if (!autorizada) { respuesta.status(401).json({ error: 'Sin sesión' }); return null; }
      return { supabase: cliente, empresa: { id: 'mi-empresa' }, usuario: { nombre: 'Empresa' } };
    }, reportarAutomaticamente: async () => {}
  });
  const respuesta = { codigo: 200, status(codigo) { this.codigo = codigo; return this; }, json(datos) { this.datos = datos; return this; } };
  return { manejar, respuesta, consultas };
}

prueba('solo guarda ofertas de la empresa autenticada y mantiene las ofertas inactivas', async () => {
  const { manejar, respuesta, consultas } = preparar({ id: 'oferta' });
  await manejar({ params: { id: 'oferta' }, body: { ...oferta, empresa_id: 'otra', estado: 'Activa' } }, respuesta);
  comprobar.equal(respuesta.codigo, 200);
  comprobar.equal(respuesta.datos.vacante.estado, 'Inactiva');
  for (const consulta of consultas) comprobar.ok(consulta.filtros.some(([campo, valor]) => campo === 'empresa_id' && valor === 'mi-empresa'));
  comprobar.equal(consultas[1].campos.empresa_id, undefined);
});

prueba('rechaza editar una oferta ajena o actuar sin sesión', async () => {
  for (const autorizada of [true, false]) {
    const { manejar, respuesta, consultas } = preparar(null, autorizada);
    await manejar({ params: { id: 'oferta-ajena' }, body: oferta }, respuesta);
    comprobar.equal(respuesta.codigo, autorizada ? 404 : 401);
    comprobar.equal(consultas.some((consulta) => consulta.campos), false);
  }
});
