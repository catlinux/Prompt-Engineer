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

## Recomendación de IA por juicio de DeepSeek, no por regla determinista (v0.7.0)

La selección por categoría de v0.6.0 seguía siendo una regla fija (una categoría → una herramienta), incapaz de recomendar varias herramientas para una petición con subtareas distintas (ej. una tienda online que necesita código, textos e imágenes a la vez), y no distinguía entre una herramienta de chat y un agente autónomo del mismo proveedor.

Se decidió que la propia IA (DeepSeek) hiciera este juicio, recibiendo el catálogo completo como contexto en la misma llamada que ya hace el resto del análisis — sin añadir una segunda llamada ni coste extra. Se eliminó la función determinista `pickRecommendedTool()`. Para evitar que la IA invente datos de precios/cuotas (que cambian con frecuencia y deben venir del catálogo curado, no de su conocimiento general), DeepSeek solo devuelve `tool_id`s de referencia; el backend valida que esos IDs existan en el catálogo real (rechaza la respuesta si no) y el frontend resuelve los datos completos (precio, límites) a partir del catálogo, nunca de lo que escriba la IA directamente.

Se separó `claude_ai` de `claude_code` como entradas distintas del catálogo (con un campo `is_agentic`) y se añadió `deepseek` al catálogo, para que el sistema pueda recomendarse a sí mismo cuando corresponda y no tenga sesgo estructural hacia ningún proveedor.

La recomendación de herramienta de IA (`ai_tool_recommendation`) se mantiene como campo separado de `recommendations` (que trata de cómo resolver el proyecto del usuario, no de qué herramienta ejecutar el trabajo) — nunca se mezclan ni una se convierte en requisito de la otra.

## Categoría intermedia "importante pero no bloqueante" en las decisiones (v0.8.0)

El modelo de dos categorías de v0.4.0 (`necessary_decisions` / `deferrable_decisions`) no distinguía bien entre "esto es importante" y "esto bloquea el trabajo": cualquier información moderadamente relevante tendía a clasificarse como bloqueante, obligando a responder antes de poder avanzar aunque fuera razonable continuar con una hipótesis.

Se añadió `important_pending_decisions` como categoría intermedia: decisiones que pueden afectar significativamente el resultado pero no impiden avanzar. Cada una lleva una hipótesis provisional explícita (`provisional_approach`) y qué cambiaría si el usuario decide otra cosa (`what_could_change`), para que el análisis pueda continuar sin bloquear al usuario y sin ocultar que se ha asumido algo.

Se estableció una regla de tres condiciones para clasificar algo como bloqueante (impide continuar con una parte esencial / no es razonable asumir una hipótesis / continuar sin ello podría causar trabajo inútil o difícil de revertir) — las tres deben cumplirse, no basta con que la información sea importante. También se añadió la noción de "bloqueo parcial": una decisión bloqueante debe indicar si solo bloquea una parte del proyecto, para no detener todo el análisis por algo que solo afecta a una fase concreta (ej. país/pagos de una tienda no bloquean el catálogo ni la arquitectura).

Cambio deliberadamente acotado a la clasificación de decisiones — no se tocó la arquitectura de recomendación de herramientas de IA de v0.7.0, verificado sin regresión.
