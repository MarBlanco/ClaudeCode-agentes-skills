---
name: data-modeling-migrations
description: Modelar datos relacionales y cambiar el esquema sin romper nada - entidades e invariantes, claves, tipos, restricciones, índices por patrón de consulta, migraciones reversibles o compatibles hacia atrás (expand/contract), backfills seguros, bloqueos y pruebas en base efímera. Usar al crear tablas, cambiar columnas, escribir migraciones o planificar cambios de esquema en PostgreSQL u otras bases relacionales. Complementa la skill supabase-postgres-best-practices (rendimiento, RLS, SQL).
---

# Modelado de datos y migraciones

El esquema es la última línea de defensa de los datos: que la base haga cumplir los invariantes. Los cambios de esquema son riesgo **alto** en `harness-plan` (gate G8).

## Modelar

1. **Entidades e invariantes primero.** Qué debe ser siempre verdad (único, obligatorio, rango, relación). Esos invariantes se expresan como restricciones: `NOT NULL`, `UNIQUE`, `CHECK`, `FOREIGN KEY`, no solo como código de aplicación.
2. **Claves.** Clave sustituta estable (`uuid` o identidad) más claves naturales con `UNIQUE`. En multi-tenant, el tenant forma parte de las claves y los índices (`saas-architecture`).
3. **Tipos.** Fechas `timestamptz` en UTC; dinero como entero de la unidad mínima (o `numeric` con escala fija), nunca flotante; texto sin límites artificiales salvo regla de negocio; enums solo si el conjunto es estable, si no tabla de referencia; `jsonb` para datos realmente flexibles, no para evitar modelar.
4. **Normalizar** hasta tercera forma normal y desnormalizar solo con medición.
5. **Índices** por patrón de consulta real (incluir las claves foráneas); revisar planes con `EXPLAIN (ANALYZE)`. Reglas de rendimiento, RLS y SQL en `supabase-postgres-best-practices`.
6. Columnas de auditoría (`created_at`, `updated_at`, actor) donde haga falta trazabilidad; borrado lógico solo si hay requisito (complica unicidad e índices).

## Migrar

- **Una intención por migración**, con nombre descriptivo. Una migración ya versionada **no se edita** (el guard lo impide): se crea otra.
- **Compatibilidad hacia atrás** (expand/contract) para cualquier cambio que el código en ejecución pueda ver:
  1. *Expandir*: agregar columna/tabla nueva (nullable o con valor por defecto constante).
  2. *Doble escritura / backfill* en lotes, reanudable y con límite de tiempo por lote.
  3. *Cambiar lecturas* al nuevo campo.
  4. *Restringir*: `CHECK` con `ADD CONSTRAINT ... NOT VALID` y luego `VALIDATE CONSTRAINT`. Para `NOT NULL` en PostgreSQL ≤ 17: `ADD CONSTRAINT c CHECK (col IS NOT NULL) NOT VALID` → `VALIDATE CONSTRAINT c` → `ALTER COLUMN col SET NOT NULL` (desde PG 12 no reescanea la tabla si el CHECK validado lo prueba) → `DROP CONSTRAINT c`. (`NOT NULL ... NOT VALID` directo existe solo desde PG 18; comprobar la versión del proyecto.)
  5. *Contraer*: borrar lo viejo en un despliegue posterior.
- **Seguridad de bloqueos** (PostgreSQL): `CREATE INDEX CONCURRENTLY` (fuera de una transacción), `ADD COLUMN` con valor por defecto constante es instantáneo en versiones actuales pero un `DEFAULT` volátil o la mayoría de los cambios de tipo reescriben la tabla (algunos no, p. ej. ampliar un `varchar` o pasar de `varchar(n)` a `text`; comprobarlo en la documentación de la versión); fijar `lock_timeout` y `statement_timeout` en migraciones; evitar transacciones largas.
- **Reversión**: cada migración documenta su vuelta atrás; si no es reversible (borrado de datos), exige respaldo previo y autorización del usuario.
- **Políticas RLS** forman parte del esquema y se migran y prueban como tal.

## Verificar (G8)

1. Aplicar todas las migraciones desde cero en una **base local o efímera** y sobre una copia con datos de prueba; nunca primero en producción.
2. Para Django: `makemigrations --check`; para Supabase CLI: `supabase db diff`/`db reset` en local; el equivalente de la herramienta del proyecto.
3. Pruebas de RLS y de restricciones (qué debe rechazar la base).
4. Probar el código viejo y el nuevo contra el esquema intermedio cuando hay despliegue gradual.
5. Guardar log de la migración y resultados como evidencia.

## Reglas

- Operaciones sobre datos reales (`db push`, borrados, restauraciones) requieren autorización explícita; el guard pide confirmación.
- Semillas deterministas y sin datos personales reales.
- Respaldo con restauración probada antes de cambios destructivos.
