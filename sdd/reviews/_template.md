---
id: T-XXX
title: <título de la tarea>
spec: SPEC-XXX-<slug>
status: cerrada
rigor_level: S | M | L
closed_on: YYYY-MM-DD
---

# Review — T-XXX

## Criterios de aceptación cubiertos

| CA | Estado | Evidencia |
|---|---|---|
| CA-01 | OK / KO | test `...` + salida pegada abajo |

## Comandos ejecutados

Salida real de cada comando (tsc, lint, build, etc.).

## Checklist de interfaz (si aplica)

- [ ] Logo enlaza a /
- [ ] Modales cerrables
- [ ] Cada botón tiene onClick o href válido
- [ ] Cero enlaces muertos
- [ ] Navegación definida

## Accesibilidad (si aplica)

- [ ] axe sin violaciones graves
- [ ] prefers-reduced-motion respetado
- [ ] Foco visible
- [ ] Objetivos táctiles >= 44x44 px
- [ ] Texto >= 12 px
- [ ] Reflujo a 320 px sin scroll horizontal

## Responsive (si aplica)

- [ ] `tests/responsive.spec.ts` pasa (barrido 320-1280 px), salida pegada
- [ ] Captura a 375 px de cada pantalla nueva o modificada
- [ ] Revisado a mano un ancho intermedio (480-700 px)
- [ ] Navegación con comportamiento móvil declarado

## Estilo (si aplica)

- [ ] check-palette OK
- [ ] Sin hex ni valores arbitrarios en componentes
- [ ] Solo nombres de token en componentes

## Datos y privacidad

## Problemas conocidos

## Documentación actualizada

- [ ] Spec actualizada (si tocó)
- [ ] ADR creado (si hubo decisión)
- [ ] design/styles/index.md actualizado (si cambió el estilo)
- [ ] CHANGELOG.md actualizado
