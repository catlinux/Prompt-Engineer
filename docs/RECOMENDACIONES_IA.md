# Recomendaciones de IA: qué herramientas incluye la app y por qué

Esta tabla es la versión legible de [`config/ai_recommendations.json`](../config/ai_recommendations.json), que es lo que realmente usa la aplicación. Si alguna vez no coinciden, el JSON manda — esta tabla se actualiza a la vez que él, pero por error humano podría quedar desincronizada.

**Última actualización: 2026-09-15.** Cómo se actualiza: ver [ACTUALIZAR_RECOMENDACIONES_IA.md](ACTUALIZAR_RECOMENDACIONES_IA.md).

## Cómo funciona la recomendación

La aplicación no aplica una regla fija tipo "esta categoría siempre usa esta herramienta". En su lugar, la propia IA analiza la petición, identifica las tareas que contiene, y elige con criterio qué herramienta (o combinación de herramientas) del catálogo encaja mejor — pudiendo recomendar una principal y varias complementarias cuando distintas partes del trabajo necesiten cosas distintas. Es una sugerencia orientativa, nunca una obligación.

## Herramientas incluidas

| Herramienta | ¿Agente autónomo? | ¿Gratis? | Qué incluye gratis | Límites principales |
|---|---|---|---|---|
| **Claude.ai** (Anthropic) | No (chat) | Sí | Modelo Sonnet, búsqueda web, Artifacts, subida de archivos | ~30-100 respuestas/día (por tokens, se renueva cada 5h) |
| **Claude Code** (Anthropic) | Sí | No | — | Requiere suscripción Claude Pro/Max o crédito de API |
| **ChatGPT** (OpenAI) | No (chat) | Sí | Chats ilimitados; un modelo (el más pequeño de GPT-5.6) | Un solo modo de razonamiento; sin modelos avanzados |
| **Gemini** (Google AI Studio) | No (chat/API) | Sí | Modelos de la familia Flash | 1500 peticiones/día, 15-30/minuto |
| **DeepSeek** (chat/API) | No (chat) | Parcial | Chat web gratuito; API de pago a precio bajo | Chat web con límites en horas punta |
| **Leonardo AI** | No | Sí | ~150 imágenes/día en ajustes estándar | Calidad/velocidad por debajo de los planes de pago |
| **Kling AI** | No | Sí | 2-6 vídeos cortos/día | Marca de agua visible en el plan gratuito |
| **Suno** | No | Sí | ~10 canciones/día, modelo v4.5 | No se pueden descargar ni usar comercialmente |
| **NotebookLM** (Google) | No | Sí | 100 cuadernos, 50 fuentes/cuaderno, 50 preguntas/día, resúmenes de audio/vídeo | Hasta 5 resúmenes de audio al día |
| **Otter.ai** | No | Sí | 300 minutos de transcripción al mes | Puede quedarse corto con uso intensivo |

## Por qué Claude.ai y Claude Code están separados

Son herramientas distintas con capacidades distintas, aunque sean del mismo proveedor: Claude.ai es un chat (piensa y escribe, pero no ejecuta nada por sí mismo), mientras que Claude Code es un agente que lee, escribe y ejecuta código de verdad sobre un proyecto, verificando sus propios cambios. La aplicación distingue esto explícitamente (campo `is_agentic`) para no recomendar un chat cuando lo que hace falta es un agente que mantenga un proyecto real, ni al revés.

## Notas importantes

- Estos datos se recopilan mediante búsqueda web puntual, no en tiempo real. Pueden quedar desactualizados — la propia aplicación avisa en pantalla cuando pasan más de 7 días desde la última actualización.
- Los precios, cuotas y límites que muestra la aplicación vienen siempre de este catálogo, nunca los inventa la IA — si el catálogo no tiene un dato, no se muestra.
- Cuando el catálogo no tiene información suficiente para decir que una herramienta es claramente mejor que otra para una tarea, la aplicación lo indica como alternativas similares en vez de inventar una diferencia.

## Cómo añadir más herramientas o categorías

Sencillo — basta con añadir una entrada nueva a `config/ai_recommendations.json` (id, nombre, categorías, si es agéntica, puntos fuertes, datos de plan gratuito y precio) y pedir que se actualice esta tabla. No hace falta tocar la lógica de selección: DeepSeek recibe el catálogo completo automáticamente en cada petición y decide con lo que haya disponible. Ver [ACTUALIZAR_RECOMENDACIONES_IA.md](ACTUALIZAR_RECOMENDACIONES_IA.md) para el procedimiento completo.
