---
description: Actualiza este proyecto con la última versión del OS (web-os) usando Copier, instalando dependencias y verificando.
---

Vas a sincronizar este proyecto con la última versión del Sistema Operativo (web-os).

PASO 0 — Comprobaciones previas (Pre-flight)
1. Ejecuta `git status --short`. Si hay archivos modificados o sin seguimiento, PARA y avisa: "Hay cambios sin commitear. Por favor, haz commit o stash antes de sincronizar".
2. Comprueba que existe el archivo `.copier-answers.yml`. Si no existe, PARA y avisa: "Este proyecto no tiene .copier-answers.yml. No se puede actualizar automáticamente con Copier".
3. Recuerda al usuario: "Asegúrate de que el OS (web-os) está subido a GitHub (git push), ya que Copier lee desde el repositorio remoto, no desde tu disco local".

PASO 1 — Ejecutar Copier
Ejecuta el comando:
  copier update --defaults --trust

PASO 2 — Resolver conflictos
- Si Copier termina con conflictos (archivos con marcadores `<<<<<<<`), PARA y avísame. Muéstrame la lista de archivos en conflicto.
- Si termina bien, continúa.

PASO 3 — Instalar dependencias
Ejecuta:
  pnpm install

PASO 4 — Verificar
Ejecuta:
  pnpm typecheck
  pnpm lint

PASO 5 — Informar
Dime: "Proyecto sincronizado con el OS. Si se han actualizado comandos o reglas, recuerda reiniciar Claude Code (o VS Code) para que la sesión actual cargue los cambios".
