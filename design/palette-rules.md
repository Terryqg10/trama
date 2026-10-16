---
registry: design
scope: general
version: 0.1.0
updated: 2026-10-10
modes: [claro, oscuro]
---

# palette-rules.md — Regla general de paleta

**Principio:** el color no forma parte del estilo. Cada proyecto deduce
su paleta, la declara en `palette.css`, la valida con `check-palette` y
la registra en `sdd/plans/`. Lo que sí es fijo:

- Los 14 nombres de token (contrato en `design/styles/<estilo>/tokens.css`).
- La matriz de contraste (20 pares).
- Las reglas de deducción y validación de este documento.
- El modo (claro u oscuro) declarado por cada estilo.

Un estilo puede endurecer los umbrales de este documento. Nunca
relajarlos.

## 1. Fuentes de deducción (orden de prioridad)

| Prioridad | Fuente | Qué hace el agente |
|---|---|---|
| 1 | Marca existente (logo, hex, guía de marca) | Manda siempre. La semilla es el color de marca. |
| 2 | Activos del proyecto (fotos, packaging, ilustraciones) | Propone la semilla a partir del color dominante. |
| 3 | Sector y tono del brief | Propone una dirección razonada. Punto de partida, nunca decisión. |
| 4 | Sin información suficiente | No inventa. Declara DECISIÓN PENDIENTE y pregunta. |

Direcciones de partida por sector:

| Sector | Dirección |
|---|---|
| Salud, bienestar | Azul-verdoso o verde suave. |
| Oficios, construcción | Azul marino o verde oscuro con acento cálido. |
| Hostelería | Cálidos (rojo, naranja, ocre). |
| Belleza | Violeta o rosa suave, o neutros cálidos. |
| Tecnología, SaaS | Azul o índigo. |
| Moda, lujo | Neutros con un acento muy oscuro. |
| Natural, ecológico | Verdes profundos con fondos salvia. |

## 2. Derivación en modo claro

Entrada: un único color semilla. Valores orientativos; el criterio
vinculante es la matriz de contraste.

| Token | Regla de partida | Ajuste obligatorio |
|---|---|---|
| `accent` | Semilla, L ≈ 0.50 o menos | Subir/bajar L hasta que `accent-fg` cumpla 4.5:1 |
| `accent-hover` | `accent` con L − 0.06 | Revalidar contra `accent-fg` |
| `accent-fg` | Blanco | Si la semilla es clara, usar texto oscuro |
| `accent-soft` | Mismo tono, L ≈ 0.94, croma bajo | `accent-text` y `fg` cumplen 4.5:1 |
| `accent-text` | = `accent` | Oscurecer hasta 4.5:1 sobre fondos claros |
| `bg` | Tono del acento, L ≈ 0.97, croma muy bajo | Ninguno |
| `surface` | Blanco | Ninguno |
| `surface-muted` | Tono del acento, L ≈ 0.94, croma bajo | Ninguno |
| `border` | Tono del acento, L ≈ 0.91 | Decorativo |
| `border-strong` | Neutro con tinte, L ≈ 0.65 | ≥ 3:1 sobre `bg` y `surface` |
| `fg` | Tono del acento, L ≈ 0.20 | 4.5:1 sobre fondos |
| `fg-muted` | L ≈ 0.45 | 4.5:1 sobre fondos |
| `danger` | Rojo fijo, no derivado | 4.5:1 sobre `surface` |
| `success` | Verde fijo, no derivado | 4.5:1 sobre `surface` |

## 3. Derivación en modo oscuro

Mismos 14 tokens. El acento sube de L (los oscuros desaparecen sobre
fondo oscuro) y `accent-fg` suele ser oscuro.

| Token | Regla de partida | Ajuste obligatorio |
|---|---|---|
| `accent` | Semilla, L ≈ 0.65-0.72 | ≥ 4.5:1 con `accent-fg` y ≥ 3:1 con `bg` |
| `accent-hover` | `accent` L + 0.06 | Revalidar |
| `accent-fg` | Oscuro (L ≈ 0.15) | Con acentos muy claros puede ser blanco |
| `accent-soft` | Mismo tono, L ≈ 0.28, croma bajo | `accent-text` y `fg` cumplen 4.5:1 |
| `accent-text` | = `accent` aclarado | 4.5:1 sobre fondos oscuros |
| `bg` | Tono del acento, L ≈ 0.14 | Ninguno |
| `surface` | Tono del acento, L ≈ 0.18 | Ninguno |
| `surface-muted` | Tono del acento, L ≈ 0.22 | Ninguno |
| `border` | Tono del acento, L ≈ 0.28 | Decorativo |
| `border-strong` | Neutro, L ≈ 0.55 | ≥ 3:1 sobre `bg` y `surface` |
| `fg` | Tono del acento, L ≈ 0.95 | 4.5:1 sobre fondos |
| `fg-muted` | L ≈ 0.72 | 4.5:1 sobre fondos |
| `danger` | Rojo claro fijo (L ≈ 0.70) | 4.5:1 sobre `surface` |
| `success` | Verde claro fijo (L ≈ 0.70) | 4.5:1 sobre `surface` |

## 4. Casos límite

| Caso | Qué hacer |
|---|---|
| Semilla muy clara (amarillo, lima) | En claro: `accent-fg` oscuro. En oscuro: subir L. |
| Semilla casi gris | Neutros puros; válido. |
| Semilla roja (colisiona con `danger`) | Avisar. Errores con icono y texto. |
| Semilla verde (colisiona con `success`) | Igual. |
| Cliente aporta 2+ colores | Elegir uno como acento. El resto solo en imágenes. |
| Logo sin color usable | Prioridad 2 o 3. Declarar la fuente real. |
| Contraste imposible | Pedir otra semilla. Nunca entregar una paleta que falle. |

## 5. Contrato de salida

Archivo `palette.css` en la raíz del proyecto. Bloque `@theme static`
con los 14 tokens + cabecera obligatoria:
