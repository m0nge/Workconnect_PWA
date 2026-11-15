-- PROPUESTA PARA REVISION. NO EJECUTAR EN LA BASE COMPARTIDA.
--
-- Requiere que propuesta-auth-usuarios.sql y
-- propuesta-perfil-almacenamiento-persona2.sql hayan sido revisados/aplicados.
-- Crea acceso directo limitado por auth.uid(); service_role queda reservado
-- para endpoints de servidor verificados y tareas administrativas.
--
-- No habilita acceso directo de anon/authenticated a tablas administrativas.
-- Las politicas son aditivas en PostgreSQL: revisar que no se agreguen politicas
-- permisivas mas amplias al mismo tiempo.

BEGIN;

DO $preflight$
DECLARE
  requisito record;
BEGIN
  FOR requisito IN
    SELECT * FROM (VALUES
      ('usuarios', 'id'),
      ('usuarios', 'auth_uid'),
      ('usuarios', 'nombre'),
      ('usuarios', 'email'),
      ('usuarios', 'rol'),
      ('usuarios', 'estado'),
      ('empresas', 'id'),
      ('empresas', 'usuario_id'),
      ('empresas', 'nombre_comercial'),
      ('empresas', 'razon_social'),
      ('empresas', 'nit'),
      ('empresas', 'sector'),
      ('empresas', 'departamento'),
      ('empresas', 'municipio'),
      ('empresas', 'direccion'),
      ('empresas', 'contacto_email'),
      ('empresas', 'telefono'),
      ('empresas', 'estado_verificacion'),
      ('vacantes', 'id'),
      ('vacantes', 'empresa_id'),
      ('vacantes', 'titulo'),
      ('vacantes', 'sector'),
      ('vacantes', 'departamento'),
      ('vacantes', 'municipio'),
      ('vacantes', 'modalidad'),
      ('vacantes', 'tipo_contrato'),
      ('vacantes', 'salario_min'),
      ('vacantes', 'salario_max'),
      ('vacantes', 'descripcion'),
      ('vacantes', 'estado'),
      ('postulaciones', 'id'),
      ('postulaciones', 'candidato_id'),
      ('postulaciones', 'vacante_id'),
      ('postulaciones', 'estado'),
      ('postulaciones', 'curriculum_url'),
      ('postulaciones', 'creado_en'),
      ('perfiles_candidatos', 'id'),
      ('perfiles_candidatos', 'usuario_id'),
      ('perfiles_candidatos', 'titulo_profesional'),
      ('perfiles_candidatos', 'resumen_laboral'),
      ('perfiles_candidatos', 'curriculum_nombre'),
      ('perfiles_candidatos', 'curriculum_url'),
      ('perfiles_candidatos', 'fecha_nacimiento'),
      ('experiencias_laborales', 'id'),
      ('experiencias_laborales', 'candidato_id'),
      ('experiencias_laborales', 'puesto'),
      ('experiencias_laborales', 'empresa'),
      ('experiencias_laborales', 'fecha_inicio'),
      ('experiencias_laborales', 'fecha_fin'),
      ('experiencias_laborales', 'es_trabajo_actual'),
      ('experiencias_laborales', 'descripcion'),
      ('estudios_candidatos', 'id'),
      ('estudios_candidatos', 'candidato_id'),
      ('estudios_candidatos', 'carrera_programa'),
      ('estudios_candidatos', 'institucion'),
      ('estudios_candidatos', 'nivel_academico'),
      ('estudios_candidatos', 'anio_inicio'),
      ('estudios_candidatos', 'anio_fin'),
      ('habilidades_candidatos', 'id'),
      ('habilidades_candidatos', 'candidato_id'),
      ('habilidades_candidatos', 'habilidad'),
      ('habilidades_candidatos', 'nivel_dominio'),
      ('alertas_laborales', 'id'),
      ('alertas_laborales', 'candidato_id'),
      ('alertas_laborales', 'nombre_alerta'),
      ('alertas_laborales', 'sector'),
      ('alertas_laborales', 'modalidad'),
      ('alertas_laborales', 'salario_minimo'),
      ('alertas_laborales', 'frecuencia'),
      ('alertas_laborales', 'activa')
    ) AS columnas(tabla, columna)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = requisito.tabla
        AND column_name = requisito.columna
    ) THEN
      RAISE EXCEPTION 'Falta public.%.%; revise el esquema y el orden de las propuestas.',
        requisito.tabla, requisito.columna;
    END IF;
  END LOOP;

  FOR requisito IN
    SELECT * FROM (VALUES
      ('empresas'),
      ('vacantes'),
      ('postulaciones'),
      ('perfiles_candidatos'),
      ('experiencias_laborales'),
      ('estudios_candidatos'),
      ('habilidades_candidatos'),
      ('alertas_laborales')
    ) AS tablas(tabla)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = requisito.tabla
        AND column_name = 'id'
        AND column_default IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'public.%.id necesita un valor predeterminado para las inserciones del modulo.',
        requisito.tabla;
    END IF;
  END LOOP;

  IF to_regclass('storage.objects') IS NULL OR to_regclass('storage.buckets') IS NULL THEN
    RAISE EXCEPTION 'Supabase Storage no esta disponible; no aplique las politicas de objetos.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname IN (
      'workconnect_usuarios_select_propio',
      'workconnect_usuarios_update_propio',
      'workconnect_perfiles_select',
      'workconnect_perfiles_insert',
      'workconnect_perfiles_update',
      'workconnect_experiencias_select',
      'workconnect_experiencias_insert',
      'workconnect_experiencias_update',
      'workconnect_experiencias_delete',
      'workconnect_estudios_select',
      'workconnect_estudios_insert',
      'workconnect_estudios_update',
      'workconnect_estudios_delete',
      'workconnect_habilidades_select',
      'workconnect_habilidades_insert',
      'workconnect_habilidades_update',
      'workconnect_habilidades_delete',
      'workconnect_alertas_select',
      'workconnect_alertas_insert',
      'workconnect_alertas_update',
      'workconnect_alertas_delete',
      'workconnect_empresas_select_propia',
      'workconnect_empresas_insert_propia',
      'workconnect_empresas_update_propia',
      'workconnect_vacantes_select',
      'workconnect_vacantes_publica_select',
      'workconnect_vacantes_empresa_select',
      'workconnect_vacantes_insert_pendiente',
      'workconnect_vacantes_update_pendiente',
      'workconnect_postulaciones_select',
      'workconnect_postulaciones_insert_candidato',
      'workconnect_postulaciones_update_empresa',
      'workconnect_storage_cv_select',
      'workconnect_storage_cv_insert',
      'workconnect_storage_cv_update',
      'workconnect_storage_cv_delete',
      'workconnect_storage_logo_select',
      'workconnect_storage_logo_insert',
      'workconnect_storage_logo_update',
      'workconnect_storage_logo_delete'
    )
  ) THEN
    RAISE EXCEPTION 'Ya existe una politica propuesta; revise su expresion antes de continuar.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE (schemaname = 'public' AND tablename IN (
      'usuarios', 'empresas', 'vacantes', 'postulaciones',
      'perfiles_candidatos', 'experiencias_laborales',
      'estudios_candidatos', 'habilidades_candidatos', 'alertas_laborales'
    ))
    OR (schemaname = 'storage' AND tablename = 'objects')
  ) THEN
    RAISE EXCEPTION 'Se encontraron politicas RLS existentes; revise su alcance y combine las propuestas manualmente.';
  END IF;

  IF to_regprocedure('public.workconnect_usuario_id_actual()') IS NOT NULL
    OR to_regprocedure('public.workconnect_rol_actual()') IS NOT NULL
    OR to_regprocedure('public.workconnect_perfil_es_propio(uuid)') IS NOT NULL
    OR to_regprocedure('public.workconnect_empresa_puede_ver_usuario(uuid)') IS NOT NULL
    OR to_regprocedure('public.workconnect_empresa_puede_ver_perfil(uuid)') IS NOT NULL
    OR to_regprocedure('public.workconnect_empresa_puede_ver_cv(text)') IS NOT NULL
  THEN
    RAISE EXCEPTION 'Ya existe una funcion helper propuesta; revise su definicion antes de continuar.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'workconnect-curriculums' AND public IS false
  ) OR NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'workconnect-logos' AND public IS true
  ) THEN
    RAISE EXCEPTION 'Faltan los buckets propuestos o tienen visibilidad distinta; revise el script de almacenamiento.';
  END IF;
END;
$preflight$;

CREATE FUNCTION public.workconnect_usuario_id_actual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
  SELECT usuario.id
  FROM public.usuarios AS usuario
  WHERE usuario.auth_uid = auth.uid()
    AND usuario.estado = 'Activo'
  LIMIT 1
$function$;

CREATE FUNCTION public.workconnect_rol_actual()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
  SELECT usuario.rol
  FROM public.usuarios AS usuario
  WHERE usuario.auth_uid = auth.uid()
    AND usuario.estado = 'Activo'
  LIMIT 1
$function$;

CREATE FUNCTION public.workconnect_perfil_es_propio(id_perfil uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
  SELECT public.workconnect_rol_actual() = 'Candidato/a'
    AND EXISTS (
      SELECT 1
      FROM public.perfiles_candidatos AS perfil
      WHERE perfil.id = id_perfil
        AND perfil.usuario_id = public.workconnect_usuario_id_actual()
    )
$function$;

CREATE FUNCTION public.workconnect_empresa_puede_ver_usuario(id_usuario uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios AS empleador
    JOIN public.empresas AS empresa ON empresa.usuario_id = empleador.id
    JOIN public.vacantes AS vacante ON vacante.empresa_id = empresa.id
    JOIN public.postulaciones AS postulacion ON postulacion.vacante_id = vacante.id
    JOIN public.perfiles_candidatos AS perfil ON perfil.id = postulacion.candidato_id
    WHERE empleador.auth_uid = auth.uid()
      AND empleador.estado = 'Activo'
      AND empleador.rol = 'Empresa'
      AND perfil.usuario_id = id_usuario
  )
$function$;

CREATE FUNCTION public.workconnect_empresa_puede_ver_perfil(id_perfil uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios AS empleador
    JOIN public.empresas AS empresa ON empresa.usuario_id = empleador.id
    JOIN public.vacantes AS vacante ON vacante.empresa_id = empresa.id
    JOIN public.postulaciones AS postulacion ON postulacion.vacante_id = vacante.id
    WHERE empleador.auth_uid = auth.uid()
      AND empleador.estado = 'Activo'
      AND empleador.rol = 'Empresa'
      AND postulacion.candidato_id = id_perfil
  )
$function$;

CREATE FUNCTION public.workconnect_empresa_puede_ver_cv(auth_uid_candidato text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios AS candidato
    JOIN public.perfiles_candidatos AS perfil ON perfil.usuario_id = candidato.id
    JOIN public.postulaciones AS postulacion ON postulacion.candidato_id = perfil.id
    JOIN public.vacantes AS vacante ON vacante.id = postulacion.vacante_id
    JOIN public.empresas AS empresa ON empresa.id = vacante.empresa_id
    JOIN public.usuarios AS empleador ON empleador.id = empresa.usuario_id
    WHERE candidato.auth_uid::text = auth_uid_candidato
      AND empleador.auth_uid = auth.uid()
      AND empleador.estado = 'Activo'
      AND empleador.rol = 'Empresa'
  )
$function$;

ALTER FUNCTION public.workconnect_usuario_id_actual() OWNER TO postgres;
ALTER FUNCTION public.workconnect_rol_actual() OWNER TO postgres;
ALTER FUNCTION public.workconnect_perfil_es_propio(uuid) OWNER TO postgres;
ALTER FUNCTION public.workconnect_empresa_puede_ver_usuario(uuid) OWNER TO postgres;
ALTER FUNCTION public.workconnect_empresa_puede_ver_perfil(uuid) OWNER TO postgres;
ALTER FUNCTION public.workconnect_empresa_puede_ver_cv(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.workconnect_usuario_id_actual() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workconnect_rol_actual() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workconnect_perfil_es_propio(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workconnect_empresa_puede_ver_usuario(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workconnect_empresa_puede_ver_perfil(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workconnect_empresa_puede_ver_cv(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workconnect_usuario_id_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.workconnect_rol_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.workconnect_perfil_es_propio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workconnect_empresa_puede_ver_usuario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workconnect_empresa_puede_ver_perfil(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workconnect_empresa_puede_ver_cv(text) TO authenticated;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiencias_laborales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudios_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habilidades_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_laborales ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- usuarios: no se concede lectura de password_hash, auth_uid ni correo. El cliente
-- obtiene el correo de Auth; empleadores solo ven el nombre de quien postulo.
REVOKE ALL PRIVILEGES ON TABLE public.usuarios FROM PUBLIC, anon, authenticated;
REVOKE SELECT (auth_uid, email, password_hash, rol, estado)
  ON TABLE public.usuarios FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.usuarios TO service_role;
GRANT SELECT (id, nombre)
  ON TABLE public.usuarios TO authenticated;
GRANT UPDATE (nombre) ON TABLE public.usuarios TO authenticated;

CREATE POLICY workconnect_usuarios_select_propio
  ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    (auth_uid = auth.uid() AND id = public.workconnect_usuario_id_actual())
    OR public.workconnect_empresa_puede_ver_usuario(usuarios.id)
  );
CREATE POLICY workconnect_usuarios_update_propio
  ON public.usuarios
  FOR UPDATE TO authenticated
  USING (auth_uid = auth.uid() AND id = public.workconnect_usuario_id_actual())
  WITH CHECK (auth_uid = auth.uid() AND id = public.workconnect_usuario_id_actual());

-- Perfil candidato: los empleadores solo ven perfiles que postularon a sus vacantes.
-- fecha_nacimiento y usuario_id no se exponen al cliente; los empleadores solo
-- reciben los campos profesionales del perfil y el path privado del curriculo.
REVOKE ALL PRIVILEGES ON TABLE public.perfiles_candidatos FROM PUBLIC, anon, authenticated;
REVOKE SELECT (id, usuario_id, titulo_profesional, resumen_laboral,
               curriculum_nombre, curriculum_url, fecha_nacimiento,
               porcentaje_perfil, actualizado_en)
  ON TABLE public.perfiles_candidatos FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.perfiles_candidatos TO service_role;
GRANT SELECT (id, titulo_profesional, resumen_laboral, curriculum_nombre, curriculum_url)
  ON TABLE public.perfiles_candidatos TO authenticated;
GRANT INSERT (usuario_id, titulo_profesional, resumen_laboral, curriculum_nombre,
              curriculum_url)
  ON TABLE public.perfiles_candidatos TO authenticated;
GRANT UPDATE (titulo_profesional, resumen_laboral, curriculum_nombre,
              curriculum_url)
  ON TABLE public.perfiles_candidatos TO authenticated;

CREATE POLICY workconnect_perfiles_select
  ON public.perfiles_candidatos
  FOR SELECT TO authenticated
  USING (
    (usuario_id = public.workconnect_usuario_id_actual()
      AND public.workconnect_rol_actual() = 'Candidato/a')
    OR public.workconnect_empresa_puede_ver_perfil(perfiles_candidatos.id)
  );

CREATE POLICY workconnect_perfiles_insert
  ON public.perfiles_candidatos
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = public.workconnect_usuario_id_actual()
    AND public.workconnect_rol_actual() = 'Candidato/a'
  );

CREATE POLICY workconnect_perfiles_update
  ON public.perfiles_candidatos
  FOR UPDATE TO authenticated
  USING (
    usuario_id = public.workconnect_usuario_id_actual()
    AND public.workconnect_rol_actual() = 'Candidato/a'
  )
  WITH CHECK (
    usuario_id = public.workconnect_usuario_id_actual()
    AND public.workconnect_rol_actual() = 'Candidato/a'
  );

-- Experiencia, estudios y habilidades se ven por su propietario o por una
-- empresa con una postulacion asociada al perfil.
GRANT SELECT ON TABLE public.experiencias_laborales TO authenticated;
GRANT INSERT (candidato_id, puesto, empresa, fecha_inicio, fecha_fin,
              es_trabajo_actual, descripcion)
  ON TABLE public.experiencias_laborales TO authenticated;
GRANT UPDATE (puesto, empresa, fecha_inicio, fecha_fin, es_trabajo_actual, descripcion)
  ON TABLE public.experiencias_laborales TO authenticated;
GRANT DELETE ON TABLE public.experiencias_laborales TO authenticated;

CREATE POLICY workconnect_experiencias_select
  ON public.experiencias_laborales
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfiles_candidatos AS perfil
    WHERE perfil.id = experiencias_laborales.candidato_id
  ));
CREATE POLICY workconnect_experiencias_insert
  ON public.experiencias_laborales
  FOR INSERT TO authenticated
  WITH CHECK (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(experiencias_laborales.candidato_id)
  );
CREATE POLICY workconnect_experiencias_update
  ON public.experiencias_laborales
  FOR UPDATE TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(experiencias_laborales.candidato_id)
  )
  WITH CHECK (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(experiencias_laborales.candidato_id)
  );
CREATE POLICY workconnect_experiencias_delete
  ON public.experiencias_laborales
  FOR DELETE TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(experiencias_laborales.candidato_id)
  );

GRANT SELECT ON TABLE public.estudios_candidatos TO authenticated;
GRANT INSERT (candidato_id, carrera_programa, institucion, nivel_academico,
              anio_inicio, anio_fin)
  ON TABLE public.estudios_candidatos TO authenticated;
GRANT UPDATE (carrera_programa, institucion, nivel_academico, anio_inicio, anio_fin)
  ON TABLE public.estudios_candidatos TO authenticated;
GRANT DELETE ON TABLE public.estudios_candidatos TO authenticated;

CREATE POLICY workconnect_estudios_select
  ON public.estudios_candidatos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfiles_candidatos AS perfil
    WHERE perfil.id = estudios_candidatos.candidato_id
  ));
CREATE POLICY workconnect_estudios_insert
  ON public.estudios_candidatos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(estudios_candidatos.candidato_id)
  );
CREATE POLICY workconnect_estudios_update
  ON public.estudios_candidatos
  FOR UPDATE TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(estudios_candidatos.candidato_id)
  )
  WITH CHECK (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(estudios_candidatos.candidato_id)
  );
CREATE POLICY workconnect_estudios_delete
  ON public.estudios_candidatos
  FOR DELETE TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(estudios_candidatos.candidato_id)
  );

GRANT SELECT ON TABLE public.habilidades_candidatos TO authenticated;
GRANT INSERT (candidato_id, habilidad, nivel_dominio)
  ON TABLE public.habilidades_candidatos TO authenticated;
GRANT UPDATE (habilidad, nivel_dominio) ON TABLE public.habilidades_candidatos TO authenticated;
GRANT DELETE ON TABLE public.habilidades_candidatos TO authenticated;

CREATE POLICY workconnect_habilidades_select
  ON public.habilidades_candidatos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.perfiles_candidatos AS perfil
    WHERE perfil.id = habilidades_candidatos.candidato_id
  ));
CREATE POLICY workconnect_habilidades_insert
  ON public.habilidades_candidatos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(habilidades_candidatos.candidato_id)
  );
CREATE POLICY workconnect_habilidades_update
  ON public.habilidades_candidatos
  FOR UPDATE TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(habilidades_candidatos.candidato_id)
  )
  WITH CHECK (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(habilidades_candidatos.candidato_id)
  );
CREATE POLICY workconnect_habilidades_delete
  ON public.habilidades_candidatos
  FOR DELETE TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND public.workconnect_perfil_es_propio(habilidades_candidatos.candidato_id)
  );

GRANT SELECT ON TABLE public.alertas_laborales TO authenticated;
GRANT INSERT (candidato_id, nombre_alerta, sector, modalidad, salario_minimo,
              frecuencia, activa)
  ON TABLE public.alertas_laborales TO authenticated;
GRANT UPDATE (nombre_alerta, sector, modalidad, salario_minimo, frecuencia, activa)
  ON TABLE public.alertas_laborales TO authenticated;
GRANT DELETE ON TABLE public.alertas_laborales TO authenticated;
CREATE POLICY workconnect_alertas_select
  ON public.alertas_laborales FOR SELECT TO authenticated
  USING (
    public.workconnect_perfil_es_propio(alertas_laborales.candidato_id)
    AND public.workconnect_rol_actual() = 'Candidato/a'
  );
CREATE POLICY workconnect_alertas_insert
  ON public.alertas_laborales FOR INSERT TO authenticated
  WITH CHECK (
    public.workconnect_perfil_es_propio(alertas_laborales.candidato_id)
    AND public.workconnect_rol_actual() = 'Candidato/a'
  );
CREATE POLICY workconnect_alertas_update
  ON public.alertas_laborales FOR UPDATE TO authenticated
  USING (
    public.workconnect_perfil_es_propio(alertas_laborales.candidato_id)
    AND public.workconnect_rol_actual() = 'Candidato/a'
  )
  WITH CHECK (
    public.workconnect_perfil_es_propio(alertas_laborales.candidato_id)
    AND public.workconnect_rol_actual() = 'Candidato/a'
  );
CREATE POLICY workconnect_alertas_delete
  ON public.alertas_laborales FOR DELETE TO authenticated
  USING (
    public.workconnect_perfil_es_propio(alertas_laborales.candidato_id)
    AND public.workconnect_rol_actual() = 'Candidato/a'
  );

-- Empresa: solo crea registros propios pendientes. El estado de verificacion
-- no tiene privilegio UPDATE ni puede elevarse al insertar.
-- El REVOKE de tabla elimina grants generales; el REVOKE por columna limpia
-- grants antiguos de columnas, incluidos los otorgados a PUBLIC. service_role
-- se conserva para el servidor, que debera autorizar sus rutas por separado.
DO $restrict_update$
DECLARE
  tabla text;
  rol text;
  rol_sql text;
  columnas text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['empresas', 'postulaciones']
  LOOP
    SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO columnas
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = tabla;

    IF columnas IS NULL THEN
      RAISE EXCEPTION 'No se encontraron columnas en public.%; no se pueden limitar sus permisos.',
        tabla;
    END IF;

    FOREACH rol IN ARRAY ARRAY['PUBLIC', 'anon', 'authenticated']
    LOOP
      rol_sql := CASE WHEN rol = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(rol) END;
      EXECUTE format('REVOKE UPDATE ON TABLE public.%I FROM %s', tabla, rol_sql);
      EXECUTE format('REVOKE UPDATE (%s) ON TABLE public.%I FROM %s',
                     columnas, tabla, rol_sql);
    END LOOP;
  END LOOP;
END;
$restrict_update$;

GRANT SELECT ON TABLE public.empresas TO authenticated;
GRANT INSERT (usuario_id, nombre_comercial, razon_social, nit, sector, tamano,
              departamento, municipio, direccion, contacto_email, telefono,
              sitio_web, descripcion, estado_verificacion)
  ON TABLE public.empresas TO authenticated;
GRANT UPDATE (nombre_comercial, sector, tamano, departamento, municipio,
              direccion, contacto_email, telefono, sitio_web, descripcion)
  ON TABLE public.empresas TO authenticated;

CREATE POLICY workconnect_empresas_select_propia
  ON public.empresas FOR SELECT TO authenticated
  USING (
    usuario_id = public.workconnect_usuario_id_actual()
    AND public.workconnect_rol_actual() = 'Empresa'
  );
CREATE POLICY workconnect_empresas_insert_propia
  ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = public.workconnect_usuario_id_actual()
    AND public.workconnect_rol_actual() = 'Empresa'
    AND estado_verificacion = 'Pendiente'
  );
CREATE POLICY workconnect_empresas_update_propia
  ON public.empresas FOR UPDATE TO authenticated
  USING (
    usuario_id = public.workconnect_usuario_id_actual()
    AND public.workconnect_rol_actual() = 'Empresa'
  )
  WITH CHECK (
    usuario_id = public.workconnect_usuario_id_actual()
    AND public.workconnect_rol_actual() = 'Empresa'
  );

-- Las vacantes activas son publicas. Una empresa solo crea/edita las propias
-- mientras estan Pendientes; activar una vacante queda reservado a moderacion.
GRANT SELECT ON TABLE public.vacantes TO anon, authenticated;
GRANT INSERT (empresa_id, titulo, sector, departamento, municipio, modalidad,
              tipo_contrato, salario_min, salario_max, plazas, descripcion,
              funciones, requisitos, beneficios, estado)
  ON TABLE public.vacantes TO authenticated;
GRANT UPDATE (titulo, sector, departamento, municipio, modalidad, tipo_contrato,
              salario_min, salario_max, plazas, descripcion, funciones, requisitos,
              beneficios)
  ON TABLE public.vacantes TO authenticated;

CREATE POLICY workconnect_vacantes_publica_select
  ON public.vacantes FOR SELECT TO anon, authenticated
  USING (estado = 'Activa');
CREATE POLICY workconnect_vacantes_empresa_select
  ON public.vacantes FOR SELECT TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Empresa'
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.id = vacantes.empresa_id
        AND empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  );
CREATE POLICY workconnect_vacantes_insert_pendiente
  ON public.vacantes FOR INSERT TO authenticated
  WITH CHECK (
    public.workconnect_rol_actual() = 'Empresa'
    AND estado = 'Pendiente'
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.id = vacantes.empresa_id
        AND empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  );
CREATE POLICY workconnect_vacantes_update_pendiente
  ON public.vacantes FOR UPDATE TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Empresa'
    AND estado = 'Pendiente'
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.id = vacantes.empresa_id
        AND empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  )
  WITH CHECK (
    public.workconnect_rol_actual() = 'Empresa'
    AND estado = 'Pendiente'
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.id = vacantes.empresa_id
        AND empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  );

-- Postulaciones: el candidato solo crea una postulacion propia, a una vacante
-- activa, con un path de curriculo dentro de su carpeta privada.
GRANT SELECT ON TABLE public.postulaciones TO authenticated;
GRANT INSERT (candidato_id, vacante_id, curriculum_url, estado)
  ON TABLE public.postulaciones TO authenticated;
GRANT UPDATE (estado) ON TABLE public.postulaciones TO authenticated;

-- Asegurar que grants heredados u otorgados a PUBLIC no permitan cambiar
-- el estado de verificacion ni re-asignar una postulacion a otro candidato.
DO $verify_update_privileges$
DECLARE
  rol text;
BEGIN
  FOREACH rol IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF has_table_privilege(rol, 'public.empresas', 'UPDATE')
      OR has_column_privilege(rol, 'public.empresas', 'estado_verificacion', 'UPDATE')
    THEN
      RAISE EXCEPTION 'El rol % conserva UPDATE sobre empresas o estado_verificacion.',
        rol;
    END IF;

    IF has_table_privilege(rol, 'public.postulaciones', 'UPDATE')
      OR has_column_privilege(rol, 'public.postulaciones', 'candidato_id', 'UPDATE')
    THEN
      RAISE EXCEPTION 'El rol % conserva UPDATE sobre postulaciones o candidato_id.',
        rol;
    END IF;
  END LOOP;

  IF NOT has_column_privilege('authenticated', 'public.postulaciones', 'estado', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated debe conservar UPDATE solo sobre postulaciones.estado.';
  END IF;
END;
$verify_update_privileges$;

CREATE POLICY workconnect_postulaciones_select
  ON public.postulaciones FOR SELECT TO authenticated
  USING (
    (
      public.workconnect_rol_actual() = 'Candidato/a'
      AND public.workconnect_perfil_es_propio(postulaciones.candidato_id)
    )
    OR (
      public.workconnect_rol_actual() = 'Empresa'
      AND EXISTS (
        SELECT 1
        FROM public.vacantes AS vacante
        JOIN public.empresas AS empresa ON empresa.id = vacante.empresa_id
        WHERE vacante.id = postulaciones.vacante_id
          AND empresa.usuario_id = public.workconnect_usuario_id_actual()
      )
    )
  );
CREATE POLICY workconnect_postulaciones_insert_candidato
  ON public.postulaciones FOR INSERT TO authenticated
  WITH CHECK (
    public.workconnect_rol_actual() = 'Candidato/a'
    AND estado = 'Nueva'
    AND curriculum_url LIKE auth.uid()::text || '/%'
    AND public.workconnect_perfil_es_propio(postulaciones.candidato_id)
    AND EXISTS (
      SELECT 1 FROM public.vacantes AS vacante
      WHERE vacante.id = postulaciones.vacante_id
        AND vacante.estado = 'Activa'
    )
  );
CREATE POLICY workconnect_postulaciones_update_empresa
  ON public.postulaciones FOR UPDATE TO authenticated
  USING (
    public.workconnect_rol_actual() = 'Empresa'
    AND EXISTS (
      SELECT 1
      FROM public.vacantes AS vacante
      JOIN public.empresas AS empresa ON empresa.id = vacante.empresa_id
      WHERE vacante.id = postulaciones.vacante_id
        AND empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  )
  WITH CHECK (
    public.workconnect_rol_actual() = 'Empresa'
    AND EXISTS (
      SELECT 1
      FROM public.vacantes AS vacante
      JOIN public.empresas AS empresa ON empresa.id = vacante.empresa_id
      WHERE vacante.id = postulaciones.vacante_id
        AND empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  );

-- Storage privado. El empleador puede leer el CV de una persona que postulo
-- a una de sus vacantes; solo el propietario puede reemplazar o borrar archivos.
CREATE POLICY workconnect_storage_cv_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'workconnect-curriculums'
    AND (
      (
        public.workconnect_rol_actual() = 'Candidato/a'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      OR (
        public.workconnect_rol_actual() = 'Empresa'
        AND public.workconnect_empresa_puede_ver_cv((storage.foldername(name))[1])
      )
    )
  );
CREATE POLICY workconnect_storage_cv_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'workconnect-curriculums'
    AND public.workconnect_rol_actual() = 'Candidato/a'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY workconnect_storage_cv_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'workconnect-curriculums'
    AND public.workconnect_rol_actual() = 'Candidato/a'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'workconnect-curriculums'
    AND public.workconnect_rol_actual() = 'Candidato/a'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY workconnect_storage_cv_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'workconnect-curriculums'
    AND public.workconnect_rol_actual() = 'Candidato/a'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY workconnect_storage_logo_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'workconnect-logos'
    AND public.workconnect_rol_actual() = 'Empresa'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  );
CREATE POLICY workconnect_storage_logo_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'workconnect-logos'
    AND public.workconnect_rol_actual() = 'Empresa'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  );
CREATE POLICY workconnect_storage_logo_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'workconnect-logos'
    AND public.workconnect_rol_actual() = 'Empresa'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  )
  WITH CHECK (
    bucket_id = 'workconnect-logos'
    AND public.workconnect_rol_actual() = 'Empresa'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  );
CREATE POLICY workconnect_storage_logo_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'workconnect-logos'
    AND public.workconnect_rol_actual() = 'Empresa'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.empresas AS empresa
      WHERE empresa.usuario_id = public.workconnect_usuario_id_actual()
    )
  );

COMMIT;
