# Changelog — Trama

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)
y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Añadido
- Fase 2 (SPEC-005): área de usuario con barra lateral y pestañas en móvil (T-102), Trama Club y Recomienda y gana, solo informativas (T-103, T-104), modal de acceso (T-105), menú del icono de usuario (T-107), contador en la cesta (T-108) y sección «Trama en tu móvil» con teléfono realista (T-106, T-112).
- Ofertas desde `compare_at_cents` y `/ofertas` con banner (T-099, T-100); 8 novedades más (T-101); `/buscar` con la tarjeta completa (T-098).
- Favoritos: tabla `favorites` con RLS (T-041), corazón en la ficha y la barra fija (T-042), `/cuenta/favoritos` (T-043), corazón en la cabecera (T-114) y en las tarjetas de los listados (T-115).
- Novedades de la portada como carrusel con efecto peek (T-113).
- Franja de envío gratis (T-109), fondo degradado en la newsletter (T-110) y texto sin repeticiones con «Compra con tranquilidad» (T-111).

### Cambiado
- El retorno tras el acceso admite también `/hombre`, `/mujer`, `/novedades`, `/ofertas` y `/buscar` (lista blanca, T-115).
- Por debajo de 370 px el logo de la cabecera muestra solo el símbolo (T-114).

### Seguridad
- Next.js 16.4.0 → 16.4.1 (ADR-011, T-086). Corrige GHSA-2464-fhr4-w9xw y GHSA-673q-mjm6-r5xr (RCE críticos) y GHSA-p3m5-59mp-jv5r (DoS alto).

## [0.1.0] — YYYY-MM-DD

### Añadido
- Instanciado desde web-os.
- Constitución del OS.
- Estructura SDD.
- Estilos disponibles v1-v4.
- Plantilla de Next.js, TypeScript, Tailwind, Motion.
- CI mínima (typecheck, lint, tests, build, gitleaks, audit).
