-- Ejecutar en el SQL Editor de la misma base donde existe login_prueba.
-- pgcrypto puede estar instalado en public o en extensions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.registro_prueba(
  p_nombre text,
  p_email text,
  p_password text,
  p_rol text,
  p_telefono text DEFAULT NULL,
  p_ubicacion text DEFAULT NULL
)
RETURNS SETOF public.usuarios
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  datos public.usuarios;
BEGIN
  IF p_nombre IS NULL OR length(trim(p_nombre)) NOT BETWEEN 3 AND 80
     OR p_email IS NULL OR trim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR p_password IS NULL OR length(p_password) < 6 OR octet_length(p_password) > 72
     OR p_rol IS NULL OR p_rol NOT IN ('candidato', 'empresa') THEN
    RAISE EXCEPTION 'Datos de registro inválidos' USING ERRCODE = '22023';
  END IF;

  -- Serializa registros concurrentes del mismo correo en esta función.
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(trim(p_email)), 0));
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE lower(email) = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'Ya existe una cuenta con ese correo' USING ERRCODE = '23505';
  END IF;

  -- Conserva los tipos reales de rol y estado, incluidos posibles enums.
  datos := jsonb_populate_record(NULL::public.usuarios, jsonb_build_object(
    'rol', CASE WHEN p_rol = 'candidato' THEN 'Candidato/a' ELSE 'Empresa' END,
    'estado', 'Activo'
  ));
  RETURN QUERY
    INSERT INTO public.usuarios (nombre, email, password_hash, rol, estado, telefono, ubicacion)
    VALUES (trim(p_nombre), lower(trim(p_email)), crypt(p_password, gen_salt('bf', 12)),
            datos.rol, datos.estado, p_telefono, p_ubicacion)
    RETURNING *;
END;
$$;

-- Esta función solo la llama el servidor; la clave de servicio nunca va al navegador.
REVOKE ALL ON FUNCTION public.registro_prueba(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registro_prueba(text, text, text, text, text, text) TO service_role;
