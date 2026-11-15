-- Inventario de solo lectura para revisar los prerequisitos de P06 a P10.
-- Ejecutar en Supabase SQL Editor solo para consultar metadatos; no modifica objetos ni datos.

-- Columnas, tipos, nulabilidad y valores por defecto.
SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'usuarios',
    'empresas',
    'vacantes',
    'postulaciones',
    'perfiles_candidato',
    'experiencias_laborales',
    'estudios',
    'habilidades',
    'alertas_empleo'
  )
ORDER BY table_name, ordinal_position;

-- Llaves primarias, foráneas, restricciones UNIQUE y CHECK de las tablas existentes.
SELECT
  tabla.relname AS tabla,
  restriccion.conname AS nombre,
  CASE restriccion.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    ELSE restriccion.contype::text
  END AS tipo,
  pg_get_constraintdef(restriccion.oid, true) AS definicion
FROM pg_constraint AS restriccion
JOIN pg_class AS tabla ON tabla.oid = restriccion.conrelid
JOIN pg_namespace AS esquema ON esquema.oid = tabla.relnamespace
WHERE esquema.nspname = 'public'
  AND tabla.relname IN ('usuarios', 'empresas', 'vacantes', 'postulaciones')
ORDER BY tabla.relname, tipo, restriccion.conname;

-- Estado de RLS y FORCE ROW LEVEL SECURITY en las tablas del módulo.
SELECT
  esquema.nspname AS esquema,
  tabla.relname AS tabla,
  tabla.relrowsecurity AS rls_habilitado,
  tabla.relforcerowsecurity AS rls_forzado
FROM pg_class AS tabla
JOIN pg_namespace AS esquema ON esquema.oid = tabla.relnamespace
WHERE esquema.nspname = 'public'
  AND tabla.relkind IN ('r', 'p')
  AND tabla.relname IN (
    'usuarios',
    'empresas',
    'vacantes',
    'postulaciones',
    'perfiles_candidato',
    'experiencias_laborales',
    'estudios',
    'habilidades',
    'alertas_empleo'
  )
ORDER BY tabla.relname;

-- Políticas RLS existentes para las tablas del módulo.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND (
    tablename IN (
      'usuarios',
      'empresas',
      'vacantes',
      'postulaciones',
      'perfiles_candidato',
      'experiencias_laborales',
      'estudios',
      'habilidades',
      'alertas_empleo',
      'objects'
    )
  )
ORDER BY schemaname, tablename, policyname;

-- Funciones y procedimientos del esquema public, sin mostrar su código fuente.
SELECT
  esquema.nspname AS esquema,
  rutina.proname AS nombre,
  pg_get_function_identity_arguments(rutina.oid) AS argumentos,
  pg_get_function_result(rutina.oid) AS tipo_retorno,
  lenguaje.lanname AS lenguaje,
  rutina.prosecdef AS security_definer
FROM pg_proc AS rutina
JOIN pg_namespace AS esquema ON esquema.oid = rutina.pronamespace
JOIN pg_language AS lenguaje ON lenguaje.oid = rutina.prolang
WHERE esquema.nspname = 'public'
  AND rutina.prokind IN ('f', 'p')
ORDER BY rutina.proname, argumentos;

-- Triggers definidos sobre tablas public, sin mostrar código fuente de funciones.
SELECT
  tabla.relname AS tabla,
  trg.tgname AS nombre,
  procedimiento.proname AS funcion,
  pg_get_triggerdef(trg.oid, true) AS definicion
FROM pg_trigger AS trg
JOIN pg_class AS tabla ON tabla.oid = trg.tgrelid
JOIN pg_namespace AS esquema ON esquema.oid = tabla.relnamespace
JOIN pg_proc AS procedimiento ON procedimiento.oid = trg.tgfoid
WHERE NOT trg.tgisinternal
  AND (
    (
      esquema.nspname = 'public'
      AND tabla.relname IN ('usuarios', 'empresas', 'vacantes', 'postulaciones')
    )
    OR (esquema.nspname = 'auth' AND tabla.relname = 'users')
  )
ORDER BY tabla.relname, trg.tgname;

-- Buckets y límites de almacenamiento; no consulta archivos ni sus metadatos.
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY name;
