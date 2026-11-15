-- BASE DE ESQUEMA VACIA PARA UN PROYECTO SUPABASE DE PRUEBAS.
-- NO EJECUTAR EN EL PROYECTO COMPARTIDO.
--
-- Crea solamente las tablas base requeridas por las tres propuestas P06-P10.
-- No crea usuarios de Auth ni inserta filas o datos personales.
-- Supabase debe proporcionar auth.users, auth.uid(), Storage, los roles
-- anon/authenticated/service_role/postgres y gen_random_uuid().
--
-- Orden previsto:
-- 1) este archivo;
-- 2) propuesta-auth-usuarios.sql;
-- 3) propuesta-perfil-almacenamiento-persona2.sql;
-- 4) propuesta-rls-persona2.sql.
--
-- Este no es un dump del proyecto completo y no incluye las tablas usadas por
-- P11-P16/P19 (moderacion_reportes, solicitudes_verificacion y recursos_laborales).

BEGIN;

DO $preflight$
DECLARE
  rol_faltante text;
BEGIN
  IF to_regclass('auth.users') IS NULL
    OR to_regprocedure('auth.uid()') IS NULL
    OR to_regclass('storage.buckets') IS NULL
    OR to_regclass('storage.objects') IS NULL
    OR to_regprocedure('storage.foldername(text)') IS NULL
  THEN
    RAISE EXCEPTION 'Este esquema requiere un proyecto Supabase con Auth y Storage inicializados.';
  END IF;

  IF to_regprocedure('gen_random_uuid()') IS NULL THEN
    RAISE EXCEPTION 'No esta disponible gen_random_uuid(); revise el proyecto Supabase antes de continuar.';
  END IF;

  FOREACH rol_faltante IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'postgres']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol_faltante) THEN
      RAISE EXCEPTION 'Falta el rol Supabase requerido: %.', rol_faltante;
    END IF;
  END LOOP;

  IF to_regclass('public.usuarios') IS NOT NULL
    OR to_regclass('public.empresas') IS NOT NULL
    OR to_regclass('public.vacantes') IS NOT NULL
    OR to_regclass('public.postulaciones') IS NOT NULL
    OR to_regclass('public.perfiles_candidatos') IS NOT NULL
    OR to_regclass('public.experiencias_laborales') IS NOT NULL
    OR to_regclass('public.estudios_candidatos') IS NOT NULL
    OR to_regclass('public.habilidades_candidatos') IS NOT NULL
    OR to_regclass('public.alertas_laborales') IS NOT NULL
  THEN
    RAISE EXCEPTION 'Ya existe una tabla base del modulo; use un proyecto de pruebas nuevo o revise el esquema antes de continuar.';
  END IF;
END;
$preflight$;

CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar NOT NULL,
  email varchar NOT NULL UNIQUE,
  password_hash varchar NOT NULL,
  rol varchar NOT NULL
    CHECK (rol IN ('Candidato/a', 'Empresa', 'Administración/a')),
  estado varchar NOT NULL DEFAULT 'Activo'
    CHECK (estado IN ('Activo', 'Inactivo', 'Suspendido')),
  telefono varchar,
  ubicacion varchar,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre_comercial varchar NOT NULL,
  razon_social varchar NOT NULL,
  nit varchar NOT NULL,
  sector varchar NOT NULL,
  tamano varchar DEFAULT '51-200 empleados',
  departamento varchar NOT NULL,
  municipio varchar NOT NULL,
  direccion text,
  contacto_email varchar NOT NULL,
  telefono varchar NOT NULL,
  sitio_web varchar,
  descripcion text,
  estado_verificacion varchar NOT NULL DEFAULT 'Pendiente'
    CHECK (estado_verificacion IN ('Verificada', 'Pendiente', 'Suspendida')),
  calificacion_promedio numeric DEFAULT 0.00,
  total_resenas integer DEFAULT 0,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE public.vacantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo varchar NOT NULL,
  sector varchar NOT NULL,
  departamento varchar NOT NULL,
  municipio varchar NOT NULL,
  modalidad varchar NOT NULL
    CHECK (modalidad IN ('Presencial', 'Híbrido', 'Remoto')),
  tipo_contrato varchar NOT NULL
    CHECK (tipo_contrato IN ('Tiempo completo', 'Medio tiempo', 'Servicios profesionales')),
  salario_min numeric NOT NULL,
  salario_max numeric NOT NULL,
  plazas integer DEFAULT 1,
  fecha_limite date,
  estado varchar NOT NULL DEFAULT 'Pendiente'
    CHECK (estado IN ('Pendiente', 'Activa', 'Inactiva')),
  descripcion text NOT NULL,
  funciones text[],
  requisitos text[],
  beneficios text[],
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE public.perfiles_candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid UNIQUE REFERENCES public.usuarios(id) ON DELETE CASCADE,
  titulo_profesional varchar,
  resumen_laboral text,
  curriculum_nombre varchar,
  curriculum_url text,
  fecha_nacimiento date,
  porcentaje_perfil integer DEFAULT 100,
  actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE public.experiencias_laborales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid REFERENCES public.perfiles_candidatos(id) ON DELETE CASCADE,
  puesto varchar NOT NULL,
  empresa varchar NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date,
  es_trabajo_actual boolean DEFAULT false,
  descripcion text,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE public.estudios_candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid REFERENCES public.perfiles_candidatos(id) ON DELETE CASCADE,
  carrera_programa varchar NOT NULL,
  institucion varchar NOT NULL,
  nivel_academico varchar NOT NULL,
  anio_inicio integer NOT NULL,
  anio_fin integer,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE public.habilidades_candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid REFERENCES public.perfiles_candidatos(id) ON DELETE CASCADE,
  habilidad varchar NOT NULL,
  nivel_dominio varchar DEFAULT 'Intermedio',
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE public.alertas_laborales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid REFERENCES public.perfiles_candidatos(id) ON DELETE CASCADE,
  nombre_alerta varchar NOT NULL,
  sector varchar NOT NULL,
  modalidad varchar,
  salario_minimo numeric,
  frecuencia varchar DEFAULT 'Semanal',
  activa boolean DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE public.postulaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacante_id uuid REFERENCES public.vacantes(id) ON DELETE CASCADE,
  candidato_id uuid REFERENCES public.perfiles_candidatos(id) ON DELETE CASCADE,
  curriculum_url text NOT NULL,
  carta_presentacion text,
  estado varchar NOT NULL DEFAULT 'Nueva'
    CHECK (estado IN ('Nueva', 'En revisión', 'Entrevista', 'Contratada', 'Rechazada')),
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiencias_laborales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudios_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habilidades_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_laborales ENABLE ROW LEVEL SECURITY;

COMMIT;
