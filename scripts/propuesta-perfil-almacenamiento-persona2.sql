-- PROPUESTA PARA REVISION. NO EJECUTAR EN LA BASE COMPARTIDA.
--
-- Reutiliza public.estudios_candidatos, public.habilidades_candidatos y
-- public.alertas_laborales. Este archivo no crea ni modifica tablas public.
--
-- Orden previsto: propuesta-auth-usuarios.sql, este script y finalmente
-- propuesta-rls-persona2.sql. El ultimo script agrega las politicas de estas tablas.
--
-- Las alertas guardan preferencias; no envian correos. Para eso hace falta un
-- proceso de notificaciones (trabajo programado/proveedor) aun no presente.
-- Los curriculums se guardan privados. Su path se guarda en curriculum_url; no se
-- deben guardar URL firmadas que expiran. Los logos se consideran publicos y usan
-- el path fijo auth.uid()/logo, sin guardar una URL.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.perfiles_candidatos') IS NULL THEN
    RAISE EXCEPTION 'Falta public.perfiles_candidatos; revise el nombre real de la tabla.';
  END IF;

  IF to_regclass('public.estudios_candidatos') IS NULL
    OR to_regclass('public.habilidades_candidatos') IS NULL
    OR to_regclass('public.alertas_laborales') IS NULL
  THEN
    RAISE EXCEPTION 'Falta una tabla existente de estudios, habilidades o alertas; no se crearan tablas duplicadas.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('estudios_candidatos', 'candidato_id'),
      ('estudios_candidatos', 'carrera_programa'),
      ('estudios_candidatos', 'institucion'),
      ('estudios_candidatos', 'nivel_academico'),
      ('estudios_candidatos', 'anio_inicio'),
      ('estudios_candidatos', 'anio_fin'),
      ('habilidades_candidatos', 'candidato_id'),
      ('habilidades_candidatos', 'habilidad'),
      ('habilidades_candidatos', 'nivel_dominio'),
      ('alertas_laborales', 'candidato_id'),
      ('alertas_laborales', 'nombre_alerta'),
      ('alertas_laborales', 'sector'),
      ('alertas_laborales', 'modalidad'),
      ('alertas_laborales', 'salario_minimo'),
      ('alertas_laborales', 'frecuencia'),
      ('alertas_laborales', 'activa')
    ) AS esperadas(tabla, columna)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS columna_real
      WHERE columna_real.table_schema = 'public'
        AND columna_real.table_name = esperadas.tabla
        AND columna_real.column_name = esperadas.columna
    )
  ) THEN
    RAISE EXCEPTION 'Las columnas de las tablas existentes no coinciden con la propuesta; revise el diagnostico antes de continuar.';
  END IF;

  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE EXCEPTION 'Supabase Storage no esta disponible; no cree los buckets propuestos.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'workconnect-curriculums'
      AND (
        public IS DISTINCT FROM false
        OR file_size_limit IS DISTINCT FROM 5242880
        OR allowed_mime_types IS DISTINCT FROM ARRAY['application/pdf']::text[]
      )
  ) OR EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'workconnect-logos'
      AND (
        public IS DISTINCT FROM true
        OR file_size_limit IS DISTINCT FROM 2097152
        OR allowed_mime_types IS DISTINCT FROM ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
      )
  ) OR EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE (name = 'WorkConnect curriculums' AND id <> 'workconnect-curriculums')
       OR (name = 'WorkConnect logos' AND id <> 'workconnect-logos')
  ) THEN
    RAISE EXCEPTION 'Un bucket propuesto ya existe con configuracion diferente; revise Storage.';
  END IF;
END;
$preflight$;

ALTER TABLE public.estudios_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habilidades_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_laborales ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'workconnect-curriculums',
    'WorkConnect curriculums',
    false,
    5242880,
    ARRAY['application/pdf']::text[]
  ),
  (
    'workconnect-logos',
    'WorkConnect logos',
    true,
    2097152,
    ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
