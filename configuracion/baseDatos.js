import { createClient as crearClienteSupabase } from '@supabase/supabase-js';
export const configuracionBaseDatos = {
  proveedor: 'Supabase (PostgreSQL)',
  urlProyecto: process.env.SUPABASE_URL || 'https://nrglhwctftjfvflopppo.supabase.co',
  claveServicio: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  tablas: {
    usuarios: 'usuarios',
    empresas: 'empresas',
    vacantes: 'vacantes',
    postulaciones: 'postulaciones',
    solicitudesVerificacion: 'solicitudes_verificacion',
    moderacionReportes: 'moderacion_reportes',
    recursosLaborales: 'recursos_laborales'
  }
};

export function verificarConfiguracionBaseDatos() {
  return {
    proveedor: configuracionBaseDatos.proveedor,
    urlSupabase: configuracionBaseDatos.urlProyecto,
    estaConfigurado: Boolean(
      configuracionBaseDatos.urlProyecto && configuracionBaseDatos.claveServicio
    )
  };
}

export function crearClienteBaseDatos() {
  const { estaConfigurado } = verificarConfiguracionBaseDatos();
  if (!estaConfigurado) {
    return null;
  }

  return crearClienteSupabase(
    configuracionBaseDatos.urlProyecto,
    configuracionBaseDatos.claveServicio,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
