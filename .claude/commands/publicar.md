---
description: Publica el proyecto actual en el portfolio (terryq.com) como un caso de estudio, generando capturas automáticamente.
---

Vas a publicar este proyecto en el portfolio (terryq.com).

PASO 1 — Comprobación final
- Asegúrate de que el proyecto pasa las puertas de calidad (`pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`).
- El árbol de trabajo debe estar limpio (`git status --short` vacío).

PASO 2 — Push a GitHub
- Haz `git push origin main`.

PASO 3 — Generar capturas automáticas
- Pregunta al usuario qué ruta interna quiere capturar (ej. /reservas, /carta, /admin), además de la Home.
- Crea un script temporal en `scripts/take-screenshots.mjs` que use Playwright.
- El script debe levantar el servidor local, navegar a:
  1. La Home (`/`) en escritorio (1280px).
  2. La Home (`/`) en móvil (390px).
  3. La ruta interna indicada por el usuario.
- Guarda las 3 capturas en `./screenshots/`.
- Ejecuta el script, espera a que termine y cierra el servidor.
- Borra el script temporal.

PASO 4 — Actualizar el portfolio
- Pregunta al usuario dónde tiene clonado su portfolio (`terryq.com`).
- Muévete a esa carpeta.
- Crea una nueva rama: `git checkout -b feat/caso-<nombre-proyecto>`.
- Crea el archivo del caso de estudio usando los datos de `sdd/specs/` y `sdd/plans/`.
- Mueve las capturas de `./screenshots/` a `public/images/casos/<nombre-proyecto>/`.
- Haz commit de los cambios.
- Haz push de la rama.
- Abre un Pull Request hacia `main` usando GitHub CLI (`gh pr create`).

PASO 5 — Cierre
- Informa al usuario de que el PR está listo para revisar.
