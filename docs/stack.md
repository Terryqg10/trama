# docs/stack.md — Stack y versiones

Stack estándar del OS. Un proyecto que lo cambie lo hace con ADR.

| Pieza | Paquete | Versión a verificar |
|---|---|---|
| Framework | next | 16.x |
| UI | react, react-dom | 19.x |
| Lenguaje | typescript | 5.7+ |
| Estilos | tailwindcss, @tailwindcss/postcss | 4.x |
| Animación | motion | 12.x |
| Iconos | lucide-react | última 0.x |
| Validación | zod | 3.x |
| Tests unitarios | vitest | 2.x |
| Testing Library | @testing-library/react, @testing-library/jest-dom | últimas |
| e2e | @playwright/test | 1.49+ |
| Accesibilidad | @axe-core/playwright | 4.x |
| Lint | eslint, eslint-config-next, @eslint/eslintrc | últimas |
| Fuente | Geist (vía next/font/google) | — |
| Persistencia | Postgres (proveedor por proyecto, con ADR) | — |
| Deploy | Vercel | — |

## Qué NO se instala por defecto

- Supabase: se añade (@supabase/supabase-js, @supabase/ssr) cuando el
  proyecto lo use. Con ADR.
- Librerías de componentes (shadcn, radix, etc.): por proyecto.
- Librerías de estado global (zustand, jotai, redux): solo si hace falta.

## Cómo actualizar

1. pnpm outdated para ver qué está desactualizado.
2. Renovate/Dependabot abren PRs automáticamente.
3. Cambios de major: PR revisada a mano. Leer el changelog.
4. Cambios de minor/patch: se acepta la PR si la CI pasa.

## VERIFICAR al construir el primer proyecto

- Versión mayor actual de: next, react, typescript, tailwindcss, motion,
  vitest, @playwright/test, @axe-core/playwright, zod, lucide-react,
  pnpm, Node LTS.
- Si typedRoutes en next.config.ts es experimental o estable en Next 16.
- Si tailwindcss 4.x sigue usando @theme static como en v1.
