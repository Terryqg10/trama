---
id: ADR-002
title: Usar Supabase en la nube como backend y para los tests de integración
status: aceptada
date: 2026-10-12
os_version: 0.1.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda, T-003, T-003b]
---

# ADR-002 — Supabase en la nube como backend

## Contexto

SPEC-001 fija Supabase (Auth, Postgres con RLS, Storage). El nivel L exige
tests de integración contra una base de datos real y prueba de aislamiento
entre usuarios (I3). Hay que elegir dónde corre esa base de datos. Docker no
está instalado en la máquina de desarrollo y el proyecto es personal.

## Alternativas consideradas

1. **Proyecto Supabase en la nube** — sin Docker, Auth y Storage ya
   disponibles. Los tests tocan una BD remota y dependen de red y de cuotas
   del plan gratuito (VERIFICAR).
2. **Supabase local (CLI + Docker)** — reproducible y apto para CI sin
   cuotas, pero exige instalar y mantener Docker.
3. **Postgres propio con un sistema de auth aparte** — control total, pero
   duplica trabajo de auth y storage que Supabase ya resuelve.

## Decisión

Se elige la alternativa 1: un proyecto Supabase en la nube, **de desarrollo y
separado de cualquier uso real**. Reglas:

- El esquema vive en `supabase/migrations/` (SQL versionado) y es la fuente de
  verdad. Los tipos se generan con `pnpm db:types`.
- Los tests de integración crean sus propios usuarios y datos de prueba y los
  eliminan al terminar. Nunca se usan datos reales.
- Las claves (`service_role` incluida) solo viven en variables de entorno,
  nunca en el repo (I4). `.env*` no lo lee ni escribe Claude Code.
- Si algún día se necesita aislamiento total, las migraciones se pueden
  aplicar a un Supabase local o a otro Postgres.

## Consecuencias

Positivas:
- Se puede avanzar sin instalar Docker.
- Auth, RLS y Storage disponibles desde el primer día.

Negativas:
- Los tests de RLS dependen de red y de una BD compartida; pueden ser más
  lentos y más frágiles que en local.
- El CI necesitará secretos de un proyecto Supabase de pruebas (T-002 ya
  existe; habrá que añadirlos en GitHub y revisar el workflow).
- Cuotas y términos del plan gratuito sin verificar (VERIFICAR).
- Auth y Storage acoplan el proyecto a Supabase; migrar sería más costoso que
  migrar solo el SQL.

## Relación con la constitución

- I3: RLS antes de consumir datos, con prueba de aislamiento.
- I4: secretos fuera del repo; claves solo en servidor.
- Nivel L: tests de integración con base de datos real.
