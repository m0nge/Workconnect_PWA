-- PROPUESTA PARA REVISION. NO EJECUTAR EN LA BASE COMPARTIDA.
--
-- Basada en scripts/diagnostico-persona2.sql y sus resultados:
-- - public.usuarios.id conserva su identidad y sus relaciones existentes.
-- - public.usuarios.email es UNIQUE; rol admite Candidato/a, Empresa y Administración/a.
-- - password_hash es NOT NULL; no se usara para contrasenas nuevas.
-- - No se encontraron triggers propios en auth.users.
--
-- Este script solo crea la relacion Auth -> usuarios. No vincula cuentas antiguas
-- por correo, no crea perfiles candidatos/empresas y no crea politicas RLS.
-- Revisar antes de ejecutar, junto con propuesta-perfil-almacenamiento-persona2.sql
-- y propuesta-rls-persona2.sql.

BEGIN;

DO $preflight$
DECLARE
  definicion_rol text;
BEGIN
  IF to_regclass('public.usuarios') IS NULL THEN
    RAISE EXCEPTION 'Falta public.usuarios; detenga la migracion.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'password_hash'
  ) THEN
    RAISE EXCEPTION 'Falta usuarios.password_hash; revise el esquema.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'id'
      AND column_default IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'usuarios.id necesita un valor UUID predeterminado para preservar las filas y relaciones existentes.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS indice
    JOIN pg_attribute AS columna
      ON columna.attrelid = indice.indrelid
      AND columna.attnum = indice.indkey[0]
    WHERE indice.indrelid = 'public.usuarios'::regclass
      AND indice.indisunique
      AND indice.indisvalid
      AND indice.indpred IS NULL
      AND indice.indnkeyatts = 1
      AND columna.attname = 'email'
  ) THEN
    RAISE EXCEPTION 'usuarios.email necesita una restriccion o indice UNIQUE individual antes de habilitar registros Auth.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
      AND column_name = 'auth_uid'
  ) THEN
    RAISE EXCEPTION 'usuarios.auth_uid ya existe; revise su tipo, FK e indice antes de continuar.';
  END IF;

  SELECT string_agg(pg_get_constraintdef(oid, true), '; ')
  INTO definicion_rol
  FROM pg_constraint
  WHERE conrelid = 'public.usuarios'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid, true) ILIKE '%rol%';

  IF definicion_rol IS NULL
    OR definicion_rol NOT ILIKE '%Candidato/a%'
    OR definicion_rol NOT ILIKE '%Empresa%'
    OR definicion_rol NOT ILIKE '%Administración/a%'
  THEN
    RAISE EXCEPTION 'El CHECK de usuarios.rol no coincide con los valores confirmados en el diagnostico.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger AS trg
    JOIN pg_class AS tabla ON tabla.oid = trg.tgrelid
    JOIN pg_namespace AS esquema ON esquema.oid = tabla.relnamespace
    WHERE NOT trg.tgisinternal
      AND (
        (esquema.nspname = 'auth' AND tabla.relname = 'users')
        OR (esquema.nspname = 'public' AND tabla.relname = 'usuarios')
      )
  ) THEN
    RAISE EXCEPTION 'auth.users o public.usuarios ya tiene triggers; revise su finalidad y adapte la propuesta.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.usuarios'::regclass
      AND conname = 'usuarios_auth_uid_fkey'
  ) OR to_regprocedure('public.workconnect_profile_after_auth_signup()') IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe parte de esta propuesta; revise el esquema antes de continuar.';
  END IF;
END;
$preflight$;

-- Se conserva usuarios.id porque otras tablas ya lo referencian.
-- auth_uid es el vinculo univoco a auth.users.id.
ALTER TABLE public.usuarios
  ADD COLUMN auth_uid uuid;

ALTER TABLE public.usuarios
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_auth_uid_fkey
  FOREIGN KEY (auth_uid)
  REFERENCES auth.users (id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX usuarios_auth_uid_uidx
  ON public.usuarios (auth_uid)
  WHERE auth_uid IS NOT NULL;

CREATE FUNCTION public.workconnect_profile_after_auth_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
DECLARE
  rol_solicitado text;
  rol_guardado text;
  nombre_usuario text;
BEGIN
  -- Metadatos de signup no son confiables: solo se aceptan estos dos roles,
  -- que corresponden al formulario principal actual.
  rol_solicitado := lower(trim(coalesce(NEW.raw_user_meta_data ->> 'rol', '')));
  nombre_usuario := trim(coalesce(
    NEW.raw_user_meta_data ->> 'nombre',
    NEW.raw_user_meta_data ->> 'full_name',
    ''
  ));

  IF rol_solicitado NOT IN ('candidato', 'empresa') THEN
    RAISE EXCEPTION 'No se pudo completar el registro. Verifique la informacion o contacte con soporte.';
  END IF;

  IF NEW.email IS NULL
    OR char_length(NEW.email) > 120
    OR char_length(nombre_usuario) NOT BETWEEN 3 AND 80
  THEN
    RAISE EXCEPTION 'No se pudo completar el registro. Verifique la informacion o contacte con soporte.';
  END IF;

  rol_guardado := CASE rol_solicitado
    WHEN 'candidato' THEN 'Candidato/a'
    WHEN 'empresa' THEN 'Empresa'
  END;

  -- Una fila anterior nunca se reclama automaticamente por coincidencia de correo.
  -- Su vinculacion requiere una verificacion separada de control de la cuenta.
  IF EXISTS (
    SELECT 1
    FROM public.usuarios AS usuario
    WHERE lower(usuario.email) = lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'No se pudo completar el registro. Verifique la informacion o contacte con soporte.';
  END IF;

  INSERT INTO public.usuarios (
    auth_uid,
    nombre,
    email,
    password_hash,
    rol,
    estado
  )
  VALUES (
    NEW.id,
    nombre_usuario,
    lower(NEW.email),
    NULL,
    rol_guardado,
    'Activo'
  );

  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.workconnect_profile_after_auth_signup() OWNER TO postgres;

REVOKE ALL
  ON FUNCTION public.workconnect_profile_after_auth_signup()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER workconnect_profile_after_auth_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.workconnect_profile_after_auth_signup();

COMMIT;
