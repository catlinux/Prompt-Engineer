# Recomendaciones de IA: qué herramientas incluye la app y por qué

Esta tabla es la versión legible de [`config/ai_recommendations.json`](../config/ai_recommendations.json), que es lo que realmente usa la aplicación. Si alguna vez no coinciden, el JSON manda — esta tabla se actualiza a la vez que él, pero por error humano podría quedar desincronizada.

**Última actualización: 2026-09-15.** Cómo se actualiza: ver [ACTUALIZAR_RECOMENDACIONES_IA.md](ACTUALIZAR_RECOMENDACIONES_IA.md).

## Herramientas incluidas

| Herramienta | ¿Tiene versión gratuita? | Qué incluye gratis | Límites principales | Cuándo la recomienda la app |
|---|---|---|---|---|
| **Claude.ai** (Anthropic) | Sí | Modelo Sonnet, búsqueda web, Artifacts, subida de archivos | Aprox. 30-100 respuestas al día (se mide por tokens, no por mensaje; el cupo se renueva de forma continua cada 5 horas, no a medianoche) | Peticiones de software, arquitectura, o prompts largos y con instrucciones precisas — incluye los prompts que esta app prepara para Claude Code |
| **ChatGPT** (OpenAI) | Sí | Chats de texto ilimitados (desde agosto de 2026); un modelo (el más pequeño de la familia GPT-5.6) | Un solo modo de razonamiento; sin acceso a los modelos más potentes de pago; límites en generación de imágenes y subida de archivos | Uso general, redacción, tareas cotidianas |
| **Gemini** (Google AI Studio / API) | Sí | Modelos de la familia Flash (los Pro pasaron a ser solo de pago) | 1500 peticiones al día; 15-30 peticiones por minuto según el modelo | Volumen alto de peticiones pequeñas, integraciones por API gratuita |

## Notas importantes

- Estos datos se recopilan mediante búsqueda web puntual, no en tiempo real. Pueden quedar desactualizados — la propia aplicación avisa en pantalla cuando pasan más de 7 días desde la última actualización.
- "Recomendada cuando" es una guía orientativa, no una regla estricta: cualquier IA puede usarse con el prompt que genera esta aplicación.
- Los límites de las versiones gratuitas cambian con frecuencia (las tres empresas los han modificado varias veces durante 2026). Antes de decidir basándote solo en esta tabla para algo importante, conviene comprobarlo en la web oficial de cada herramienta.

## Por qué no hay más herramientas en la lista

Se ha empezado con las tres IA de conversación más usadas y con versión gratuita real. Añadir más (por ejemplo DeepSeek de cara al usuario final, Mistral, Perplexity...) es sencillo — basta con seguir el procedimiento en [ACTUALIZAR_RECOMENDACIONES_IA.md](ACTUALIZAR_RECOMENDACIONES_IA.md) y pedirlo explícitamente.
