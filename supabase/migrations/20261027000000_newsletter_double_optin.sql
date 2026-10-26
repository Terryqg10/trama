-- T-061 (Enmienda 50 de SPEC-001, CA-103): doble confirmación de la newsletter.
-- Una alta nueva queda pendiente (`confirmed_at` nulo) con el HASH de un token de un solo uso y su caducidad; solo cuenta como
-- suscrita al confirmar. El token en claro no se guarda nunca. Quien confirma es el servidor con la clave de servicio: la clave
-- pública sigue sin poder leer, cambiar ni borrar, y ya no puede dar de alta con el estado de confirmación puesto.
-- Se aplica a mano: supabase db query --linked --project-ref <ref> -f <este archivo> (ADR-002).
-- Idempotente: se puede aplicar más de una vez.

alter table public.newsletter_subscribers add column if not exists confirmed_at timestamptz;
alter table public.newsletter_subscribers add column if not exists confirm_token_hash text;
alter table public.newsletter_subscribers add column if not exists confirm_expires_at timestamptz;

-- Los suscriptores anteriores a la doble confirmación dieron su consentimiento expreso al darse de alta: quedan confirmados.
-- Solo toca filas sin confirmar y sin token, así que repetir la migración no confirma altas pendientes nuevas.
update public.newsletter_subscribers
  set confirmed_at = created_at
  where confirmed_at is null and confirm_token_hash is null;

-- SHA-256 en hexadecimal (64 caracteres): un hash único por alta pendiente.
alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_token_hash_check;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_token_hash_check
  check (confirm_token_hash is null or confirm_token_hash ~ '^[0-9a-f]{64}$');

create unique index if not exists newsletter_subscribers_token_hash_key
  on public.newsletter_subscribers (confirm_token_hash)
  where confirm_token_hash is not null;

-- La clave pública solo puede dar de alta una fila SIN confirmar y sin token: no puede saltarse la doble confirmación.
drop policy if exists newsletter_subscribers_insert_public on public.newsletter_subscribers;
create policy newsletter_subscribers_insert_public
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (
    consent is true
    and confirmed_at is null
    and confirm_token_hash is null
    and confirm_expires_at is null
  );
