---
id: ADR-003
title: Enmendar SPEC-001 con los insights de competencia (RF-13 a RF-20)
status: aceptada
date: 2026-10-15
os_version: 0.1.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda, T-003b]
---

# ADR-003 — Enmienda 1 a SPEC-001: insights de competencia

## Contexto

Se hizo un estudio de la competencia en moda online en España
(`research/competidores.md`, `research/analisis-competencia.md`,
`research/competitor-insights.md`). Cinco patrones aparecen en tres o más
competidores y SPEC-001, ya aprobada, no los cubre o los contradice:
navegación con Novedades y Rebajas, filtros de talla/color/precio, envío gratis
con umbral, política de envío y devolución visible, y precio tachado.

SPEC-001 fija una tarifa plana de envío y no tiene filtros ni precio de
referencia. T-003b (catálogo) todavía no se ha ejecutado, así que añadir campos
al modelo de datos ahora es barato.

## Alternativas consideradas

1. **Enmienda completa (RF-13 a RF-20)** — cubre imprescindibles y
   diferenciales (faceta Ocasión, datos de ajuste en la ficha). Más trabajo,
   pero coherente con "proyecto a fondo".
2. **Solo los imprescindibles** — menos alcance y menos riesgo, pero pierde el
   diferencial propio de Trama (casual y de vestir).
3. **No enmendar y abrir una spec 002 más adelante** — deja la spec
   contradiciendo lo decidido (tarifa plana frente a envío gratis con umbral) y
   obliga a migrar datos del catálogo después.

## Decisión

Se elige la alternativa 1. SPEC-001 se enmienda (Enmienda 1) con:

- RF-13 a RF-20 y CA-26 a CA-33 (ver la spec, sección 12).
- Envío gratis desde **50 €**; por debajo se mantiene la tarifa plana.
- **Precios tachados** con porcentaje y **precio más bajo de los últimos 30
  días obligatorio** (RF-17). La normativa exacta queda como VERIFICAR y
  **CA-30 no se cierra sin confirmarla**.
- Faceta **Ocasión** (casual / vestir) y datos de ajuste en la ficha.

Decisiones descartadas, con motivo:

- **Compra como invitado: no.** Solo hay un indicio en una fuente antigua, y
  cambiarla obliga a rehacer RF-06 y las políticas RLS de pedidos sin
  usuario. Se mantiene el registro obligatorio.
- **Newsletter: no.** Añade datos personales y consentimiento. La spec sigue
  con cookies solo técnicas.
- **Valoraciones de clientes y programa de fidelización:** quedan fuera; se
  reconsiderarán en una spec posterior.

El diseño del historial de precios (tabla y cálculo de 30 días) es una decisión
técnica propia y se registrará en un ADR aparte (ADR-004) cuando llegue su
tarea.

## Consecuencias

Positivas:
- La tienda cubre los patrones habituales del rubro y mantiene un diferencial.
- Los campos nuevos del catálogo entran antes de ejecutar T-003b, sin migrar
  después.
- La spec deja de contradecirse con la política de envío.

Negativas:
- Más alcance: 8 RF y 8 CA nuevos, y tareas adicionales (T-003c, T-005b,
  ajustes de T-004, T-005 y T-007).
- El precio de referencia depende de un historial de precios que todavía no
  está diseñado ni verificado legalmente.
- La evidencia del estudio es parcial: Zara, Mango y Springfield solo por
  prensa, y solo se analizaron polos.
- Revertir cuesta más una vez aplicadas las migraciones del catálogo.

## Relación con la constitución

- I1 (spec-first): el cambio entra por enmienda y ADR, no se edita la spec
  aprobada.
- I9 (trazabilidad): cada RF nuevo tiene CA propio.
- I3 y privacidad: sin newsletter ni invitado no hay datos personales nuevos.
- Límites: lo marcado VERIFICAR no se afirma como hecho.
