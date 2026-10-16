# docs/costs.md — Topes de coste en APIs de pago

## Principio

Cualquier API externa que cobre por uso debe tener un tope de coste
declarado y configurado antes de escribir el primer consumidor.

## Qué cuenta como "API de pago"

- Cualquier servicio con facturación por uso: LLMs, mapas, geocoding,
  traducción, OCR, image processing, emails, SMS, mensajería push.
- Servicios con plan gratuito pero facturación automática al superarlo.
- Servicios con cuota fija pero que cobran por exceso.

No cuenta: bases de datos y hosting del proyecto (Vercel, Supabase,
Neon).

## Obligaciones

### 1. Declaración en la spec

La sección 10 de la spec (APIs externas) debe indicar por cada API:

| Campo | Contenido |
|---|---|
| Proveedor | Nombre. |
| Uso previsto | Qué se llama y para qué. |
| Plan y coste unitario | Precio por unidad. VERIFICAR. |
| Tope mensual | En dinero (ej. 50 USD/mes) o en unidades. |
| Alerta de presupuesto | % del tope donde avisa. |
| Cuota máxima | Límite duro de uso. |
| Comportamiento al tope | Falla cerrado o degradado. |
| ToS revisados | Sí/No. Si no, VERIFICAR. |

Sin esto, la spec no se aprueba.

### 2. Configuración en el proveedor

Antes de escribir el código:

1. Fija el tope de gasto mensual en el panel.
2. Configura alertas de presupuesto.
3. Configura cuota máxima a nivel de cuenta.

Estas tres cosas se documentan en review.md con captura o enlace.

### 3. Módulo wrapper en el proyecto

Toda llamada a una API de pago pasa por un módulo src/lib/<proveedor>/
que:

- Lee el tope de una variable de entorno.
- Valida la entrada con Zod antes de llamar.
- Cuenta el uso y rechaza si supera el tope.
- Registra cada llamada.
- Devuelve un error tipado al superar el tope.

Nunca se llama a fetch directamente desde un componente.

### 4. Cierre de tarea

La review de la tarea que toque una API de pago incluye:

- [ ] Declaración en la spec (sección 10).
- [ ] Tope configurado en el proveedor.
- [ ] Alertas de presupuesto configuradas.
- [ ] Módulo wrapper existe y se usa.
- [ ] Test del comportamiento al superar el tope.

Sin estos 5 puntos, la tarea no se cierra.

## Ejemplos de comportamiento al tope

| Caso | Comportamiento recomendado |
|---|---|
| LLM (chat, generación) | Fallar cerrado. Mensaje al usuario. |
| Geocoding | Fallar cerrado o cachear agresivamente. |
| Envío de emails | Encolar y avisar; reintentar al día siguiente. |
| SMS | Fallar cerrado. Alerta al equipo. |
| Almacenamiento / CDN | Degradado. |

## Variables de entorno

PROVIDER_API_KEY=
PROVIDER_MAX_MONTHLY_USD=50
PROVIDER_MAX_DAILY_CALLS=1000

Los valores por defecto en el código son conservadores.

## Fugas de coste conocidas

- Recursión infinita en un agente LLM. Contador de iteraciones y tope duro.
- Retry exponencial sin tope. Todo retry tiene máximo y jitter.
- Trabajos programados (cron) que se solapan. Idempotencia + lock.
- Endpoints públicos sin autenticación que llaman a una API de pago.
  Rate limit por IP y autenticación obligatoria.
- Páginas de preview en Vercel que llaman al proveedor. Desactivar en
  preview o usar claves sandbox.

## VERIFICAR al construir

- Precios actuales de cada proveedor.
- Cómo se configura el tope en el panel de cada proveedor.
- Si el proveedor tiene SDK oficial o si toca usar fetch con firma manual.
