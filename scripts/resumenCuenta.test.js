import prueba from 'node:test';
import comprobar from 'node:assert/strict';
import { resumirCandidato, resumirEmpresa } from '../publico/js/utilidades/resumenCuenta.js';

prueba('el resumen del candidato usa su perfil, CV, alertas y estados reales', () => {
  const resumen = resumirCandidato({ perfil: { telefono: '7777-1111', ubicacion: 'Santa Ana', curriculum_nombre: 'cv.pdf' }, alertas: [{ activa: true }, { activa: false }], postulaciones: [{ estado: 'Entrevista' }, { estado: 'Rechazada' }, { estado: 'En revisión' }] });
  comprobar.equal(resumen.porcentajePerfil, 50);
  comprobar.equal(resumen.tieneCurriculum, true);
  comprobar.equal(resumen.alertasActivas, 1);
  comprobar.equal(resumen.postulaciones, 3);
  comprobar.equal(resumen.procesos.Entrevista, 1);
  comprobar.equal(resumen.procesos.Contratada, 0);
});

prueba('el resumen de empresa distingue ofertas activas y etapas de selección', () => {
  const resumen = resumirEmpresa([{ estado: 'Activa' }, { estado: 'Inactiva' }, { estado: 'Pendiente' }], [{ estado: 'Nueva' }, { estado: 'Nueva' }, { estado: 'Contratada' }]);
  comprobar.equal(resumen.ofertas, 3);
  comprobar.equal(resumen.activas, 1);
  comprobar.equal(resumen.inactivas, 1);
  comprobar.equal(resumen.procesos.Nueva, 2);
  comprobar.equal(resumen.procesos.Contratada, 1);
});

prueba('las cuentas nuevas muestran ceros y tareas pendientes sin inventar actividad', () => {
  comprobar.equal(resumirCandidato({}).porcentajePerfil, 0);
  comprobar.equal(resumirCandidato({}).tieneCurriculum, false);
  comprobar.equal(resumirCandidato({}).postulaciones, 0);
  comprobar.equal(resumirEmpresa().activas, 0);
  comprobar.equal(resumirEmpresa().postulaciones, 0);
});
