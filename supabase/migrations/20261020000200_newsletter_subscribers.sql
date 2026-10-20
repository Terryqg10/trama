-- T-058 (Enmienda 26 de SPEC-001): suscriptores de la newsletter (RF-26, CA-99).
-- Cualquiera puede suscribirse (insert); nadie puede leer, cambiar ni borrar filas con la clave pública. La lista
-- solo se lee con la clave de servicio (panel o scripts del servidor). Se aplica a mano:
--   supabase db query --linked --project-ref <ref> -f <este archivo> (ADR-002).
-- Idempotente: se puede aplicar más de una vez.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  consent boolean not null,
  created_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_key unique (email),
  -- Minúsculas, 3 a 254 caracteres y una forma razonable de email (la validación completa va en Zod).
  constraint newsletter_subscribers_email_check
    check (email = lower(email) and char_length(email) between 3 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- El consentimiento es expreso: solo se guardan altas con consentimiento (RGPD).
  constraint newsletter_subscribers_consent_check check (consent is true)
);

alter table public.newsletter_subscribers enable row level security;

-- Permisos mínimos: solo insertar. Sin select, update ni delete para la clave pública.
revoke all on table public.newsletter_subscribers from anon, authenticated;
grant insert on table public.newsletter_subscribers to anon, authenticated;

drop policy if exists newsletter_subscribers_insert_public on public.newsletter_subscribers;
create policy newsletter_subscribers_insert_public
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (consent is true);

-- Sin políticas de select, update ni delete: con RLS activa, quedan denegadas.
