# Cómo actualizar las recomendaciones de IA

Esta aplicación sugiere qué IA (o combinación de IAs) conviene usar para cada prompt generado. La propia IA (DeepSeek) decide con criterio qué herramienta encaja mejor, comparando el catálogo — la aplicación no aplica una regla fija. Esos datos de catálogo viven en dos sitios:

- [`config/ai_recommendations.json`](../config/ai_recommendations.json) — datos que lee la aplicación.
- [`docs/RECOMENDACIONES_IA.md`](RECOMENDACIONES_IA.md) — la misma información en una tabla legible para humanos.

**Estos datos no se actualizan solos.** La aplicación no tiene forma de buscar en internet por sí misma. Se actualizan a mano, con ayuda de un agente con acceso a búsqueda web (como Claude Code), cuando alguien lo pide explícitamente.

## Cuándo actualizarlos

- Cuando el usuario lo pida directamente ("actualiza las recomendaciones de IA").
- Cuando la aplicación muestre el aviso de que los datos tienen más de 7 días (aparece en pantalla junto a la recomendación).

## Categorías actuales

`texto_general`, `codigo_software`, `imagen`, `video`, `musica`, `resumen_documentos`, `transcripcion_audio`, `investigacion_profunda`. Cada herramienta del catálogo pertenece a una o más de estas categorías (`categories` en el JSON).

## Campos de cada herramienta en el JSON

`id` (identificador único, usado internamente — no cambiarlo sin revisar que no rompe nada), `name`, `categories` (una o más de la lista de arriba), `is_agentic` (true solo si es un agente autónomo que ejecuta trabajo real, no un chat de una sola respuesta), `strengths` (lista breve de puntos fuertes reales, no genéricos), `has_free_tier`, `free_tier_summary`, `free_tier_limitations`, `price_note` (nota breve sobre coste, sin inventar cifras exactas si no se han verificado).

## Pasos para actualizar (para el agente que lo ejecute)

1. Para cada herramienta ya presente en `config/ai_recommendations.json` (y cualquier otra relevante que haya aparecido desde la última actualización — por ejemplo una IA nueva con uso extendido, o una categoría nueva que el usuario pida cubrir), buscar en la web información **actual**: si tiene versión gratuita, qué incluye exactamente, límites de mensajes/tokens/peticiones, si es agéntica o no, y coste aproximado si es de pago.
2. Verificar cada dato con al menos una fuente que parezca fiable (documentación oficial, o varias fuentes de terceros que coincidan). No inventar cifras ni asumir que no ha cambiado nada solo porque no se ha encontrado la fuente.
3. Actualizar `config/ai_recommendations.json`:
   - Cambiar `updated_at` a la fecha de hoy (formato `AAAA-MM-DD`).
   - Actualizar `strengths`, `free_tier_summary`, `free_tier_limitations` y `price_note` de cada herramienta.
   - Añadir herramientas nuevas si aporta valor, o quitar las que hayan dejado de ser relevantes. No hace falta tocar ningún código: DeepSeek recibe el catálogo completo automáticamente en cada petición.
4. Actualizar la tabla en `docs/RECOMENDACIONES_IA.md` para que coincida exactamente con el JSON (misma fecha, mismos datos).
5. Verificar que la aplicación sigue arrancando (`npm run typecheck`) y que la tarjeta de recomendación se ve bien en pantalla con una petición de prueba.
6. Anotar en `docs/STATE.md` que se ha hecho una actualización, con la fecha.

## Limitación conocida (aceptada, no un descuido)

Quien descargue este proyecto sin un agente con búsqueda web (como Claude Code) no puede refrescar estos datos por sí mismo: se quedan congelados en la fecha de la última actualización que se subió al repositorio. **No se ha añadido una API de búsqueda automática al backend a propósito** — ver [DECISIONS.md](DECISIONS.md) para el razonamiento completo (introduciría una dependencia de pago o de cuota gratuita limitada, gastada en su mayoría en comprobaciones que no encuentran ningún cambio, con riesgo de guardar datos incorrectos sin supervisión humana). En vez de eso, la aplicación avisa claramente en pantalla cuando los datos llevan más de 7 días sin actualizar (`SuggestedToolCard.tsx`), indicando el mismo comando exacto de este documento para pedirle a un agente que los refresque.
