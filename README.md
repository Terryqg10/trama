# {{ project_name }}

{{ project_description }}

Proyecto instanciado desde web-os. Sigue Spec-Driven Development.

## Nivel de rigor

{{ rigor_level }} — ver docs/constitution.md (sección 5).

## Estilo visual

{{ style }} — ver design/styles/index.md.

## Arrancar

pnpm install
pnpm dev

Abre http://localhost:3000.

## Cómo se trabaja

El flujo es spec → plan → tasks → implement → review. Nada se implementa
sin spec aprobada.

Con Claude Code:

1. Abre Claude Code en esta carpeta.
2. Ejecuta /start para orientarte.
3. Según lo que toque: /new-spec, /new-task, /check, /review, /decide,
   /style.

Documentos clave:

- docs/constitution.md — invariantes y defaults.
- CLAUDE.md — reglas operativas de Claude Code.
- sdd/README.md — flujo SDD.

## Actualizar el OS

Este proyecto está ligado a una versión del OS (.os-version). Para recibir
mejoras:

copier update

Detalle en docs/versions.md.

## Comandos útiles

| Comando | Qué hace |
|---|---|
| pnpm dev | Servidor de desarrollo. |
| pnpm build | Build de producción. |
| pnpm typecheck | Comprueba tipos. |
| pnpm lint | Linter. |
| pnpm test | Tests unitarios. |
| pnpm test:e2e | Tests end-to-end. |
| pnpm check-palette | Valida palette.css contra WCAG AA. |
| pnpm check-secrets | gitleaks. |
| pnpm verify | Comprobaciones de estructura. |
| pnpm install-hooks | Instala el hook pre-commit. |
