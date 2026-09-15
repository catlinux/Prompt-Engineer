# Recomendaciones de IA: qué herramientas incluye la app y por qué

Esta tabla es la versión legible de [`config/ai_recommendations.json`](../config/ai_recommendations.json), que es lo que realmente usa la aplicación. Si alguna vez no coinciden, el JSON manda — esta tabla se actualiza a la vez que él, pero por error humano podría quedar desincronizada.

**Última actualización: 2026-09-15.** Cómo se actualiza: ver [ACTUALIZAR_RECOMENDACIONES_IA.md](ACTUALIZAR_RECOMENDACIONES_IA.md).

La aplicación clasifica cada petición en una categoría de contenido y recomienda la herramienta más adecuada de esa categoría.

## Herramientas incluidas

| Categoría | Herramienta | ¿Gratis? | Qué incluye gratis | Límites principales |
|---|---|---|---|---|
| Texto general | **Claude.ai** (Anthropic) | Sí | Modelo Sonnet, búsqueda web, Artifacts, subida de archivos | ~30-100 respuestas/día (por tokens, se renueva cada 5h) |
| Texto general | **ChatGPT** (OpenAI) | Sí | Chats ilimitados; un modelo (el más pequeño de GPT-5.6) | Un solo modo de razonamiento; sin modelos avanzados |
| Texto general | **Gemini** (Google AI Studio) | Sí | Modelos de la familia Flash | 1500 peticiones/día, 15-30/minuto |
| Código / software | **Claude.ai** (Anthropic) | Sí | (mismo que arriba) | (mismo que arriba) |
| Imagen | **Leonardo AI** | Sí | ~150 imágenes/día en ajustes estándar | Calidad/velocidad por debajo de los planes de pago |
| Vídeo | **Kling AI** | Sí | 2-6 vídeos cortos/día | Marca de agua visible en el plan gratuito |
| Música | **Suno** | Sí | ~10 canciones/día, modelo v4.5 | No se pueden descargar ni usar comercialmente |
| Resumen de documentos propios | **NotebookLM** (Google) | Sí | 100 cuadernos, 50 fuentes/cuaderno, 50 preguntas/día, resúmenes de audio/vídeo | Hasta 5 resúmenes de audio al día |
| Transcripción de audio/voz | **Otter.ai** | Sí | 300 minutos de transcripción al mes | Puede quedarse corto con uso intensivo |
| Investigación profunda | **NotebookLM** (Google) | Sí | Modo de investigación profunda incluido | Comparte el límite de 50 preguntas/día |

## Por qué se recomienda cada una

- **Claude.ai** para software: sigue bien instrucciones largas y detalladas — justo lo que produce esta app para Claude Code.
- **ChatGPT / Gemini** para texto general: buena opción por defecto para conversación, redacción y tareas cotidianas.
- **Leonardo AI** para imágenes: de las opciones gratuitas, la que da más generaciones al día.
- **Kling AI** para vídeo: la mayor cuota diaria gratuita entre las opciones comparadas.
- **Suno** para música: la más generosa en canciones gratis al día entre las opciones comparadas.
- **NotebookLM** para resúmenes de documentos e investigación profunda: pensado específicamente para trabajar con fuentes propias (PDFs, notas, documentos), no solo para conversar.
- **Otter.ai** para transcripción: buen equilibrio entre minutos gratis y facilidad de uso, sin necesitar configuración técnica.

## Notas importantes

- Estos datos se recopilan mediante búsqueda web puntual, no en tiempo real. Pueden quedar desactualizados — la propia aplicación avisa en pantalla cuando pasan más de 7 días desde la última actualización.
- La recomendación es una guía orientativa, no una regla estricta: cualquier IA puede usarse con el prompt que genera esta aplicación.
- Los límites de las versiones gratuitas cambian con frecuencia. Antes de decidir basándote solo en esta tabla para algo importante, conviene comprobarlo en la web oficial de cada herramienta.

## Cómo se decide la categoría

Cuando generas un prompt, la propia IA (DeepSeek) clasifica la petición según qué tipo de resultado final se pide — no según el tema. Por ejemplo, "hazme un resumen de estos tres artículos que te adjunto" es `resumen_documentos`, mientras que "explícame qué es la fotosíntesis" es `texto_general`, aunque ambas sean "resúmenes" en sentido amplio.

## Cómo añadir más herramientas o categorías

Sencillo — basta con seguir el procedimiento en [ACTUALIZAR_RECOMENDACIONES_IA.md](ACTUALIZAR_RECOMENDACIONES_IA.md) y pedirlo explícitamente. Añadir una categoría nueva requiere también actualizar la lista de categorías en `src/types.ts` (`ContentCategory`) y el prompt del sistema en `server/deepseek.ts`.
