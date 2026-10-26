---
description: Aplica el estándar de diseño "Impeccable" (Craft Floor, tipografía, espaciado y micro-interacciones).
---

1. Erradica lo genérico: cambia `shadow-md` por tokens (`shadow-card`),
   quita grises de Tailwind, usa tokens del sistema.
2. Ajusta espaciados a la cuadrícula de 8px (`gap-6`, `py-12`).
3. Mejora tipografía: `tracking-tight` en titulares, `leading-relaxed`
   en párrafos.
4. Añade micro-interacciones (hovers con `var(--duration-base)` y `var(--ease-soft)`, nunca `duration-300`),
   con alternativa estática bajo `prefers-reduced-motion` (I7).
5. Pasa typecheck y lint.

JERARQUÍA: El style.md del proyecto tiene la última palabra sobre la densidad, el layout y la duración del movimiento. El Craft Floor se aplica para erradicar colores y sombras genéricas, y para garantizar la jerarquía tipográfica, pero siempre usando los tokens del estilo activo.
