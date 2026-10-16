---
registry: design/styles
updated: 2026-10-10
---

# Registro de estilos

Regla para el agente: antes de crear o modificar UI, lee este archivo y
**pregunta al usuario con qué estilo empezar**. La primera opción es el
estilo ya fijado en el proyecto (`style: vX@versión` en `sdd/plans/`),
marcada "(actual)"; incluye siempre "Nueva exploración".

Los colores **no** forman parte del estilo: cada proyecto deduce su paleta
según `design/palette-rules.md` (regla general, modos claro y oscuro).

| ID | Nombre | Superficie | Modo | Layout | Estado | Referencias |
|---|---|---|---|---|---|---|
| `v1-soft-commerce` | Soft Commerce | Tiendas, catálogos, apps de consumo | claro | Contenido centrado | borrador 0.3.0 | 3 apps móviles de e-commerce |
| `v2-immersive-3d` | Immersive 3D | Landings con hero 3D y animación | claro | Hero a pantalla, capas con parallax | por definir | Web energy drink + hero 3D de cripto |
| `v3-editorial-dark` | Editorial Dark | Marcas con carácter, editorial | oscuro | A sangre: nav y hero a `100dvh`, esquinas rectas | por definir | Hero split oscuro con titular gigante |
| `v4-dense-workspace` | Dense Workspace | Herramientas internas, SaaS, paneles | claro | `grid-cols-12`, filas tabulares | por definir (sin referencias) | Estándares propios del usuario |

Documento hermano: `design/palette-rules.md` — regla general de paleta
(modos claro y oscuro). Los estilos la referencian; solo pueden
endurecerla.

Estados: `borrador` → `aprobado` → `deprecado`. Un estilo aprobado es
inmutable; un cambio crea una versión nueva con ADR.
