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

## Entorno de trabajo para Claude Code: copiar/pegar por archivo, no .zip ni escritura directa (v0.9.0)

Cuando la herramienta principal recomendada es Claude Code, tiene sentido ir más allá del prompt: Claude Code usa un `CLAUDE.md` persistente en el proyecto para no depender de la memoria de la conversación. Se decidió con el usuario ofrecerlo, pero solo tras una pregunta explícita de sí/no (para no ensuciar la pantalla en el caso, más común, de que la recomendación no sea Claude Code o el usuario no lo quiera).

La aplicación es solo frontend (navegador) + backend (Express) sin acceso al sistema de archivos del usuario — no puede crear la carpeta del proyecto ni escribir los archivos directamente. Se evaluaron dos formas de entrega: botón de copiar por archivo (elegido, sin tocar la arquitectura) frente a generar un `.zip` descargable (habría añadido una librería de generación de zip y lógica de descarga nueva sin necesidad clara todavía). Se optó por copiar/pegar por ahora; queda como posible mejora futura si el usuario lo pide.

El contenido de `CLAUDE.md`/`TODO.md` lo genera DeepSeek en la misma llamada que el resto del análisis (sin coste extra), basado en el rol, objetivo, restricciones y decisiones/hipótesis ya analizadas — nunca una plantilla genérica. El validador exige que este campo solo pueda estar presente si la herramienta principal recomendada es exactamente `claude_code`, para que nunca aparezca de forma incoherente con la recomendación de arriba.

## Coherencia entre categorías de decisión: eliminar redundancia en vez de detectar contradicciones a posteriori (v0.10.0)

`ClaudeCodeSection` tenía `decisions_to_make`/`decisions_to_consult` como listas de texto libre generadas de forma independiente del modelo de fases (`necessary_decisions`/`important_pending_decisions`/`recommendations`/`deferrable_decisions`) introducido en v0.8.0. Al no haber ninguna referencia cruzada entre ambos, el modelo podía clasificar el mismo tema de forma incompatible en cada sitio (ej. "puede decidirlo" en un lugar y "debe consultarlo" en otro) — instrucciones contradictorias para el agente final.

Se consideraron dos enfoques: (a) añadir una capa de validación que comparase los textos de ambas listas buscando el mismo tema tratado de forma distinta, o (b) eliminar la redundancia de raíz. Se descartó (a) porque comparar contenido de texto libre para detectar "el mismo tema" es impreciso y frágil (dos frases pueden referirse a lo mismo sin coincidir textualmente, o coincidir sin ser el mismo tema) — no es una verificación fiable. Se eligió (b): `decisions_to_make`/`decisions_to_consult` se sustituyeron por `decision_references: string[]`, que solo puede contener los `question`/`topic` exactos de decisiones que ya existen en las categorías de fase. El validador (`server/schema.ts`) comprueba textualmente que esas referencias existen de verdad y que ningún tema aparece duplicado entre `necessary_decisions`/`important_pending_decisions`/`recommendations`/`deferrable_decisions` — al ser comparación de strings exactos generados por el propio modelo en la misma respuesta, es una verificación determinista y fiable, no una heurística sobre lenguaje natural libre.

Si el validador detecta una incoherencia, rechaza la respuesta igual que ante un JSON malformado, lo que aprovecha el reintento automático ya existente desde v0.4.1 — no hizo falta añadir ningún mecanismo de reintento nuevo.

## `decision_references` solo puede apuntar a decisiones realmente pendientes, no a recomendaciones (v0.10.2)

Tras v0.10.0, `claude_code.decision_references` podía referenciar temas de `necessary_decisions`, `important_pending_decisions` **o `recommendations`**. En la práctica esto mezclaba dos cosas distintas: una decisión pendiente de verdad (bloqueante o importante) con una recomendación ya resuelta por la IA — la sección de Claude Code acababa listando "reutilizar módulos existentes" o "seguir la estructura oficial" bajo el título "decisiones relevantes", dando la impresión de que aún había que decidirlas o consultarlas cuando ya estaban resueltas como sugerencia.

Se restringió `decision_references` a solo `necessary_decisions` e `important_pending_decisions` — las dos únicas categorías que representan algo genuinamente pendiente. Una recomendación que Claude Code deba aplicar se expresa en `persistent_instructions` con su propio texto, no como referencia a una decisión. El validador (`collectPendingDecisionTopics()` en `server/schema.ts`) hace cumplir esto rechazando cualquier referencia a un topic que solo exista en `recommendations` o `deferrable_decisions`.

No se tocó el mecanismo de detección de duplicados entre categorías (`findDuplicateDecisionTopic`, de v0.10.0), que sigue funcionando igual — este cambio es ortogonal: resuelve un problema distinto (qué categorías son válidas como referencia para Claude Code, no si dos categorías se contradicen entre sí).

## Generar `claude_code_workspace` en una llamada separada, bajo demanda (v0.12.0)

El usuario reportó que la aplicación tardaba mucho (68s medidos) y preguntó qué se podía hacer sin cambiar de modelo. Medido el desglose: la llamada principal generaba siempre el contenido íntegro de CLAUDE.md/TODO.md (varios KB de texto) junto con el resto del análisis, **aunque el usuario acabara respondiendo "No, solo el prompt"** — el caso probablemente más frecuente al estar solo probando la aplicación.

Se consideraron dos cambios independientes y se implementaron ambos (decisión del usuario): separar la generación del workspace en una segunda llamada disparada solo al confirmar "Sí, prepáralo" (`POST /api/generate-workspace`, función `generateClaudeCodeWorkspace()`), y añadir un indicador de progreso con tiempo transcurrido en vez de pantalla en blanco (`ElapsedTimer.tsx`).

Medido el resultado: la llamada principal bajó de ~68s a ~62s y de ~22.5KB a ~15.7KB de respuesta — mejora real pero moderada. La causa es que gran parte del tiempo de espera no es tiempo de generación de tokens de salida, sino tiempo de razonamiento del modelo antes de empezar a escribir (con `temperature: 0.3` y un system prompt largo cargado de reglas de coherencia). Reducir el volumen de salida ayuda pero no resuelve el cuello de botella de fondo — eso queda documentado como pendiente en STATE.md, a explorar con otro modelo o con streaming.

Se prefirió reenviar el `result` completo ya obtenido por el frontend en la segunda llamada (en vez de que el backend intente reconstruir o recalcular un subconjunto "suficiente" de contexto) — es más simple, no requiere mantener sincronizados dos modelos de qué campos hacen falta, y el coste de transferencia (unos pocos KB) es insignificante comparado con el tiempo de generación del modelo.

## Ampliar `important_pending_decisions` en vez de crear categorías nuevas para "quién decide" y "cuándo confirmar" (v0.13.0)

El usuario pidió una revisión de arquitectura para comprobar si el sistema distingue bien 8 tipos de situación (requisito confirmado, a investigar, bloqueante, importante-no-bloqueante, decidible por el agente, decidible por el agente tras investigar, que solo necesita confirmación antes de una acción irreversible, y aplazable). La inspección confirmó que 6 de esos 8 ya estaban bien cubiertos por el modelo de fases existente (v0.8.0-v0.10.2); faltaban dos matices: quién toma la decisión, y cuándo hace falta confirmarla si no bloquea ahora.

Se evaluó crear una quinta categoría de decisión frente a ampliar la existente `important_pending_decisions` con dos campos opcionales (`decided_by`, `confirmation_trigger`). Se eligió ampliar en vez de crear categoría nueva: los dos matices nuevos son variaciones dentro de "importante pero no bloqueante" (siempre se avanza con hipótesis, nunca se pregunta obligatoriamente), no un tipo de decisión distinto — crear una categoría nueva habría significado otro conjunto de comprobaciones de coherencia paralelas (como pasó con `decisions_to_make`/`decisions_to_consult` en v0.10.0-v0.10.2) sin necesidad real.

`decided_by` tiene 3 valores: `"user"` (preferencia personal que el agente no puede adivinar), `"agent"` (el agente tiene criterio técnico suficiente sin necesitar más contexto), `"agent_after_investigation"` (el agente puede decidirlo bien, pero solo tras inspeccionar el proyecto real — no con la petición en lenguaje natural sola). `confirmation_trigger` es `null` en el caso normal; solo se rellena cuando la decisión debe confirmarse obligatoriamente antes de una acción irreversible o de alto riesgo (producción, dinero real, borrado de datos) — el system prompt advierte explícitamente contra usarlo como forma disimulada de bloquear una decisión que no bloquea de verdad.

No se tocó el motor de recomendación de IA (`ai_tool_recommendation`) ni la lógica de coherencia entre categorías (`findDuplicateDecisionTopic`, v0.10.0) — ninguno de los dos tenía un problema real detectado en la inspección.

## Triaje previo en llamada separada, antes de confirmar Claude Code (v0.14.0)

El usuario señaló un desperdicio real: cuando la herramienta recomendada acababa siendo Claude Code, la aplicación ya había generado el análisis completo (rol, decisiones, `ai_tool_recommendation`, `claude_code`, `final_prompt`...) en la misma llamada — coste pagado en tokens y tiempo aunque el usuario acabara respondiendo "no, prueba con otra IA". La oferta de `claude_code_workspace` (v0.10.1) ya ocultaba la interfaz hasta confirmar, pero no evitaba haber generado ni pagado el análisis en sí.

**Cambio de fondo:** se añadió una llamada de triaje previa y deliberadamente barata (`POST /api/triage`, `TRIAGE_SYSTEM_PROMPT`), que solo decide `is_software_request`, `content_category` y si merece la pena preguntar por Claude Code antes de analizar (`claude_code_recommended`, con `offer_message`/`suggested_folder_name` solo si aplica) — nunca genera decisiones, recomendaciones ni `final_prompt`. `max_tokens: 1024` (frente a 24576 de la llamada completa) porque la salida esperada es mínima.

Flujo resultante: si el triaje no recomienda Claude Code (petición no-software, o software sin envergadura suficiente), se lanza directamente la llamada completa de análisis, igual que antes — sin pregunta previa. Si el triaje sí lo recomienda, se muestra la pregunta ANTES de llamar al análisis completo: "sí" dispara la llamada completa normal; "no" dispara la misma llamada completa pero con una instrucción explícita (`excludeClaudeCode`) para que `ai_tool_recommendation` nunca proponga Claude Code como principal ni complementaria, y `claude_code_workspace` sea `null`.

**Decisión explícita de simplicidad sobre optimización marginal:** se consideró evitar el triaje por completo en peticiones claramente no-software (con una heurística local previa, sin IA) para ahorrar la llamada extra en el caso más frecuente. Se descartó: el usuario prefirió mantener siempre las mismas dos llamadas fijas (triaje corto + llamada que corresponda) por simplicidad y previsibilidad, aceptando conscientemente el coste pequeño y constante del triaje incluso en peticiones no-software — el triaje es barato (`max_tokens: 1024`, sin catálogo de IA ni reglas de coherencia en el prompt) por lo que este coste es marginal comparado con el ahorro real en el caso Claude Code.

**Por qué juicio de IA y no heurística local para decidir "envergadura":** igual que en v0.7.0 (recomendación de herramienta) y v0.13.0 (quién decide), se mantuvo el criterio de que sea la propia IA quien juzgue si el proyecto tiene envergadura suficiente para Claude Code, en vez de una regla determinista (recuento de palabras, detección de palabras clave) — una regla fija sería frágil y no captaría la diferencia real entre un script trivial y un proyecto con arquitectura/integración real. El prompt de triaje da el criterio explícito (varios archivos/componentes, arquitectura no trivial, integración entre partes, o mantenimiento de código existente) y pide activarlo ante la duda razonable.

No se tocó `SYSTEM_PROMPT` (el análisis completo) más allá de añadir la instrucción condicional `excludeClaudeCode` al mensaje de usuario cuando aplica — el resto del comportamiento (categorías de decisión, `decided_by`/`confirmation_trigger`, coherencia entre secciones) sigue exactamente igual.

## Historial de conversaciones con SQLite y contexto real entre mensajes de un hilo (v0.15.0)

El usuario pidió una barra lateral de historial (como en las webs de chat habituales): conversaciones con título, opción de renombrar y eliminar, y que un hilo se pueda continuar recordando el contexto de las peticiones anteriores — no solo volver a consultar un resultado ya cerrado.

**Por qué SQLite y no localStorage ni un JSON plano:** se preguntó explícitamente al usuario si localStorage (sin tocar el backend) era suficiente. El usuario prefirió una base de datos real porque el objetivo es que los hilos "recuerden bien" las respuestas dadas, no solo listar texto — un JSON plano no ofrece garantías de integridad ni consultas estructuradas. Esto significa romper deliberadamente la regla anterior de "V1 sin base de datos" (ver más arriba, "Sin base de datos ni persistencia en v1") — se acepta conscientemente el aumento de complejidad porque la funcionalidad pedida lo requiere de verdad, no por adelantarse a necesidades futuras. Se usó `better-sqlite3` (síncrono, sin proceso servidor aparte, encaja con el backend Express mínimo existente) y no un ORM, para no añadir una capa de abstracción que esta app no necesita con dos tablas.

**Modelo de datos:** `conversations` (id, title, created_at, updated_at) y `messages` (id, conversation_id, user_request, triage_json, result_json, created_at) — un mensaje guarda el `StructuredPrompt` completo tal cual se generó, no un resumen, para poder reconstruir el hilo exactamente como se vio y para poder reenviarlo como contexto real a DeepSeek.

**Cuándo se guarda algo en la base de datos — nunca en segundo plano sin decisión del usuario:** se consideró guardar cada conversación automáticamente desde la primera petición (más simple de implementar) frente a esperar una confirmación explícita. Se eligió lo segundo, siguiendo lo que pidió el usuario: el hilo existe solo en memoria del navegador mientras no se guarda, y la primera vez que se copia el `final_prompt` de un hilo no guardado aparece un diálogo preguntando "¿guardar o descartar?". Si se descarta, nunca llega a escribirse en SQLite — no queda ningún rastro ni registro oculto. Esta decisión evita llenar la base de datos con pruebas sueltas del usuario que nunca quiso conservar.

**Contexto real entre mensajes de un hilo, no solo un `result` de referencia:** al continuar un hilo con una nueva petición, el frontend envía `threadHistory` (todas las peticiones y resultados anteriores del hilo, en `POST /api/generate-prompt`) y el backend los antepone como turnos reales `user`/`assistant` en la conversación con DeepSeek (`buildThreadMessages()`), no como un bloque de texto resumido. Se decidió así tras preguntar explícitamente al usuario, priorizando fidelidad real del contexto sobre el coste creciente de tokens con cada mensaje nuevo del hilo — igual que se aceptó el coste del triaje en v0.14.0 por priorizar corrección sobre optimización marginal. Se añadió una regla explícita al `SYSTEM_PROMPT` ("CONTINUIDAD DE HILO") para que la IA trate los mensajes anteriores como contexto ya confirmado del mismo proyecto, no como peticiones aisladas.

**Vista del hilo:** se pidió que, al continuar una conversación, se vea el histórico completo apilado (como un chat), no solo el último resultado — `App.tsx` mantiene el hilo activo como una lista de mensajes en memoria y los renderiza todos en orden, reutilizando `StructuredPromptView` por cada uno.

No se tocó el modelo de análisis en sí (categorías de decisión, `ai_tool_recommendation`, triaje de v0.14.0) — el historial es una capa de persistencia y contexto alrededor de llamadas que ya existían, no un cambio en cómo se analiza cada petición individual.

## Saldo y coste por diferencia de saldo, no por tabla de precios (v0.16.0)

Se pidió un contador de saldo disponible y consumo de la última consulta. Antes de implementar nada se verificó dónde vive la clave de DeepSeek: ya estaba (desde v0.1.0) exclusivamente en el backend, nunca expuesta al frontend — el requisito de "si la clave está expuesta, añade una capa segura" ya estaba cumplido sin cambios.

**Cómo calcular el coste de la última consulta — la parte con más matices:** DeepSeek no expone el precio por token en la API. Se consultó la documentación oficial (api-docs.deepseek.com/quick_start/pricing): los precios varían por modelo (`deepseek-flash` vs `deepseek-v4-pro`), por franja horaria (pico/valle, mitad de precio fuera de pico) y por si el input tiene cache hit o miss — seis cifras distintas por modelo. Mantener esa tabla a mano (como `config/ai_recommendations.json`) habría añadido mantenimiento y riesgo de mostrar un coste incorrecto si se desactualiza o si se simplifica a un único precio "aproximado".

Se optó, con el usuario, por un método sin tabla de precios: consultar el saldo real (`GET /user/balance`) justo antes de lanzar la petición y otra vez justo después de recibir el resultado; la diferencia es el coste real exacto en USD, sin ninguna suposición. Limitación aceptada conscientemente: la API solo da el saldo con 2 decimales, así que una consulta barata (unos pocos milicentavos) puede no reflejarse en la diferencia — se mostró `< 0.01` en vez de `0.00` para no dar la falsa impresión de que la consulta fue gratis.

**Tokens de la última consulta:** cada llamada a la API con el SDK `openai` ya devuelve `usage` (`prompt_tokens`, `completion_tokens`, `total_tokens`) en cada respuesta — no se necesitó ninguna llamada adicional para esto, solo capturar un campo que ya llegaba y no se leía. Se propagó a través de `generateStructuredPrompt()`/`triageRequest()` (que ahora devuelven `{data, usage}` en vez de solo los datos) sin tocar `withSingleRetry()` (sigue siendo genérico).

**Dónde y cuándo se consulta el saldo:** se preguntó explícitamente al usuario. Se consulta al pulsar para generar (antes de `/api/triage`) y de nuevo al recibir el resultado final (después de `/api/generate-prompt`) — no en cada llamada intermedia ni con refresco periódico en segundo plano, para no multiplicar peticiones a la API de DeepSeek solo para refrescar un número.

No se tocó el flujo de generación de CLAUDE.md/TODO.md (`/api/generate-workspace`) — no se pidió mostrar su coste y añadirlo habría sido una funcionalidad no solicitada.

## Reafirmado: sin API de búsqueda automática para refrescar el catálogo de IA (v0.16.3)

Al ejecutar la lista de mejoras pendientes de `docs/STATE.md`, una de ellas era "mejorar la actualización de las recomendaciones de IA para que no dependa de un agente con búsqueda web". Antes de implementar nada se señaló al usuario que esto entra en conflicto directo con la decisión ya tomada en v0.5.0 ("Sin integración con ChatGPT" / búsqueda web, ver más arriba): añadir una API de búsqueda externa introduciría una dependencia de pago que el usuario quiso evitar explícitamente.

Se preguntó al usuario cómo resolver el conflicto. Tras exponer los motivos (estos datos cambian con poca frecuencia — semanas o meses, no a diario; una API de búsqueda con capa gratuita limitada gastaría su cuota mayormente en comprobaciones que no encuentran ningún cambio; una actualización automática sin supervisión humana podría guardar datos incorrectos en el catálogo, el mismo riesgo que v0.5.0 ya quiso evitar con "no inventar cifras"), el usuario confirmó mantener el proceso manual tal cual.

**Cambio real aplicado, mucho más acotado que "añadir búsqueda automática":** solo se mejoró la transparencia de la limitación ya conocida. El aviso de datos desactualizados (`SuggestedToolCard.tsx`, `stale` cuando `recommendationsUpdatedAt` tiene más de 7 días) pasó de ser una línea de texto discreta a un aviso visualmente destacado (usando los tokens `--warn`/`--warn-bg` ya existentes en el sistema de diseño) que indica el comando exacto a pedirle a un agente con búsqueda web, citando `docs/ACTUALIZAR_RECOMENDACIONES_IA.md` directamente. Se reforzó también ese documento para dejar explícito que la ausencia de búsqueda automática es una decisión deliberada, no un descuido pendiente de arreglar.
