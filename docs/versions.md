# docs/versions.md — Propagación de versiones del OS

## Contexto

Cada proyecto instanciado es una copia del OS en el momento de su
creación. El OS sigue evolucionando. Este documento explica cómo se
propagan los cambios.

La herramienta es Copier (copier update). El proyecto conserva un archivo
.copier-answers.yml con las respuestas del instanciado y un archivo
.os-version con la versión del OS.

## Flujo del OS

1. Cambio en template/.
2. Subir package.json.version y .os-version (SemVer).
3. Anotar en CHANGELOG.md del OS.
4. Si toca un invariante: MAJOR + ADR en docs/decisions/.
5. Si añade un invariante sin invalidar proyectos: MINOR.
6. Si es administrativo: PATCH.
7. Commit y push.

## Flujo del proyecto

Desde dentro del proyecto:

copier update

Copier:

1. Compara el template nuevo con el que se usó.
2. Aplica los cambios.
3. Si hay conflictos, los marca y para.
4. Actualiza .copier-answers.yml.
5. Actualiza .os-version.

Antes:

1. Commit o stash de tu trabajo.
2. Lee el CHANGELOG del OS entre tu versión y la nueva.
3. Si hay cambio MAJOR: lee el ADR correspondiente.

Después:

1. Revisa el diff (git diff).
2. Si hay conflictos: resuélvelos a mano.
3. Ejecuta puertas: pnpm typecheck && pnpm lint && pnpm test && pnpm build.
4. Commit: chore: copier update a web-os vX.Y.Z.

## Conflictos habituales

| Archivo | Por qué conflictúa | Cómo resolver |
|---|---|---|
| docs/constitution.md | Cambios legítimos del proyecto | Conservar lo del proyecto; adoptar lo del OS |
| CLAUDE.md | Reglas propias añadidas | Conservar las propias en una sección separada |
| package.json | El proyecto añade dependencias | Fusionar a mano |
| palette.css | Es del proyecto | Nunca tocar |
| sdd/ | Artefactos propios del proyecto | Nunca deben ser tocados |

## Cuándo NO actualizar

- Proyecto en producción y sin ventana de pruebas.
- Cambio MAJOR sin tiempo para leer el ADR y probar.
- Proyecto congelado.

## .os-version como red de seguridad

Si copier update falla, .os-version te dice con qué versión del OS se
instanció. Puedes comparar a mano con el CHANGELOG del OS.

## Política de compatibilidad

- MAJOR del OS: los proyectos existentes pueden romperse.
- MINOR: retrocompatible.
- PATCH: correcciones. Actualización recomendada siempre.

## Prohibido

- Editar archivos del OS directamente en el proyecto.
- Hacer copier update sin commitear los cambios en curso.
- Hacer copier update y no revisar el diff.
- Ignorar un conflicto con git checkout --theirs sin mirar.
