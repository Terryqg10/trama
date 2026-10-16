# rules/security.md

## Secretos

- Ninguna clave, token, contraseña o credencial en el repo.
- .env* en .gitignore. Solo .env.example se versiona, sin valores reales.
- Claude Code no lee ni escribe .env* (deny en settings.json).
- gitleaks corre en pre-commit.
- Claves de API solo en servidor. Nunca en 'use client' ni en
  NEXT_PUBLIC_* salvo que sean públicas por diseño.

## Base de datos

- RLS antes de consumir datos.
- Cada tabla con usuarios tiene políticas explícitas para select, insert,
  update, delete.
- Prueba de aislamiento entre usuarios obligatoria antes de cerrar.
- Tipos generados desde la base de datos. No escribir tipos a mano.

## Inputs

- Validación con Zod en el límite.
- Los tipos de TypeScript se derivan del esquema Zod (z.infer).
- Rechazar por defecto. Permitir con lista blanca.

## APIs externas

- Revisar los términos de servicio antes de guardar datos de terceros.
- Documentar en la spec: qué se guarda, para qué, cuánto tiempo, cómo se
  borra.
- Topes de coste obligatorios en APIs de pago: alertas de presupuesto y
  cuota máxima.

## Dependencias

- `pnpm audit` sin vulnerabilidades altas ni críticas al cerrar.
- Renovate o Dependabot configurados.
- No añadir una dependencia sin justificar. Si pesa, ADR.

## Topes de coste

Detalle completo en docs/costs.md. Lo operativo:

1. Antes de escribir el primer consumidor de una API de pago: tope
   declarado en la spec (sección 10) y configurado en el proveedor.
2. Toda llamada pasa por un módulo src/lib/<proveedor>/. Nunca fetch
   directo desde un componente.
3. Al superar el tope: falla cerrado o degradado, según la spec. Nunca
   silencioso.
4. La review de la tarea que toque una API de pago incluye los 5 checks
   de docs/costs.md. Sin ellos, no se cierra.

Fugas típicas: recursión en agentes LLM, retries sin tope, crons
solapados, endpoints públicos sin rate limit, previews de Vercel.

## Detalle completo

Ver docs/secrets.md para:
- Tabla de archivos .env (cuáles se versionan y cuáles no).
- Cómo se instala gitleaks por plataforma.
- Comportamiento del hook pre-commit y del hook de Claude Code.
- Protocolo en caso de fuga de un secreto.
- Reglas de variables NEXT_PUBLIC_*.
- Configuración de secretos en Vercel.

Resumen operativo:
1. .env.example solo con nombres, sin valores.
2. Nunca leer ni escribir .env* (settings.json lo bloquea).
3. Secretos de API de pago, solo en servidor.
4. Antes de commitear: pnpm run check-secrets o confiar en el hook.
5. Si hay fuga: rotar la clave, no confiar en borrar el commit.

## Comandos prohibidos (deny en settings.json)

rm -rf /, git push --force, git reset --hard, curl, wget, npm publish,
pnpm publish. Si necesitas alguno puntualmente, lo apruebas en el chat.
