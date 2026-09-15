# Decisiones técnicas

## Motor de análisis: DeepSeek API, no heurísticas locales

El usuario tiene crédito ya disponible en DeepSeek y quiere que la IA sea el motor principal de v1, no un sistema de reglas JavaScript. Las reglas locales (`server/schema.ts`) solo se usan para validar el input y la forma de la respuesta, no para interpretar el contenido.

## Sin integración con ChatGPT

La propuesta inicial consideraba abrir ChatGPT gratuito con el prompt generado. Se descartó: el usuario decidió simplificar la v1 a "generar el prompt + instrucciones de cómo enviarlo", sin automatizar ningún envío a ninguna IA de destino. Se puede añadir en una versión futura si hace falta.

## Backend mínimo (Express) en lugar de todo en el navegador

La clave de DeepSeek no se puede exponer en el frontend (se vería en el código fuente/DevTools). Un backend Express minimal es la complejidad mínima necesaria para hacer la llamada de forma segura. No se ha añadido ninguna otra responsabilidad al backend más allá de este endpoint.

## Nombre del modelo configurable vía `.env`

DeepSeek ha cambiado nombres de modelo varias veces (ej: `deepseek-chat`/`deepseek-reasoner` → `deepseek-flash`/`deepseek-v4-pro`). Para evitar tener que tocar código cada vez, `DEEPSEEK_MODEL` se lee del entorno con `deepseek-flash` como valor por defecto. **Verificar el nombre actual en la documentación oficial de DeepSeek antes de confiar en él ciegamente** — este tipo de nombre cambia a menudo.

## Formato de respuesta: JSON estructurado validado

Se pide a DeepSeek `response_format: json_object` con un esquema fijo (`src/types.ts` / `server/schema.ts`). Si la respuesta no cumple el esquema se rechaza con error claro en lugar de mostrar datos a medio formar en el frontend. Evita "inventar" contenido cuando el modelo se equivoca de formato.

## Sin base de datos ni persistencia en v1

No hay manera de guardar el historial de peticiones todavía. Deliberado: el objetivo de la v1 es validar si el concepto aporta valor, no construir infraestructura de persistencia por adelantado.

## Idioma: interfaz y documentación en castellano, contenido generado sigue el idioma del usuario

La app se publicará en GitHub con vocación de alcance más amplio, por lo que la interfaz, los textos fijos del código y toda la documentación del repositorio están en castellano. El contenido que genera DeepSeek (objetivo, requisitos, prompt final...) sigue respondiendo en el idioma en que el usuario escriba su petición — no se fuerza un idioma fijo ahí, ya que limitaría la utilidad para quien escriba en otro idioma.

## Modelo de análisis: separar requisitos, decisiones necesarias, decisiones aplazables y recomendaciones (v0.4.0)

El modelo original (`requirements` + `missing_information` + `open_questions` + `assumed_proposals`) mezclaba con demasiada facilidad "lo que el usuario pidió" con "lo que la IA sugiere", y no distinguía entre información que bloquea el trabajo y detalles que se pueden posponer. El usuario pidió explícitamente que la herramienta se comportara como un ingeniero de requisitos, no como un generador de texto más largo.

Se sustituyó por: `confirmed_requirements` (solo lo dicho por el usuario), `necessary_decisions` (preguntas realmente bloqueantes, con motivo), `deferrable_decisions` (no bloquean, se posponen), `recommendations` (sugerencias de la IA, siempre marcadas como tales, nunca como obligación salvo que hagan falta para cumplir un requisito confirmado), y `role` (perspectiva profesional contextual con comportamientos concretos, solo cuando aporta valor — nunca una etiqueta vacía como "actúa como experto en X").

Esto obliga al system prompt a razonar explícitamente, antes de generar cada campo, si una pregunta es realmente imprescindible o se puede aplazar — reduciendo las preguntas al mínimo necesario sin dejar de preguntar lo que de verdad hace falta.

## Recomendación de IA: datos curados a mano, no búsqueda web integrada en el backend (v0.5.0)

El usuario pidió que la app recomendara qué IA usar según la tarea, con datos actuales de precios y límites obtenidos por búsqueda web. Se investigó si la API de DeepSeek podía hacer esa búsqueda en cada petición: sí tiene búsqueda web nativa, pero solo en su endpoint compatible con Anthropic, no en el endpoint OpenAI-compatible que usa esta app, y la documentación pública no aclara activación, parámetros ni coste. Añadir una API de búsqueda externa (Brave, Google) para esto habría introducido una dependencia de pago nueva, algo que el usuario quería evitar.

Se optó por: datos curados en `config/ai_recommendations.json`, actualizados a mano por un agente con búsqueda web (Claude Code) cuando el usuario lo pide, siguiendo un procedimiento documentado (`docs/ACTUALIZAR_RECOMENDACIONES_IA.md`). El backend elige qué herramienta recomendar con una regla determinista simple (sin IA), no con una nueva llamada a DeepSeek.

Limitación aceptada conscientemente: quien use el proyecto sin un agente con búsqueda web no puede refrescar estos datos, quedan congelados en la fecha del último `git push`. El usuario decidió aceptar esta limitación en lugar de añadir complejidad/coste, dejándolo como mejora futura.

## Catálogo de IA por categoría de contenido, no solo software/texto (v0.6.0)

La primera versión de la recomendación de IA (v0.5.0) solo distinguía software (→ Claude) de todo lo demás (→ ChatGPT), desaprovechando que la IA cubre muchos más tipos de tarea: imagen, vídeo, música, resúmenes de documentos propios, transcripción, investigación profunda. El usuario lo señaló explícitamente pidiendo aprovechar mejor el potencial de la herramienta.

Se añadió `content_category` al modelo de datos, clasificado por DeepSeek en la misma llamada (sin coste extra), y se amplió `config/ai_recommendations.json` con herramientas especializadas por categoría (Leonardo AI, Kling AI, Suno, NotebookLM, Otter.ai), investigadas con búsqueda web real, no inventadas. La selección en el backend sigue siendo determinista y sin IA (`server/aiRecommendations.ts`), solo que ahora busca por categoría en vez de por una regla binaria.
