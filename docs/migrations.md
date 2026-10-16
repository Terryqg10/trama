# docs/migrations.md — Migraciones de base de datos

## Principio

RLS antes de consumir datos (invariante I3). Las migraciones incluyen
tanto el esquema como las políticas, y se aplican antes de escribir el
primer select en el código.

## Proveedor

El estándar es Postgres. El proveedor (Supabase, Neon, otro) lo decide
cada proyecto con ADR. Este documento usa Supabase como referencia.

## Estructura (Supabase)

supabase/
  config.toml
  migrations/
    20260101120000_init.sql
    20260101120100_add_users_rls.sql

- Nombre: YYYYMMDDHHMMSS_slug.sql.
- Una migración = un cambio atómico.
- Nunca se edita una migración ya aplicada.

## Contenido de una migración

Toda migración que cree una tabla con datos de usuario incluye:

1. create table con todas las columnas.
2. Índices necesarios.
3. alter table ... enable row level security;
4. Políticas select, insert, update, delete.

Ejemplo:

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes (user_id);

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);

create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

## Tipos generados

Los tipos de TypeScript se generan desde la base de datos:

pnpm run db:types

Ejecuta supabase gen types typescript --local > src/lib/db/types.generated.ts.

Reglas:

- El archivo src/lib/db/types.generated.ts se versiona.
- Lleva cabecera "AUTOGENERADO — no editar a mano".
- Si cambia en una PR, es porque hay migración nueva.
- Ningún tipo de tabla se escribe a mano.

## Flujo de trabajo

En local:

1. supabase start.
2. Crear migración con supabase migration new <slug>.
3. Escribir el SQL.
4. supabase db reset para aplicar todas.
5. pnpm run db:types.
6. Escribir el código.

En remoto:

1. supabase link --project-ref <ref>.
2. supabase db push.
3. Verificar en Studio.

## Prueba de aislamiento (obligatoria si hay usuarios)

En cada tabla con user_id, antes de cerrar la tarea:

1. Crear dos usuarios A y B.
2. Autenticar como A. Insertar una fila.
3. Autenticar como B. Intentar leer la fila de A.
4. Esperar 0 filas.
5. Repetir para update y delete.

Vive en tests/rls.spec.ts. Es la puerta 6 de quality-gates.md.

## Apéndice: otros proveedores

- Neon: node-pg-migrate o drizzle-kit. Mismo principio.
- SQLite local: drizzle-kit o better-sqlite3. Sin RLS.
- Postgres self-hosted: node-pg-migrate.

## Prohibido

- Editar una migración aplicada en remoto.
- Consumir una tabla sin RLS definida.
- Escribir tipos de tabla a mano.
- Aplicar migraciones en producción desde local sin pasar por CI/PR.
- drop table sin migración de backup y sin ADR.
