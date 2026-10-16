# docs/dependencies.md — Política de dependencias

## Principios

1. Añadir una dependencia es una decisión, no un reflejo.
2. Las majors nunca se suben solas. Con ADR cada una.
3. pnpm audit bloquea el cierre. Sin vulnerabilidades altas ni críticas.

## Actualización automática

Dependabot (.github/dependabot.yml) abre PRs:

- Semanal (lunes), agrupadas.
- Patch + minor en un solo PR por tipo.
- Major ignoradas: se abren a mano cuando toque.

Al recibir una PR de Dependabot:

1. Mira si la CI pasa.
2. Si pasa y son patch/minor: merge.
3. Si falla: revisa el changelog. Si es cambio de major camuflado, cierra
   la PR y abre un ADR.

## Dependencias concretas

Ver docs/stack.md. Reglas específicas:

- next: major siempre con ADR.
- react: major siempre con ADR. Coordinar con next.
- tailwindcss: major siempre con ADR.
- motion: major siempre con ADR.
- zod: minor sin fricción. Major con ADR.
- lucide-react: versión 0.x. Los iconos pueden cambiar de nombre entre
  minors. Revisar la PR con cuidado.

## Auditoría

pnpm audit --audit-level=high corre en CI. Bloquea la PR si encuentra
vulnerabilidades altas o críticas.

Si no hay fix disponible: no silencies. Abre un ADR con:
- Dependencia y vulnerabilidad.
- Por qué no hay fix.
- Mitigación.
- Caducidad: cuándo se revisa.

## Prohibido

- pnpm audit --ignore sin ADR.
- --no-verify en commits que cambian dependencias.
- Dependencias con postinstall que ejecuten binarios de red.
- Dependencias sin mantenimiento (>1 año sin commits) salvo ADR.

## Cómo quitar una dependencia

1. Busca todos los usos (grep, eslint).
2. Reescribe con la plataforma.
3. pnpm remove <pkg>.
4. Verifica la CI.
5. Anota en el CHANGELOG.
