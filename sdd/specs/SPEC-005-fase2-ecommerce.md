---
id: SPEC-005-fase2-ecommerce
title: Fase 2 — área de usuario, ofertas y sección de app móvil
status: aprobada
rigor_level: L
created: 2026-10-24
updated: 2026-10-24
aprobada: 2026-10-24 (decisiones DP-1 a DP-10 del usuario, ver Decisiones adoptadas)
---

# SPEC-005 — Fase 2: área de usuario, ofertas y «Trama en tu móvil»

> APROBADA el 2026-10-24 con las decisiones de la sección «Decisiones adoptadas» (al final), que prevalecen sobre cualquier opción abierta del texto.
> Se numera 005 porque SPEC-004 ya existe (integración continua, aprobada) y SPEC-002 reserva el nombre SPEC-003. El «paso 1» del
> usuario (`/buscar` con la tarjeta completa) no va aquí: se cubrió con la Enmienda 42 de SPEC-001 y la tarea T-098.
> Todo lo marcado **VERIFICAR** o **DP-n** (decisión pendiente) está sin decidir; ninguna cifra ni texto legal está inventado.

## 0. Qué existe ya (comprobado en el repo, no se vuelve a pedir)

| Pieza | Estado real | Dónde |
|---|---|---|
| `/cuenta` (perfil + lista de direcciones) | **Existe**, sin barra lateral: una sola página con «Cerrar sesión» arriba | `src/app/cuenta/page.tsx` |
| Direcciones: `/cuenta/direcciones/nueva` y `/cuenta/direcciones/[id]` | **Existen** (alta, edición, borrado) | `src/app/cuenta/direcciones/` |
| Tabla `public.addresses` con RLS (select/insert/update/delete propias) | **Existe** desde la migración inicial. **No se propone otra tabla** | `20261012000000_identity_and_orders.sql` |
| Tabla `profiles` (`full_name`, `role`) | **Existe** | ídem |
| `/cuenta/pedidos` y `/cuenta/pedidos/[id]` | **Existen** | `src/app/cuenta/pedidos/` |
| `/acceso`, `/registro`, `/recuperar` | **Existen como páginas** (no hay modal) | `src/app/acceso`, `registro`, `recuperar` |
| Favoritos | **Solo documentados, NO implementados**: ADR-010 y Enmienda 21 (RF-24, CA-73 a CA-78) existen, pero T-041, T-042 y T-043 están `pendiente`, no hay tabla `favorites` ni código. **Se reutiliza ese diseño; no se reabre la decisión** | `sdd/adrs/ADR-010`, `sdd/tasks/T-041..043` |
| Cupón de bienvenida 10 % (`welcome_coupons`, T-093/T-094) | **Existe**: un código por email, un solo uso, primera compra | migración `20261023000000` |
| `products.is_new` (booleano) | **Existe**; filtro `onlyNew` en `queries.ts` | `20261015000000_catalog_and_cart.sql` |
| Rebajas: `product_variants.compare_at_cents` (> `price_cents`) | **Existe** (T-075); insignia «−N %» y precio tachado en la tarjeta; 5 prendas de ejemplo en `supabase/seed/catalog-discounts.sql` | `20261021000000_compare_at_price.sql` |
| `/ofertas` | **Existe pero vacía**: siempre muestra «Ahora mismo no hay ofertas». La Enmienda 32 la dejó «como tarea aparte» | `src/app/ofertas/page.tsx` |
| Puntos de fidelización, referidos, `is_offer` | **No existen** | — |

## 1. Objetivos

1. Que la cuenta del cliente se parezca a la de una tienda real: modal de acceso, `/cuenta` con barra lateral y secciones claras.
2. Que la sección **Ofertas** funcione de verdad (hoy está vacía aunque hay rebajas en la BD) y que haya más productos nuevos.
3. Añadir en la portada una sección «Trama en tu móvil» que deje claro que es una demo.
4. (Opcional, sujeto a DP-4 y DP-5) Programa de puntos «Trama Club» y de referidos «Recomienda y gana».

## 2. Fuera de alcance

1. Una app móvil real (Paso 4 es solo una sección de portada).
2. Cobro real, puntos canjeables por dinero real, o sorteos/premios con valor real.
3. Email transaccional propio (SPEC-001 §2.5): las invitaciones de referidos no se envían por correo.
4. Inicio de sesión social (Google, Apple…), 2FA, borrar cuenta (VERIFICAR si se quiere; RGPD obliga a poder ejercer la supresión: ver §9).
5. Cambiar de estilo (se mantiene `v1-soft-commerce@0.3.0`; `/cuenta` no es un panel de administración, `rules/styles.md`).
6. Reseñas.

## 3. Requisitos funcionales

### Paso 2 — Área de usuario

| ID | Requisito |
|---|---|
| RF-01 | **Modal de acceso.** El icono de usuario de la cabecera abre un modal con pestañas «Iniciar sesión» / «Crear cuenta», con el mismo contenido y validación que `/acceso` y `/registro` (se reutilizan sus acciones de servidor). Sin JavaScript, el icono sigue siendo un enlace a `/acceso` (`rules/ui-decisions.md`: icono de acción como enlace con hash). Las páginas `/acceso` y `/registro` se mantienen (retornos de `?siguiente=`, enlaces externos). Diseño (DP-1, opción C): reglas de diseño premium del OS, sin referencia externa. Tarjeta centrada con imagen a la izquierda y formulario a la derecha desde 768 px; por debajo, solo el formulario. |
| RF-02 | **`/cuenta` con barra lateral** con cuatro entradas: «Mis datos», «Mis pedidos», «Mis favoritos», «Cerrar sesión». Escritorio: columna lateral persistente (convención SaaS/e-commerce). Móvil: pestañas horizontales desplazables (DP-2, opción A). Entradas finales: «Mis datos», «Mis pedidos», «Mis favoritos», «Trama Club», «Recomienda y gana» y «Cerrar sesión». |
| RF-03 | **Mis datos** (`/cuenta`): nombre (ya existe `ProfileForm`), cambio de contraseña (ya existe, aviso `?aviso=contrasena`) y **gestión de direcciones** con lo que ya hay (`addresses`). No hay nueva tabla ni nueva pantalla de direcciones; solo se integran en la barra. |
| RF-04 | **Mis pedidos**: reutiliza `/cuenta/pedidos`. Solo se mueve bajo el layout con barra lateral. |
| RF-05 | **Mis favoritos** (`/cuenta/favoritos`): se implementa lo ya aprobado en ADR-010 / RF-24 (T-041, T-042, T-043). Esta spec solo los **coloca** en la barra; no duplica sus CA. |
| RF-06 | **Cerrar sesión**: acción existente (`logoutAction`), ahora en la barra lateral. |
| RF-07 | **Trama Club**: pantalla `/cuenta/club` **solo informativa** («Próximamente», DP-4 opción B). Sin tablas, sin lógica, sin canje, sin cifras. Explica en una frase qué será y deja claro que aún no está disponible. |
| RF-08 | **Recomienda y gana**: pantalla `/cuenta/recomienda` **solo informativa** («Próximamente», DP-5 opción B). Sin código de referido, sin tabla, sin lógica. |

### Paso 3 — Ofertas y novedades

| ID | Requisito |
|---|---|
| RF-09 | **Más productos «nuevos».** Se marcan **8 productos que ya existen en el catálogo** con `is_new = true` en un seed idempotente (DP-6). Sin columna nueva ni productos nuevos. Aplicarlo a `trama-dev` (compartida) exige permiso expreso del usuario. |
| RF-10 | **Oferta = variante con `compare_at_cents`** (DP-3 opción A). **No se crea `is_offer`** ni ninguna columna: una sola fuente de verdad. Un producto está en oferta si alguna de sus variantes activas tiene `compare_at_cents` no nulo. |
| RF-11 | **`/ofertas` conectada:** lista las prendas ofertadas (misma `ProductCard` completa) con contador, filtros/orden del catálogo si aplica, y el estado vacío actual solo cuando no haya ninguna. |
| RF-12 | **Banner en la página de Ofertas:** franja superior con titular, texto corto y, si procede, «hasta −N %» calculado de los datos reales (no un número fijo en el código). Imagen del banner como estático optimizado (ADR-009). |

### Paso 4 — «Trama en tu móvil»

| ID | Requisito |
|---|---|
| RF-13 | **Sección al final de la portada**, antes del pie: titular «Trama en tu móvil», texto breve, mockup de un teléfono con la tienda y dos botones de tienda (App Store / Google Play). |
| RF-14 | **Aviso explícito de demostración:** «Trama es un proyecto de demostración: no existe una app real.» visible en la propia sección (`role="note"`), no solo en un tooltip. |
| RF-15 | **Qué hacen los botones** (la puerta 7 prohíbe enlaces muertos y `#`): ver DP-7. Decisión (DP-7, opción A): son botones que abren un pequeño diálogo accesible «App no disponible — esto es una demo» con enlace a `/novedades`; **nunca** enlazan a las tiendas reales ni a una URL inventada. |
| RF-16 | Mockup: teléfono maquetado en HTML/CSS con capturas de la propia tienda como estáticos (DP-8 opción B); sin API ni coste. |

## 4. Requisitos no funcionales

- **Accesibilidad AA** (I6): modal con `role="dialog"`, `aria-modal`, foco atrapado y devuelto, Esc / X / clic fuera (puerta 7); barra lateral con `nav` etiquetada y `aria-current`; zonas táctiles ≥ 44 px; texto ≥ 12 px.
- **Movimiento** (I7): sin transición con `prefers-reduced-motion`; sin scroll-jacking.
- **Responsive 320–1280 px** sin scroll horizontal; `tests/responsive.spec.ts` ampliado con `/cuenta`, `/ofertas` y la portada; captura a 375 px de cada pantalla nueva.
- **Estilo por tokens** (v1-soft-commerce@0.3.0): sin hex ni valores arbitrarios; `check-palette` verde.
- **Convención del sector** (`rules/ui-decisions.md`): barra lateral de cuenta en escritorio, modal de acceso, banner de ofertas; cualquier desvío se justifica en `## Decisiones de UI` del plan.
- **Rendimiento:** la portada sigue estática (el layout no lee la sesión, Enmienda 37); el modal averigua la sesión en cliente.
- **Zod** (I5) en toda entrada nueva (código de referido, canje de puntos, formularios del modal).
- **Tests:** cada CA con test; RLS con prueba de aislamiento por cada tabla nueva (I3).

## 5. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| Abrir el modal con la sesión ya iniciada | El icono lleva a `/cuenta` (no abre el modal). |
| Login desde el modal con `?siguiente=` / carrito de invitado | Se conserva el retorno y se fusiona el carrito (`GuestCartMerger`). |
| Cliente sin pedidos / sin direcciones / sin favoritos | Estado vacío con enlace útil, no pantalla en blanco. |
| Producto con `is_offer` pero sin `compare_at_cents` (si DP-3 = opción B) | Debe impedirse con una restricción de BD; no existe oferta sin descuento. |
| Producto ofertado agotado | Se muestra con «Agotado», sin panel de compra. |
| `/ofertas` sin ofertas | Estado vacío actual. |
| Usuario se auto-refiere / dos cuentas con el mismo email / ciclo de referidos | Se rechaza (§8). |
| Puntos tras un pedido cancelado o reembolsado | Se revierten o nunca se conceden hasta `pagado` (DP-4). |
| Botones de «tienda de apps» sin app | Abren el diálogo de demo (RF-15), nunca un enlace muerto. |

## 6. Estados de error y vacío en la UI

- Modal: error de credenciales y de red con `role="alert"` y sin cerrar el modal; cuenta ya existente; contraseña débil.
- `/cuenta/*`: fallo de carga con el aviso existente («No hemos podido cargar tus datos…»); vacíos con CTA.
- `/ofertas`: error de datos propagado a `error.tsx` del catálogo; vacío con enlace a Novedades.
- Club/referidos: saldo 0, código inexistente o caducado, límite alcanzado: mensajes concretos.

## 7. Máquina de estados

Solo si se aprueban Club y referidos (DP-4, DP-5):

- Movimiento de puntos: `pendiente` → `confirmado` (pedido `pagado`) → `canjeado` / `caducado` / `revertido`.
- Referido: `registrado` → `primer_pedido_pagado` (recompensa concedida) / `rechazado` (fraude o cancelación).

## 8. Riesgos de seguridad

- **Antifraude de referidos** (el mayor riesgo): auto-referidos con emails desechables (en esta demo no se verifica el email: `mailer_autoconfirm`, Enmienda 41), granjas de cuentas, ciclos. Mitigaciones candidatas: la recompensa solo al **primer pedido pagado**, un referido por cuenta nueva, tope por referidor, comprobación de que referidor ≠ referido, y cálculo **solo en el servidor** (el navegador nunca manda importes). **VERIFICAR** el nivel de rigor aceptable para una demo.
- **Puntos:** concesión y canje en el servidor, idempotentes (webhook de Stripe repetido no duplica puntos), con tabla de movimientos append-only (no un saldo editable).
- **RLS** (I3) en toda tabla nueva: el cliente solo lee sus puntos/referidos; nadie escribe desde el cliente; solo servicio. Prueba de aislamiento entre usuarios.
- **Modal de acceso:** mismas protecciones que `/acceso` (validación Zod, `nextPathSchema` contra redirecciones abiertas, sin enumeración de cuentas en los mensajes).
- **Enlace/código de referido:** aleatorio y no adivinable; no revelar el email del referidor.
- **Banner/sección de app:** no usar marcas de tiendas de apps de forma que sugiera una app real o una afiliación (**VERIFICAR** guías de uso de marca de Apple y Google antes de usar sus insignias oficiales; DP-7).
- Migraciones: se aplican a mano a `trama-dev`, **compartida con la web pública**; las migraciones de esta fase no deben alterar datos existentes y el seed de nuevos/ofertas debe ser idempotente (los tests esperan stock concreto; no se tocan cantidades).

## 9. Datos y privacidad

| Dato | Para qué | Cuánto tiempo | Cómo se borra |
|---|---|---|---|
| Direcciones, perfil | Ya existen | Ya definido | Borrado en cascada con la cuenta |
| Favoritos (`favorites`, ADR-010) | Apartado de favoritos | Mientras exista la cuenta | Cascada |
| Puntos (movimientos) — si DP-4 | Programa Club | **VERIFICAR** (caducidad) | Cascada con la cuenta |
| Referidos (quién invitó a quién) — si DP-5 | Recompensa y antifraude | **VERIFICAR** | Cascada; el referido es dato personal de un **tercero**: el referidor ve a lo sumo un contador, no su email |

- Puntos y referidos son **perfilado/relaciones entre personas**: exigen actualizar `/privacidad` y las condiciones del programa. **VERIFICAR con asesoría legal** (base jurídica, información a terceros referidos, condiciones de la promoción). **No se redactan textos legales aquí.**
- El derecho de supresión implica poder borrar la cuenta (hoy no existe): fuera de alcance de este borrador pero **DP-9**.
- Modal, banner y sección de app no guardan datos nuevos.

## 10. APIs externas y términos de servicio

- **Supabase (Auth/BD):** sin llamadas nuevas más allá de las ya usadas; sin coste adicional.
- **Stripe:** los puntos o referidos **no** pasan por Stripe salvo que se conviertan en cupón de pago (reutilizaría el mecanismo `amount_off` de la Enmienda 41; **VERIFICAR** en DP-4). Sin nuevos costes ni topes.
- **App Store / Google Play:** no se integra ninguna API. Las insignias oficiales tienen **guías de marca propias (VERIFICAR)**; propuesta: no usarlas (DP-7).
- **Generación de imagen del mockup:** si se usa un servicio de pago, tope de coste según `docs/costs.md` (**VERIFICAR**); alternativa sin API en DP-8.

## 11. Criterios de aceptación

(Numeración propia de SPEC-005.)

**| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-01 | RF-10 | Productos con y sin `compare_at_cents` en alguna variante activa | Se consulta la lista de ofertas | Devuelve solo los que tienen al menos una variante con `compare_at_cents` no nulo, sin duplicados, con la misma forma que el catálogo; sin ofertas devuelve `[]` | integración (BD real, solo lectura) y unitario |
| CA-02 | RF-11 | `/ofertas` con ofertas | Se abre | Lista esas prendas con la tarjeta completa (CA-122/CA-141 de SPEC-001: hover, tallas, añadir), contador y rejilla del catálogo | e2e + unitario |
| CA-03 | RF-11 | `/ofertas` sin ofertas | Se abre | Estado vacío actual con enlace a Novedades | unitario |
| CA-04 | RF-12 | `/ofertas` | Se mira | Banner superior con titular, texto y «hasta −N %» calculado del mayor descuento real (redondeado como la tarjeta); sin ofertas no hay cifra; imagen estática optimizada con `alt`; legible de 320 a 1280 px | e2e + unitario |
| CA-05 | RF-11, RF-12 | `/ofertas` de 320 a 1280 px | Se abre | Sin scroll horizontal ni recortes; axe sin violaciones graves; captura a 375 px en la review | e2e, `responsive.spec.ts` ampliado, test:a11y |
| CA-06 | RF-09 | El seed de novedades | Se revisa | Marca exactamente 8 productos existentes con `is_new = true` por `slug`, es idempotente y no toca stock, precios ni otras columnas | revisión + comprobación documentada tras aplicarlo (con permiso) |
| CA-07 | RF-02, RF-06 | Un cliente con sesión | Abre cualquier `/cuenta/*` | Barra lateral (≥ 768 px) / pestañas horizontales desplazables (< 768 px) con las seis entradas, `nav` con nombre, `aria-current` en la activa, zonas ≥ 44 px, «Cerrar sesión» como formulario; sin sesión redirige a `/acceso` | e2e + axe |
| CA-08 | RF-03, RF-04 | `/cuenta`, `/cuenta/direcciones/*`, `/cuenta/pedidos/*` | Se abren | Funcionan igual que antes dentro del layout nuevo; sin tabla ni pantalla de direcciones nuevas | tests e2e existentes de cuenta + responsive |
| CA-09 | RF-05 | Las entradas de la barra | Se pulsan | «Mis favoritos» lleva a `/cuenta/favoritos` (T-043); ninguna entrada es un enlace muerto | e2e |
| CA-10 | RF-07 | `/cuenta/club` | Se abre | Pantalla informativa «Próximamente», sin formularios ni cifras, sin acceso a la BD más allá de la sesión | unitario + e2e |
| CA-11 | RF-08 | `/cuenta/recomienda` | Se abre | Pantalla informativa «Próximamente», sin código de referido ni lógica | unitario + e2e |
| CA-12 | RF-01 | El icono de usuario sin sesión | Se pulsa | Se abre el modal con pestañas «Iniciar sesión» / «Crear cuenta» (reutiliza las acciones y la validación de `/acceso` y `/registro`); `role="dialog"`, `aria-modal`, foco atrapado y devuelto, Esc / X / clic fuera, `body` sin scroll; imagen a la izquierda y formulario a la derecha desde 768 px, solo formulario por debajo; sin movimiento con `prefers-reduced-motion` | unitario + e2e |
| CA-13 | RF-01 | Sin JavaScript, o con sesión | Se pulsa el icono | Sin JS lleva a `/acceso`; con sesión lleva a `/cuenta`; el error de credenciales se anuncia sin cerrar el modal; se conserva `?siguiente=` y se fusiona el carrito | e2e |
| CA-14 | RF-13, RF-14 | La portada | Se mira el final | Sección «Trama en tu móvil» antes del pie con teléfono maquetado, dos botones de tienda y el aviso `role="note"` «Trama es un proyecto de demostración: no existe una app real.»; la portada sigue estática | unitario + e2e |
| CA-15 | RF-15 | Los botones de tienda | Se pulsan | Abren un diálogo accesible «App no disponible» con enlace a `/novedades`, cerrable con Esc / X / clic fuera; ningún enlace a tiendas reales ni `#` | e2e |
| CA-16 | RF-16 | La sección de app de 320 a 1280 px | Se abre | Sin scroll horizontal ni recortes; imágenes con `alt`; axe sin violaciones graves; captura a 375 px | e2e, responsive, a11y |

## 12. Tareas (orden de DP-10: Ofertas primero)

| Orden | Tarea | CA |
|---|---|---|
| 1 | T-099 Consulta de ofertas (lectura, sin migración) | CA-01 |
| 2 | T-100 `/ofertas` conectada + banner | CA-02 a CA-05 |
| 3 | T-101 Seed de 8 novedades (`is_new`) | CA-06 |
| 4 | T-041, T-042, T-043 Favoritos (ya existentes, pendientes) | RF-24 de SPEC-001 |
| 5 | T-102 Layout de `/cuenta` con barra lateral y pestañas | CA-07 a CA-09 |
| 6 | T-103 Trama Club informativo | CA-10 |
| 7 | T-104 Recomienda y gana informativo | CA-11 |
| 8 | T-105 Modal de acceso | CA-12, CA-13 |
| 9 | T-106 Sección «Trama en tu móvil» y diálogo | CA-14 a CA-16 |

## Decisiones adoptadas (2026-10-24)

| # | Decisión del usuario |
|---|---|
| DP-1 | Opción C: reglas de diseño premium del OS; modal con tarjeta centrada, imagen a la izquierda y formulario a la derecha. |
| DP-2 | Opción A: pestañas horizontales desplazables en móvil. |
| DP-3 | Opción A: usar `compare_at_cents`; no se crea `is_offer`. |
| DP-4 y DP-5 | Opción B: Trama Club y Recomienda y gana como pantallas informativas «Próximamente» en la barra lateral, sin BD ni canje. |
| DP-6 | 8 productos existentes con `is_new = true` en el seed. |
| DP-7 | Opción A: diálogo «App no disponible». |
| DP-8 | Opción B: teléfono maquetado en HTML/CSS con capturas de la tienda. |
| DP-9 | Diferir «borrar mi cuenta» (anotado: requisito de privacidad pendiente). |
| DP-10 | Opción B: Ofertas primero. |

**Consecuencias:** al no haber puntos ni referidos funcionales, desaparecen de esta fase las tablas, el antifraude y los textos legales de §8 y §9 (siguen siendo condición para una spec futura que los implemente). No hay migración de ofertas. Los favoritos (T-041 a T-043) deben cerrarse antes de la barra lateral para que «Mis favoritos» no sea un enlace muerto.

---

## Enmienda 1 — 2026-10-25 — sin ADR — menú desplegable del icono de usuario (RF-17, CA-17 a CA-20)

**Origen:** el usuario pide que el icono de usuario de la cabecera, con sesión, despliegue un menú flotante en lugar de llevar a `/cuenta` (referencia de estilo: Sprinter). **Matiza RF-01 y CA-13**: sin sesión sigue abriéndose el modal de acceso; con sesión, en vez de ir a `/cuenta`, se abre el menú. Sin JavaScript el icono sigue siendo un enlace a `/cuenta`.

- **RF-17 (nuevo):** con sesión, el icono abre un menú con «Hola, <nombre>» (nombre del perfil; sin nombre, «Hola») y las entradas «Mis datos» (`/cuenta`), «Mis pedidos» (`/cuenta/pedidos`), «Trama Club» (`/cuenta/club`) y «Cerrar sesión» (acción de servidor existente). **Se piden solo esas cuatro**: «Mis favoritos» y «Recomienda y gana» siguen en la barra de la cuenta (T-102) y no están en el menú (decisión a confirmar).
- Se cierra con un clic fuera, con Esc y al elegir una entrada; el foco vuelve al icono con Esc.
- **Accesibilidad:** el icono lleva `aria-haspopup` y `aria-expanded`; el menú, `role="menu"` con `role="menuitem"` y navegación con flechas, Inicio y Fin.
- **Estilo:** tokens de v1 (`bg-surface`, `border-border`, `rounded-container`, `shadow-card`), no las clases `rounded-xl shadow-lg` del encargo: la regla de estilos prohíbe valores fuera de los tokens.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-17 | RF-17 | Un cliente con sesión en cualquier página | Pulsa el icono de usuario | Se abre un menú (`role="menu"`) bajo el icono con «Hola, <nombre>», «Mis datos», «Mis pedidos», «Trama Club» y «Cerrar sesión»; el icono pasa a `aria-expanded="true"`; no navega | e2e `user-menu` y unitario |
| CA-18 | RF-17 | El menú abierto | Se pulsa fuera, se pulsa Esc o se elige una entrada | Se cierra; con Esc el foco vuelve al icono; cada entrada lleva a su destino y «Cerrar sesión» cierra la sesión | e2e `user-menu` |
| CA-19 | RF-17 | El menú abierto | Se usa el teclado | La primera entrada recibe el foco; flechas arriba/abajo, Inicio y Fin recorren las entradas; Tab saca el foco y cierra el menú; axe sin violaciones graves | e2e `user-menu` y unitario |
| CA-20 | RF-17, RF-01 | Un visitante sin sesión, o sin JavaScript | Pulsa el icono | Sin sesión abre el modal de acceso (CA-12); sin JavaScript va a `/cuenta`; de 320 a 1280 px el menú no se sale del viewport ni causa scroll horizontal | e2e `user-menu` y `auth-modal` |

**Nueva tarea derivada:** T-107 (componente `UserMenu` e integración en la cabecera).

---

## Enmienda 2 — 2026-10-25 — sin ADR — contador en el icono de la cesta (RF-18, CA-21 a CA-24)

**Origen:** el usuario pide un badge con el número de artículos en el icono de la cesta de la cabecera. **Amplía RF-03 de SPEC-001** (carrito) sin cambiar ninguno de sus CA.

**Realidad del carrito (condiciona el diseño):** no existe un `useCart` global con `items[].quantity`. El carrito de invitado vive en `localStorage` (`useSavedCart`, líneas `{ variantId, qty }`) y el de la cuenta, en la BD (`getAccountCartAction`). Un contador correcto tiene que servir a los dos.

- **RF-18 (nuevo):** el icono de la cesta de la cabecera muestra el **total de unidades** (suma de `qty`) en un badge. Oculto con 0 unidades; con más de 9, «9+».
- **Invitado:** se calcula de `localStorage` y se actualiza al instante, también entre pestañas.
- **Con sesión:** se pregunta a `getAccountCartAction` (existente) al montar la cabecera y en cada cambio de ruta; los puntos que modifican el carrito de la cuenta (añadir, cantidad, quitar) avisan al contador con el carrito resultante, sin otra consulta. Al cerrar sesión vuelve al contador de invitado. **Coste asumido:** una consulta ligera por navegación; la portada y la cabecera siguen siendo estáticas (el contador se rellena tras la hidratación).
- **Accesibilidad:** el enlace lleva `aria-label="Carrito, N artículo(s)"` (sin cantidad, «Carrito»); el badge es decorativo (`aria-hidden`) y no recibe clics (`pointer-events-none`). Texto de 12 px como mínimo (`--text-min`).
- **Estilo:** tokens de v1 (`bg-accent`, `text-accent-fg`, `text-xs`, `min-w-5 h-5`), no `text-[10px]` ni `min-w-[18px]` del encargo: la regla de estilos prohíbe valores arbitrarios y el texto no puede bajar de 12 px.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-21 | RF-18 | Un invitado con 0, 1, 9 y 10 unidades en la cesta | Mira la cabecera | Sin unidades no hay badge; con 1, «1»; con 9, «9»; con 10 o más, «9+»; cuenta unidades, no líneas | unitario y e2e `cart-badge` |
| CA-22 | RF-18 | Un invitado | Añade o quita una prenda (ficha, tarjeta, drawer o `/carrito`) | El badge cambia al momento y se conserva al recargar | e2e `cart-badge` |
| CA-23 | RF-18 | Un cliente con sesión | Añade una prenda, cambia su cantidad, la quita, navega o recarga, y cierra sesión | El badge refleja el carrito de la cuenta en cada paso; al cerrar sesión pasa a reflejar el del navegador | e2e `cart-badge` |
| CA-24 | RF-18 | El icono de la cesta con prendas | Se mira y se usa | `aria-label="Carrito, N artículos"` (singular con 1); el badge es `aria-hidden` y `pointer-events-none` (el clic abre el carrito lateral); de 320 a 1280 px no sale del viewport ni causa scroll horizontal; axe sin violaciones graves | e2e `cart-badge`, test:a11y |

**Nueva tarea derivada:** T-108 (contador del carrito en la cabecera).

---

## Enmienda 3 — 2026-10-26 — sin ADR — teléfono realista con una captura de la tienda (RF-16, CA-25 y CA-26)

**Origen:** al usuario no le gusta el teléfono maquetado de «Trama en tu móvil» (T-106): quiere un mockup más realista, como el de las referencias que aporta (un iPhone inclinado con la tienda en pantalla). **Sustituye** la forma de RF-16 y de DP-8 B: el teléfono sigue maquetado en HTML y CSS (sin API de imágenes ni servicios de pago), pero ahora con un marco realista y **una captura real de la portada** de la tienda como pantalla, en lugar de una cuadrícula dibujada con fotos sueltas. Es la «captura de la propia tienda» que DP-8 B ya preveía.

- **Marco:** bisel de titanio con degradado y reflejo, isla dinámica, botones laterales (silencio, volumen y encendido), esquinas de iPhone, sombra suave e inclinación en 3D (rotación en los tres ejes con perspectiva), solo con tokens. **No usa marcas ni logotipos de terceros.**
- **Pantalla:** `hero-app-pantalla.webp/.avif` (en `public/images/hero/`), captura de `/` a 390 × 844 px con densidad 3 (1170 × 2532) hecha con Playwright, optimizada con el pipeline del proyecto (ADR-009) y servida sin recompresión.
- **Accesibilidad:** el teléfono es decorativo (`aria-hidden`, imagen con `alt` vacío); la sección conserva su titular, el aviso de demostración y los botones (CA-14 y CA-15 no cambian).
- **Movimiento:** estático (sin animación), así que `prefers-reduced-motion` ya está cubierto. En móvil la inclinación se reduce para que no se salga del viewport.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-25 | RF-16 | La sección «Trama en tu móvil» | Se mira el teléfono | Es un marco de iPhone realista (bisel, isla dinámica, botones laterales, reflejo y sombra) inclinado en 3D, con la captura real de la portada como pantalla (`object-cover`, nítida, no una cuadrícula dibujada); decorativo (`aria-hidden`, `alt` vacío); sin imagen de terceros ni logotipos | test unitario y e2e `mobile-app` |
| CA-26 | RF-16 | La sección de 320 a 1280 px | Se abre | El teléfono inclinado queda dentro del viewport, sin recortes ni scroll horizontal; la captura carga sin deformarse (proporción 390 × 844) | e2e `mobile-app`, responsive |

**Nueva tarea derivada:** T-112 (teléfono realista).

## Enmienda 4 — 2026-10-26 — sin ADR — icono de favoritos (corazón) en la cabecera (RF-24, CA-27)

**Origen:** el usuario pide un icono de corazón de favoritos en la parte derecha de la cabecera. **Amplía** la Enmienda 21 de SPEC-001 (favoritos en la ficha) con un acceso directo a `/cuenta/favoritos`.

- **Dónde:** junto a los iconos de acción de la derecha, antes del de cuenta y la cesta (orden habitual del sector: favoritos, cuenta, cesta), en escritorio y en móvil. Icono `Heart` de lucide, zona táctil de 44 × 44 px, `aria-label="Mis favoritos"`.
- **Destino:** enlace a `/cuenta/favoritos`. Sin sesión, la página protegida lleva al acceso (comportamiento existente de `/cuenta`) y, tras entrar, a favoritos. Sin contador ni estado relleno: la cabecera sigue siendo estática y no lee la sesión (mismo motivo que la Enmienda 2).
- **Anchos estrechos:** los cinco iconos (buscar, favoritos, cuenta, cesta, menú) de 44 px más el logo no caben por debajo de 370 px. Por debajo de ese ancho el logo muestra solo el símbolo (el enlace sigue llamándose «Trama, ir al inicio»); desde 370 px, igual que ahora. Se usa una variante de ancho exacto porque ningún `--bp-*` cae ahí; es el único valor arbitrario y se justifica en el plan.
- **Fuera de alcance:** corazón en la `ProductCard`.

| ID | RF | Dado | Cuando | Entonces | Verificación |
|---|---|---|---|---|---|
| CA-27 | RF-24 | La cabecera de cualquier página, de 320 a 1280 px | Se mira a la derecha | Hay un icono de corazón (enlace «Mis favoritos» a `/cuenta/favoritos`, 44 × 44 px) antes del de cuenta y la cesta; no provoca desbordamiento ni recortes | test unitario de navegación, e2e `responsive` y `cart-badge`/cabecera |

**Nueva tarea derivada:** T-114 (icono de favoritos en la cabecera).
