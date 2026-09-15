# Cómo actualizar las recomendaciones de IA

Esta aplicación sugiere qué IA conviene usar para cada prompt generado, con información sobre si tiene versión gratuita, sus límites y para qué tareas es más adecuada. Esos datos viven en dos sitios:

- [`config/ai_recommendations.json`](../config/ai_recommendations.json) — datos que lee la aplicación.
- [`docs/RECOMENDACIONES_IA.md`](RECOMENDACIONES_IA.md) — la misma información en una tabla legible para humanos.

**Estos datos no se actualizan solos.** La aplicación no tiene forma de buscar en internet por sí misma. Se actualizan a mano, con ayuda de un agente con acceso a búsqueda web (como Claude Code), cuando alguien lo pide explícitamente.

## Cuándo actualizarlos

- Cuando el usuario lo pida directamente ("actualiza las recomendaciones de IA").
- Cuando la aplicación muestre el aviso de que los datos tienen más de 7 días (aparece en pantalla junto a la recomendación).

## Pasos para actualizar (para el agente que lo ejecute)

1. Para cada herramienta ya presente en `config/ai_recommendations.json` (y cualquier otra relevante que haya aparecido desde la última actualización — por ejemplo una IA nueva con uso extendido), buscar en la web información **actual**: si tiene versión gratuita, qué incluye exactamente, límites de mensajes/tokens/peticiones, y qué modelo se usa en el plan gratuito.
2. Verificar cada dato con al menos una fuente que parezca fiable (documentación oficial, o varias fuentes de terceros que coincidan). No inventar cifras ni asumir que no ha cambiado nada solo porque no se ha encontrado la fuente.
3. Actualizar `config/ai_recommendations.json`:
   - Cambiar `updated_at` a la fecha de hoy (formato `AAAA-MM-DD`).
   - Actualizar `free_tier_summary` y `free_tier_limitations` de cada herramienta.
   - Añadir herramientas nuevas si aporta valor, o quitar las que hayan dejado de ser relevantes.
4. Actualizar la tabla en `docs/RECOMENDACIONES_IA.md` para que coincida exactamente con el JSON (misma fecha, mismos datos).
5. Verificar que la aplicación sigue arrancando (`npm run typecheck`) y que la tarjeta de recomendación se ve bien en pantalla con una petición de prueba.
6. Anotar en `docs/STATE.md` que se ha hecho una actualización, con la fecha.

## Limitación conocida

Quien descargue este proyecto sin un agente con búsqueda web (como Claude Code) no puede refrescar estos datos por sí mismo: se quedan congelados en la fecha de la última actualización que se subió al repositorio. Es una limitación aceptada conscientemente para esta versión — ver [DECISIONS.md](DECISIONS.md). Mejorarlo (por ejemplo con una API de búsqueda propia del backend) queda como posible mejora futura, no implementada todavía.
