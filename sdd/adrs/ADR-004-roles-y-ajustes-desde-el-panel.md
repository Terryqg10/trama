---
id: ADR-004
title: Gestionar roles y ajustes de tienda desde el panel admin, con cambios solo por servidor y auditoría
status: aceptada
date: 2026-10-15
os_version: 0.1.0
relates_to: [SPEC-001-trama-tienda, PLAN-001-trama-tienda, ADR-002, ADR-003]
---

# ADR-004 — Roles y ajustes de tienda desde el panel admin

## Contexto

SPEC-001 preveía un panel solo de catálogo y pedidos (RF-09 y RF-10). Se quiere
ampliarlo con guías de tallas, tarifa y umbral de envío editables, gestión de
usuarios y roles, y precio de referencia (Enmienda 3).

La gestión de roles es sensible: hoy `profiles.role` no es editable por el
cliente (privilegio de columna, T-003) y esa protección no debe debilitarse. Los
ajustes de envío hoy son constantes en código (`lib/domain/shop`).

## Alternativas consideradas

1. **Roles y ajustes desde el panel, con cambios de rol solo por una acción de
   servidor** (`service_role`) que comprueba que quien llama es admin, y con un
   registro de auditoría. Más superficie, pero el admin trabaja sin tocar SQL.
2. **Roles por SQL manual (SQL Editor de Supabase) y ajustes como constantes.**
   Superficie mínima y muy segura, pero cualquier cambio exige acceso al
   proveedor y un despliegue.
3. **Roles desde el panel con una política RLS que permita a los admin editar
   `profiles.role` directamente.** Menos código, pero abre la columna de rol a
   cualquier cliente que logre el rol admin y no deja auditoría ni controla el
   último admin.

## Decisión

Se elige la alternativa 1.

- **Cambio de rol:** solo mediante una acción de servidor que (a) verifica
  `is_admin()` del usuario autenticado, (b) valida la entrada con Zod, (c)
  escribe con `service_role` y (d) inserta una fila en `role_audit_log`. El
  privilegio de columna sobre `profiles.role` **no se concede** a
  `authenticated`: el cliente nunca puede editarlo, sea admin o no.
- **Salvaguardas:** un admin no puede quitarse a sí mismo el rol ni dejar el
  sistema sin administradores.
- **Primer admin:** se crea manualmente con SQL en el panel de Supabase. No
  existe ningún endpoint para ello.
- **Ajustes de tienda** (`shop_settings`): una fila con tarifa plana y umbral
  de envío gratis, en céntimos enteros. Lectura pública (hace falta para
  mostrar el envío) y escritura solo admin por RLS. Los valores de
  `lib/domain/shop` pasan a ser los valores por defecto.
- **Guías de tallas** y **precio de referencia** se editan desde el panel con
  RLS de escritura solo admin; el precio de referencia queda sujeto a T-003c y
  a la verificación legal.

## Consecuencias

Positivas:
- El admin gestiona catálogo, envío y roles sin tocar SQL.
- La escalada de privilegios sigue protegida por tres capas: privilegio de
  columna, comprobación en servidor y auditoría.
- Cada cambio de rol queda trazado.

Negativas:
- Aparece una acción de servidor con `service_role`, la pieza más sensible del
  proyecto. Exige tests de aislamiento propios y revisión de seguridad.
- Dos tablas nuevas (`shop_settings`, `role_audit_log`) y su RLS.
- El admin ve email, nombre y rol de los clientes: dato personal nuevo para un
  rol concreto (ver sección 9 de la spec y la Enmienda 3).
- `lib/domain/shop` deja de ser la fuente de verdad del envío: T-004 y T-007
  deberán leer los ajustes de BD.
- Más superficie de seguridad que una gestión manual de roles.

## Relación con la constitución

- I3: RLS en las tablas nuevas, con prueba de aislamiento.
- I4: `service_role` solo en servidor, nunca en el cliente.
- I5: toda entrada del panel se valida con Zod.
- I9: cada RF nuevo tiene CA propio.
- Privacidad: se actualiza el tratamiento descrito en la sección 9 mediante la
  Enmienda 3.
