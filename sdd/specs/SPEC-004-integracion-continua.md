---
id: SPEC-004-integracion-continua
title: Integración continua que pueda pasar
status: aprobada
rigor_level: M
created: 2026-10-24
updated: 2026-10-24
---

# SPEC-004 — Integración continua que pueda pasar

(Se numera 004 porque SPEC-002 reserva el nombre SPEC-003 para los filtros por disponibilidad.)

## 1. Objetivos

Que la CI de GitHub Actions (`.github/workflows/ci.yml`) termine en verde sobre `main` y sobre los PRs, sin secretos, para que bloquee de
verdad y permita evaluar los PRs de Dependabot. Decisión de alcance en ADR-013.

## 2. Fuera de alcance

- Ejecutar e2e o tests de integración en CI (ADR-013).
- Subir las acciones a nuevas versiones mayores (PRs de Dependabot 1 a 5): tareas aparte.
- Una base de datos de pruebas aislada de la web.
- Cambiar `src/lib/env.ts` o la validación de entorno.

## 3. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | El paso `Build` de CI compila sin variables reales: define solo las variables públicas que el build exige, con valores ficticios en el propio workflow. |
| RF-02 | La CI no ejecuta `playwright install`, `test:e2e` ni la subida del informe de Playwright. |
| RF-03 | La CI sigue ejecutando typecheck, lint, check-palette, audit:gate, tests unitarios, build y gitleaks, todos bloqueantes. |
| RF-04 | La CI no referencia ningún secret del repositorio salvo `GITHUB_TOKEN` (gitleaks). |

## 4. Requisitos no funcionales

- Los valores ficticios no parecen claves reales (sin prefijos `sk_`, `pk_`, `eyJ`) para no disparar gitleaks ni confundirse con credenciales.
- Duración del job razonable (<20 min, el `timeout-minutes` actual).

## 5. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| Alguna ruta pasa a necesitar otra variable en build | El build falla con el nombre de la variable; se añade a RF-01 con enmienda. |
| El build ficticio intenta conectar a Supabase | No debe: el prerender no hace red con esos valores. Si lo hiciera, el build falla y se trata como defecto. |
| PR de Dependabot | Mismo flujo, sin secrets. |

## 6. Estados de error y vacío en la UI

No aplica (sin UI).

## 7. Máquina de estados

No aplica.

## 8. Riesgos de seguridad

- Un valor ficticio con aspecto de clave real podría ocultar una fuga o dar falsos positivos de gitleaks: ver requisito no funcional.
- Los workflows de PR no reciben secrets de Dependabot: está bien, no los usamos.

## 9. Datos y privacidad

Sin datos personales.

## 10. APIs externas

Ninguna llamada a Supabase ni Stripe desde la CI (RF-01, RF-02). Sin coste.

## 11. Criterios de aceptación

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-01 | RF-01 | Un entorno sin `.env*` y con solo las variables del workflow | Se ejecuta `pnpm run build` | Termina con exit 0 | Comprobación local documentada en la review (entorno limpio) y ejecución verde de CI |
| CA-02 | RF-02, RF-03 | El `ci.yml` modificado | Se lee el workflow | No hay `playwright`, `test:e2e` ni `upload-artifact`, y sí los pasos de RF-03 | Comprobación documentada (lectura del archivo) |
| CA-03 | RF-04 | El `ci.yml` modificado | Se buscan referencias `secrets.` | Solo `secrets.GITHUB_TOKEN` | Comprobación documentada (búsqueda) |
| CA-04 | RF-03 | Un push a `main` con la tarea | Termina la CI | Los dos jobs concluyen `success` | `gh run list` pegado en la review |

## 12. Enmiendas
