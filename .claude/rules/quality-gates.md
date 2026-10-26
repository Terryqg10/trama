# rules/quality-gates.md

Puertas que bloquean el cierre de una tarea. Claude Code no cierra una
tarea con una afirmación: la cierra con evidencia.

## Las 10 puertas

1. `tsc --noEmit` sin errores. Sin any, sin @ts-ignore.
2. Lint sin errores.
3. `pnpm build` de producción sin errores.
4. Trazabilidad: cada CA tiene test o comprobación manual documentada.
5. Seguridad:
   - Sin secretos en el repo (gitleaks).
   - Claves solo en servidor.
   - Inputs validados con Zod.
   - `pnpm audit --audit-level=high` sin hallazgos (o con ADR y caducidad).
   - Topes de coste en APIs de pago: declarados en la spec y configurados
     en el proveedor (docs/costs.md).
6. Si hay base de datos: RLS definida antes de consumir datos + prueba de
   aislamiento entre usuarios.
7. QA de interfaz:
   - El logo enlaza a /.
   - Todo modal es cerrable (Esc y click fuera, si aplica).
   - Cada botón tiene onClick o href válido.
   - Cero enlaces muertos.
   - La navegación está definida, no pospuesta.
   - Responsive: en todo el rango de 320 a 1280 px (no solo en los
     breakpoints) no hay scroll horizontal (salvo carruseles, bloques
     de código y tablas con overflow explícito), ningún elemento de
     header, nav, main o footer se sale del viewport ni queda recortado
     por un overflow oculto, y la navegación tiene comportamiento móvil
     declarado (menú plegable, drawer, tabs inferiores, o equivalente).
     Evidencia: salida de `pnpm test:e2e` con `tests/responsive.spec.ts`
     (barrido de 18 anchos) pegada en la review, más una captura a
     375 px de cada pantalla nueva o modificada.
   - Tipografía y espaciado escalan: no hay titulares gigantes ni
     contenedores que se coman el contenido en móvil.
   - Convenciones del sector: si la UI se aparta de la convención
     esperada del sector (filtro lateral en e-commerce, horarios
     visibles en restaurantes, etc.), existe una entrada en
     `sdd/plans/` bajo `## Decisiones de UI` que lo justifica.
8. Accesibilidad: axe sin violaciones graves; prefers-reduced-motion
   respetado; foco visible; 44×44 px táctil; texto ≥ 12 px.
   - Imágenes: todas tienen `sizes`, `width`/`height` o `fill` con
     contenedor aspect-ratio para evitar CLS.
9. Privacidad: sección "Datos y privacidad" de la spec actualizada si se
   tocaron datos personales.
10. Estilo: check-palette pasa; sin hex ni valores arbitrarios en
    componentes.

## Según el nivel del proyecto

- S (landing): puertas 1-5, 7, 8, 10 + Lighthouse (rendimiento y
  accesibilidad ≥ 90).
- M (web/herramienta): S + tests unitarios de lógica de negocio + un test
  e2e del flujo principal.
- L (SaaS): M + tests de integración con base de datos real + CI
  bloqueante + ADR por cada decisión nueva.

El nivel está en sdd/plans/.

## Prohibido

- Tests vacíos o con .skip.
- Alterar un test o un CA sin ADR o enmienda a la spec.
- Cerrar una tarea si alguna puerta falla.
- Escribir "funciona" sin pegar la salida del comando.

## Cómo se cierra

/review rellena sdd/reviews/T-xx.md con:
- Tarea y CAs cubiertos.
- Comandos ejecutados y su resultado (texto pegado, no resumen).
- Checklist de interfaz marcada.
- Problemas conocidos, si los hay.
- Estado final: cerrada o vuelve a pendiente.

## Estrategia de Ejecución de Tests (Eficiencia)

- **Durante el desarrollo:** NO se ejecuta la suite completa de e2e en
  cada iteración. Se ejecuta solo el archivo de test relacionado con el
  cambio (ej. `playwright test tests/mi-componente.spec.ts`).
- **Ahorro de navegadores:** Mientras se itera, usar `--project=chromium`
  (escritorio). El proyecto `mobile` solo se ejecuta en el pase final
  antes del commit.
- **Logs reducidos:** Al pedir los resultados de los tests, pedir solo
  las últimas 20 líneas del log (resumen) o el error específico. Evitar
  volcar los 1000+ tests en el contexto.
- **Tests flaky:** Si un test falla de forma intermitente (flaky) por la
  máquina local (ej. animaciones, ratón), arreglarlo con esperas
  (`waitFor`) o marcarlo como `test.fixme`, nunca dejarlo reintentando
  infinitamente.

## Verificación de Tests Flaky (Ahorro de Tiempo)

Cuando se corrija un test que falla de forma intermitente (flaky), está
PROHIBIDO ejecutar la suite completa de e2e varias veces seguidas para
comprobarlo. El proceso correcto es:

1. Ejecutar SOLO el archivo del test afectado, repitiéndolo varias veces
   con el flag de Playwright:
   `pnpm exec playwright test tests/archivo-afectado.spec.ts --project=chromium --repeat-each=10`
2. Si pasa las 10 repeticiones, el arreglo es válido.
3. Solo en el pase final del día (el /check o /review de cierre) se
   lanzará la suite completa.

Motivo: Evitar tiempos de espera de 30+ minutos y el consumo masivo de
tokens en logs repetidos.

## Regla de Impacto de Cambios (Eficiencia vs Calidad)

- **Durante la iteración:** Si una tarea es puramente cosmética (iconos,
  textos, colores) y NO altera la lógica, el agente solo ejecutará
  `typecheck`, `lint` y el test directamente afectado. No lanzará las
  suites completas.
- **En el pase final (antes del commit):** Si el cambio cosmético toca
  espaciado, márgenes, padding o layout (ej. añadir un icono a una
  tarjeta), ES OBLIGATORIO ejecutar el test de responsive
  (`responsive.spec.ts`) y la captura a 375 px exigida por la puerta 7,
  para asegurar que no se ha roto el reflow.
- Si el cambio es puramente de texto o color sin afectar al flujo, el
  pase final puede omitir el responsive.
