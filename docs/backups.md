# docs/backups.md — Backups

## Cuándo importa

- Supabase plan gratuito: no incluye copias de seguridad automáticas.
  VERIFICAR el plan actual.
- Supabase plan Pro y superiores: backups diarios.
- Neon: PITR limitado en plan gratuito; verificar.
- SQLite local: tu responsabilidad.

## Política recomendada

- Antes de cada migración destructiva: backup obligatorio.
- Una vez por semana durante desarrollo activo.
- Antes de cada release a producción.
- Retención: 4 semanales + 1 mensual.

## Script

DATABASE_URL=postgres://user:pass@host:5432/db pnpm run backup

Genera backups/YYYY-MM-DD-HHMM.sql.gz. La carpeta backups/ está en
.gitignore.

pg_dump viene con Postgres client tools:

- Windows: instalador de Postgres; añade bin/ al PATH.
- macOS: brew install libpq; añade libpq/bin/ al PATH.
- Linux: apt install postgresql-client.

## Restaurar

gunzip -c backups/2026-10-10-1200.sql.gz | psql "$DATABASE_URL"

Cuidado: sobrescribe los datos actuales.

## Automatización (opcional)

- Windows: Programador de tareas + script .cmd.
- macOS/Linux: cron o launchd.
- GitHub Actions: workflow programado.

Se decide por proyecto con ADR.

## Prohibido

- Backups en el repositorio.
- Backups en el mismo host que la base de datos.
- Backups sin cifrado en servicios de terceros.
- drop table sin backup previo.

## VERIFICAR

- Si Supabase plan actual incluye backups automáticos.
- Si Neon tiene PITR en el plan actual.
- Precio de almacenamiento de backups.
