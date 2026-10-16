# rules/scripts.md

## Invariante I8

Todos los scripts del proyecto funcionan en Windows, macOS y Linux sin
dependencias duras de sh/bash.

- Scripts en Node/TS (.mjs, o .ts invocado con tsx).
- Nada de Makefile, nada de *.sh como paso obligatorio del flujo.
- Los scripts se exponen como tareas en package.json (pnpm run …).
- Si un script necesita un binario POSIX, usa Node (fs, child_process con
  argumentos, no shell).

## Paths

- Usa path.join / path.resolve, nunca concatenación con /.
- fileURLToPath(import.meta.url) para rutas relativas al script.
- Al escribir archivos de texto, fuerza \n (LF). Ya hay .gitattributes en
  el proyecto con text=auto eol=lf.

## Procesos

- child_process.spawn con array de argumentos, no exec con string.
- Comprueba exitCode. Si falla, no sigas.
- Nada de shell: true salvo en última instancia.

## Windows: particularidades

- Rutas largas: evita anidar demasiado.
- Caracteres reservados en nombres: <>:"|?*. No los uses.
- Permisos de archivo: no cuentes con chmod +x; invoca Node directamente.

## scripts/ del OS y del proyecto

- En el OS: scripts/verify.mjs, scripts/sync-demo.mjs,
  scripts/new-project.mjs.
- En el proyecto: los que necesite el proyecto, con el mismo estilo.
