# Insights de competencia → entrada para la spec

- Proyecto: Trama (SPEC-001-trama-tienda, aprobada)
- Fase: 3 de 3 (Traducción a spec)
- Fecha: 2026-10-15
- Base: [competidores.md](competidores.md) y [analisis-competencia.md](analisis-competencia.md)
- Etiquetas de evidencia: **[D]** leído en la web del competidor, **[P]** prensa o comparador. Se heredan de la Fase 2.

> **Importante.** SPEC-001 está aprobada y no se edita. Lo que sigue es material para una **enmienda** (`/decide` → ADR + nota de enmienda en la spec + tareas nuevas) o para specs nuevas. Los RF y CA propuestos continúan la numeración (RF-13 en adelante, CA-26 en adelante) y son **borradores**, no requisitos aprobados.

## 1. Imprescindibles

Lo que todo competidor serio tiene. No implementarlo es un riesgo.

| ID | Insight | Evidencia | ¿Lo cubre SPEC-001? | Propuesta |
|---|---|---|---|---|
| I-01 | Navegación por género y tipo de prenda, con **Novedades** y **Rebajas** como accesos de primer nivel | Estándar E1: 4 [D] | **Parcial.** RF-01 filtra por género y categoría. No hay "Novedades" ni "Rebajas". | RF-13: secciones Novedades y Ofertas en la navegación. |
| I-02 | Filtros de listado: **talla, color, precio** y orden (novedades, precio asc/desc) | Estándar E2: 3 [D] | **No.** RF-01 solo filtra por género y categoría. | RF-14: filtros por talla, color y precio, y ordenación. |
| I-03 | **Envío gratis desde un umbral** y devolución gratuita | Estándar E3: Scalpers 40 €, Cortefiel 60 €, Zalando sin umbral claro [D]; Zara y Mango [P] | **Conflicto.** La spec fija tarifa plana y deja las devoluciones fuera (solo texto informativo). | RF-15: envío gratis sobre un umbral configurable. **Decisión pendiente:** el importe (los competidores leídos van de 40 € a 60 €). Mantener la devolución fuera de la app, pero con política visible. |
| I-04 | **Política de envío y devolución visible** en portada, carrito y ficha, con condiciones claras | Scalpers, Cortefiel, Zalando [D] | **Parcial.** Solo "texto informativo". | RF-16: bloque de envío y devolución en home, ficha y carrito, sin asteriscos ocultos. |
| I-05 | **Precio con descuento tachado y %** cuando hay oferta | Estándar E4: 4 [D] | **No.** El modelo tiene un solo `price_cents`. | RF-17: precio de referencia opcional por variante (ver I-08 por el requisito legal). |
| I-06 | Selector de **talla y color** con **guía de tallas** y aviso de "Agotado" por talla | Indicio: Cortefiel ficha, Scalpers tarjeta (2 [D]) | **Parcial.** RF-02 pide elegir talla y color y ver stock. CA-03 cubre talla sin stock. Falta la guía de tallas. | RF-18: guía de tallas por categoría en la ficha. |
| I-07 | Pagos habituales en España: tarjeta y **PayPal**; **Bizum** y pago a plazos aparecen en Zara, El Corte Inglés, Mango y Zalando | Bizum: 2 [P]. Plazos: 1 [D] + 2 [P]. **No llega a estándar.** | **Parcial.** La spec pide Stripe en modo test. | Dejar fuera de esta enmienda. Solo ADR para evaluar métodos en Stripe (VERIFICAR disponibilidad de Bizum y Klarna en Stripe para España). |

### Marcados como imprescindibles condicionados a una decisión

| ID | Insight | Estado de la evidencia | Pregunta |
|---|---|---|---|
| I-08 | Cuando se anuncia un descuento hay que mostrar el **precio más bajo de los últimos 30 días** (Zalando ya lo muestra como "Último precio más bajo" [D]) | La obligación legal viene de la normativa europea de consumo (VERIFICAR su transposición y alcance en España antes de afirmarlo). | ¿Se incluyen descuentos tachados? Si sí, este requisito pasa a obligatorio. |
| I-09 | **Compra como invitado** (sin registro) | Solo Zara [P, 2013-2016]. No es estándar. | La spec exige sesión en el checkout (RF-06). Decidir si se acepta el coste de abandonar carritos por obligar a registrarse. |
| I-10 | **Newsletter** como canal | Estándar E5 incluye apps y newsletter: Zalando, Scalpers, Cortefiel [D] | Implica datos personales y consentimiento. La spec dice cookies solo técnicas y sin marketing. Decidir si entra. |

## 2. Oportunidades de diferenciación

Lo que pocos hacen bien y se puede aprovechar.

| ID | Oportunidad | Quién lo hace hoy | Por qué encaja con Trama | Propuesta |
|---|---|---|---|---|
| O-01 | **"Vestir" como eje de navegación**: sección de sastrería o vestir integrada con el casual | Scalpers, Cortefiel [D]; tendencia en [Modaes](https://www.modaes.com/empresas/del-low-cost-a-la-sastreria-online-los-nuevos-actores-del-hombre-en-espana) | Trama es "casual y de vestir". Ningún competidor leído propone elegir por **ocasión** (casual vs vestir) con la misma prenda. | RF-19: faceta "Ocasión" (casual / vestir) en filtros y menú, además de la categoría. Requiere un campo en `products`. |
| O-02 | **Transparencia de precio**: mostrar precio de referencia honesto ("último precio más bajo") | Solo Zalando [D] | Convierte un requisito legal (I-08) en una señal de confianza. Frente a descuentos permanentes (E4) diferencia. | Se activa solo si se aprueba I-05. |
| O-03 | **Ficha que ayuda a acertar con la talla**: altura del modelo y talla que lleva, composición, cuidados | Cortefiel [D] | Reduce la compra a ciegas. En una tienda sin probador es un argumento central. | RF-20: campos en la ficha para altura y talla del modelo, composición y cuidados. |
| O-04 | **Valoraciones de clientes**: nadie las muestra en las fichas leídas (Cortefiel, Scalpers) | Hueco, no práctica extendida | Prueba social que los nichos no usan. Pero exige moderación y datos de usuarios. | **No ahora.** Registrar como candidata para una spec posterior (afecta RLS y privacidad). |
| O-05 | **Programa de fidelización** | Cortefiel (Club), Scalpers (Partners in Crime) [D] | Los dos competidores nicho/mediano lo tienen. | **No ahora.** Fuera de alcance de un proyecto de portfolio. |

## 3. A evitar

Fricciones que se repiten entre competidores.

| ID | Qué evitar | Dónde se vio | Medida en Trama |
|---|---|---|---|
| A-01 | Condiciones de "envío y devolución gratis" con asterisco y letra pequeña | Zalando [D] | Mostrar las condiciones completas en el mismo bloque (I-04). Criterio de aceptación verificable. |
| A-02 | Ninguna señal de envío, devolución o garantía en portada | El Ganso [D] | Bloque visible en home y ficha (I-04). |
| A-03 | Tarjetas de catálogo con todas las variantes agotadas sin explicación | Scalpers [D] | Mostrar "Agotado" explícito y ofrecer ocultar agotados en filtros. |
| A-04 | Descuentos permanentes que erosionan la referencia de precio | Cortefiel, Zalando, Scalpers [D] | Si hay descuentos, usar el precio de referencia honesto (I-08, O-02). Sin "Todo -30%" permanente. |
| A-05 | Funciones de pago o compra solo en la app | Mango (Klarna) [P] | Todo el flujo de compra funciona en la web. |
| A-06 | Cargos por devolución a domicilio y envío gratis solo en artículos sin descuento | Zara [P] | Política única y simple. Si hay umbral de envío gratis, que cuente el total del carrito. |
| A-07 | Catálogos inmensos sin guía (7.496 polos, 90 páginas) | Zalando [D] | No aplica por tamaño. Mantener un catálogo curado y filtros útiles, no más filtros que productos. |
| A-08 | Cestas incompatibles ("Team Store" y colección no se mezclan) | Scalpers [D] | Una sola cesta para todo el catálogo. |
| A-09 | Funciones que dependen de tiendas físicas (recogida y reserva en tienda) | Cortefiel [D] | No copiar: Trama no tiene tiendas. |

## 4. Cobertura de SPEC-001 y propuesta de enmienda

| Estado | Insights |
|---|---|
| Ya cubierto | I-06 (parcial: talla, color y stock) |
| Cubierto en parte | I-01, I-04 |
| No cubierto | I-02, I-03, I-05, O-01, O-03 |
| Condicionado a decisión | I-08, I-09, I-10, O-02 |
| Fuera de esta enmienda | I-07, O-04, O-05 |

Propuesta de **Enmienda 1** (a través de `/decide`, ADR-003) con:

| RF nuevo | Contenido | CA candidato (Dado/Cuando/Entonces) |
|---|---|---|
| RF-13 | Secciones Novedades y Ofertas | CA-26: Dado productos marcados como nuevos, cuando se abre Novedades, entonces solo aparecen esos. |
| RF-14 | Filtros por talla, color y precio, y ordenación | CA-27: Dado productos con varias tallas, cuando se filtra por talla M, entonces solo se listan los que la tienen con stock. |
| RF-15 | Envío gratis sobre un umbral configurable | CA-28: Dado un carrito por encima del umbral, cuando se calcula el total, entonces el envío es 0 €. |
| RF-16 | Bloque visible de envío y devolución | CA-29: Dada la home, la ficha y el carrito, cuando se cargan, entonces muestran las condiciones de envío y devolución sin asteriscos. |
| RF-17 | Precio de referencia opcional | CA-30: Dado un producto con precio de referencia, cuando se muestra, entonces aparece tachado con % y el precio más bajo de los últimos 30 días (VERIFICAR normativa). |
| RF-18 | Guía de tallas | CA-31: Dada una ficha de camisa, cuando se abre la guía, entonces muestra la tabla de esa categoría. |
| RF-19 | Faceta "Ocasión" (casual / vestir) | CA-32: Dado un producto de vestir, cuando se filtra por Ocasión = vestir, entonces aparece. |
| RF-20 | Datos de ajuste en la ficha | CA-33: Dado un producto con altura y talla del modelo, cuando se abre la ficha, entonces se muestran junto a composición y cuidados. |

Cada RF añade campos de datos (`products`: ocasión, composición, cuidados, "nuevo"; `product_variants`: precio de referencia). **Afecta a T-003b**, que aún no se ha ejecutado, así que es el momento barato de incluirlos.

### Tareas derivadas (orden sugerido, sin crear aún)

| Tarea | Resumen | Depende de |
|---|---|---|
| T-003b (ajuste) | Añadir los campos nuevos al esquema del catálogo antes de ejecutarla | Enmienda 1 |
| T-005 (ampliada) | Catálogo con filtros, orden, Novedades, Ofertas y faceta Ocasión | T-003b |
| T-005b | Ficha con guía de tallas y datos de ajuste | T-005 |
| T-007 (ajuste) | Carrito con umbral de envío gratis | T-005 |
| T-004 (ajuste) | Bloque de envío y devolución en el layout | Enmienda 1 |

## 5. Decisiones pendientes

| # | Decisión | Opciones y trade-off |
|---|---|---|
| 1 | **Umbral de envío gratis** | Los competidores leídos van de 40 € (Scalpers) a 60 € (Cortefiel); Zara 30 € [P, VERIFICAR]. Un umbral bajo atrae pero reduce margen. Es un número que decides tú. |
| 2 | **¿Descuentos con precio tachado?** | Sí: más conversión pero exige el precio más bajo de 30 días (VERIFICAR normativa) y modelo de datos extra. No: tienda más simple y honesta. |
| 3 | **Compra como invitado** | Sí: menos abandono pero hay que cambiar RF-06 y RLS de pedidos sin usuario. No: se mantiene la spec tal cual. |
| 4 | **Newsletter** | Sí: añade consentimiento y datos personales. No: se mantiene la spec. |
| 5 | **Faceta "Ocasión"** | Sí: es el diferencial más propio de Trama. No: se queda en categorías clásicas. |

## 6. Riesgos y límites de este documento

1. **Cobertura parcial.** Zara, Mango y Springfield solo se conocen por prensa. Nada de lo que depende de ellos se marca como estándar.
2. **No hay datos de velocidad, móvil ni checkout real.** No se derivó ningún requisito de esas áreas. Si quieres requisitos de rendimiento basados en competidores, hay que medir primero.
3. **Solo polos.** Blusas, camisas de vestir y pantalones no se analizaron. Lo dicho sobre "ficha" y "catálogo" puede no generalizarse.
4. **Afirmaciones legales.** La obligación del precio más bajo de 30 días y los requisitos de consentimiento están marcados VERIFICAR. No sustituyen asesoramiento legal.
5. **Sin pruebas de conversión.** Nada de lo anterior demuestra que una función aumente las ventas. Son prácticas observadas, no resultados.

## 7. Siguientes pasos sugeridos

1. Responder las 5 decisiones pendientes.
2. Ejecutar `/decide` para registrar **ADR-003** (Enmienda 1 a SPEC-001) con los RF aprobados.
3. Ajustar T-003b antes de ejecutarla para incluir los campos nuevos.
4. Crear con `/new-task` las tareas derivadas.
