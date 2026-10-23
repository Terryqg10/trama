---
id: ADR-012
title: Aceptar temporalmente el aviso de zod (agotamiento de memoria) hasta 2026-11-23
status: aceptada
date: 2026-10-24
os_version: 0.1.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda, T-093, T-095]
expires: 2026-11-23
---

# ADR-012 — Aceptar temporalmente el aviso de `zod` hasta 2026-11-23

## Contexto

`pnpm audit` y `pnpm audit:gate` empezaron a reportar el 2026-10-24 un hallazgo **alto** en `zod`:
GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404), «Zod can exhaust memory while validating oversized constrained collections».
Afecta a `<4.6.6` y se corrige en `>=4.6.6`. La versión instalada es `3.25.76` (`package.json` pide `^3.24.0`), que además
llega por `eslint-config-next > eslint-plugin-react-hooks`. **La corrección solo existe en la rama 4.x**: no hay parche para la 3.x, y
pasar a 4 es un salto de versión mayor, no una actualización menor, y el proyecto usa Zod en todas las entradas (por ejemplo
`required_error` y `errorMap` en los esquemas de formularios; el detalle de qué cambia exactamente se verifica en T-095).

El hallazgo no lo introdujo ningún cambio del proyecto: apareció en la base de avisos con el código intacto y bloquea la
puerta 5 de `rules/quality-gates.md`, que admite un hallazgo alto «o con ADR y caducidad».

**Exposición en este proyecto (revisada el 2026-10-24, sin medir con una prueba de carga):** las colecciones que se validan con
entrada del navegador están acotadas antes de procesarse: `savedCartSchema` y `variantIdsSchema` con `.max(50)`, las líneas de
reserva con `.max(50)` y las sugerencias de búsqueda con `.max(5)`; el resto de las colecciones salen de nuestra base de datos, no de
un cliente. Las acciones de servidor de Next limitan además el tamaño del cuerpo de la petición. No se ha demostrado que el límite
de longitud se compruebe antes de validar cada elemento, así que **no se descarta** que una petición enorme gaste memoria.

## Alternativas consideradas

1. **Aceptar con caducidad (30 días) y migrar a Zod 4 en una tarea propia (T-095)** — desbloquea el trabajo en curso sin un cambio
   grande a ciegas; deja un hallazgo abierto y acotado en el tiempo.
2. **Migrar a Zod 4 ahora, antes de cerrar T-093** — es la solución de fondo, pero toca casi todos los esquemas y sus tests, mezcla un
   cambio de dependencia con un cambio funcional y retrasa T-094 y el resto del cupón.
3. **Forzar una versión con `pnpm.overrides`** — descartada: la 3.x no tiene versión corregida, y forzar la 4.x sin migrar rompería
   la validación y el lint (`eslint-plugin-react-hooks` pide Zod 3 como dependencia).
4. **Quitar Zod** — descartada: es la validación de entradas que exige la constitución (I5).

## Decisión

Se elige la alternativa 1. Se acepta el hallazgo de `zod` hasta el **2026-11-23** (30 días) y se añade a `scripts/audit-gate.mjs` con esta
referencia. Se crea **T-095** para migrar a Zod 4. Antes de esa fecha, o si aparece una versión 3.x corregida, se actualiza, se
repite `pnpm audit:gate` y se retira la excepción. Si a la fecha no se ha migrado, se reevalúa con un ADR nuevo (este no se edita).

Motivos: el proyecto es una demo de portfolio con Stripe en modo test y sin datos reales; las entradas están acotadas; el aviso es una
denegación de servicio (memoria), no ejecución de código ni fuga de datos; y migrar de versión mayor exige una tarea con su spec y sus
pruebas, no un parche de pasada.

## Consecuencias

Positivas:
- Se desbloquea la puerta 5 sin tocar código ni versiones y sin mezclar cambios.
- Revertir es barato: borrar la entrada del script.

Negativas:
- `pnpm audit` seguirá mostrando 1 alta (y la de `braces`, hasta su propia fecha) hasta migrar.
- Una petición enorme podría gastar memoria del servidor hasta entonces; se asume en una demo.
- Dos excepciones con caducidades distintas (`braces`, 2026-11-11; `zod`, 2026-11-23): hay que acordarse de las dos fechas.
- Si la migración se retrasa, esto se prolonga y exige otro ADR.

## Relación con la constitución

- I5 (validación con Zod en todo input externo): se mantiene; solo se acepta un aviso de la propia librería.
- Puerta 5 de `rules/quality-gates.md`: cumple la vía «con ADR y caducidad». No altera invariantes ni la spec.
