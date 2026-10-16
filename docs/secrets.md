# docs/secrets.md — Política de secretos

## Invariante

La constitución (I4) dice: ninguna clave, token, contraseña o credencial
en el repositorio. Este documento detalla cómo se cumple.

## Archivos .env

| Archivo | ¿Se versiona? | Contenido |
|---|---|---|
| .env.example | Sí | Solo nombres de variables, sin valores. |
| .env | No | Valores locales reales. |
| .env.local | No | Overrides locales. |
| .env.development, .env.production | No | Valores por entorno. |

.gitignore bloquea .env* excepto .env.example.

## Herramientas

### gitleaks

Se ejecuta en tres sitios:

1. Pre-commit (local). Instalado por scripts/install-hooks.mjs. Ejecuta
   scripts/check-secrets.mjs, que invoca gitleaks. Si gitleaks no está
   instalado, avisa pero no bloquea.
2. Claude Code. El hook PreToolUse intercepta Bash(git commit:*) y
   ejecuta la misma comprobación.
3. CI. En cada PR. Bloqueante.

### Instalación de gitleaks

- Windows: scoop install gitleaks o choco install gitleaks. También vale
  el binario portable en el PATH.
- macOS: brew install gitleaks.
- Linux: binario de las releases oficiales.

VERIFICAR la versión actual y las vías de instalación por plataforma.

## Claude Code

.claude/settings.json bloquea lectura y escritura de .env*:

"deny": [
  "Read(./.env)",
  "Read(./.env.*)",
  "Read(./**/.env)",
  "Read(./**/.env.*)",
  "Edit(./.env)",
  "Edit(./.env.*)",
  "Write(./.env)",
  "Write(./.env.*)"
]

Además, un hook PreToolUse impide un git commit sin pasar
check-secrets.mjs.

## Variables en el navegador

- Cualquier variable que empiece por NEXT_PUBLIC_ se incrusta en el
  bundle y es visible por cualquiera.
- Regla: NEXT_PUBLIC_* es información pública por diseño. Nunca un
  secreto.
- Las claves de API de pago van solo al servidor.

## Vercel

En producción, las variables se configuran en Vercel:

1. Project → Settings → Environment Variables.
2. Cada variable se marca para el entorno correcto.
3. Ninguna variable de producción se sube al repo.

## Cómo actuar si hay una fuga

1. No hagas git push. El commit aún no está publicado.
2. Elimina el secreto del archivo y usa una variable de entorno.
3. Si el commit aún no está publicado: git reset o git commit --amend.
4. Si ya está publicado: rota la clave. La historia de git no es un
   lugar seguro.
5. Documenta el incidente en el CHANGELOG del proyecto si era de
   producción.

## Excepciones

.gitleaks.toml lista rutas exentas (.env.example, docs, README,
lockfiles). Cualquier excepción nueva debe justificarse.

## Lo que NO se hace

- No se sube .env al repo, aunque sea "solo de desarrollo".
- No se guardan secretos en el frontend.
- No se comparten secretos por Slack, email o comentarios en PRs.
- No se usa el mismo secreto para desarrollo y producción.
