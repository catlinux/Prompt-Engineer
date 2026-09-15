# Estado del proyecto

Última actualización: 2026-09-15

## En curso: mejoras por fases (post-v0.1.0)

Plan acordado con el usuario, una fase a la vez, verificando antes de pasar a la siguiente. Ver detalle de cada cambio en [CHANGELOG.md](../CHANGELOG.md).

1. ✅ **Fase 1 — Prompt final más corto y sin redundancia.** Hecho y verificado con llamada real a DeepSeek.
2. ✅ **Versionado con número de 3 partes + fecha visible en pantalla.** Hecho (v0.2.0). La versión se lee de `package.json` (única fuente de verdad); la fecha se actualiza a mano junto con el CHANGELOG al cerrar cada versión.
3. ✅ **Fase 2 — Interactividad real.** Hecho (v0.3.0). Las preguntas abiertas ahora tienen un campo de respuesta en pantalla (`src/components/OpenQuestionsForm.tsx`) y un botón que vuelve a llamar a la IA incluyendo esas respuestas (`answers` en `POST /api/generate-prompt`). Verificado con llamada real: las preguntas respondidas dejan de aparecer como pendientes y su contenido se refleja en el resto de campos.
4. ✅ **Rediseño del modelo de análisis (ingeniería de requisitos real).** Hecho (v0.4.0). Ver detalle abajo.
5. ✅ **Fase 3 — Recomendación de qué IA usar.** Hecho (v0.5.0). Ver detalle abajo.

Con esto, todas las fases del plan original están completadas.

## v0.4.0 — Rediseño del modelo de análisis

Cambio de fondo pedido por el usuario: la aplicación debía dejar de ser "un generador de prompts más largos" y comportarse como un ingeniero de requisitos — separando con rigor qué es un requisito confirmado, qué es una decisión realmente bloqueante, qué se puede aplazar, y qué es solo una recomendación de la IA.

**Modelo de datos nuevo** (`src/types.ts`, `StructuredPrompt`): sustituye `requirements`/`missing_information`/`open_questions`/`assumed_proposals` por:
- `role: ProfessionalRole | null` — perspectiva profesional contextual con comportamientos concretos, solo cuando aporta valor.
- `confirmed_requirements: string[]` — solo lo que el usuario ha dicho de verdad.
- `necessary_decisions: NecessaryDecision[]` — preguntas realmente bloqueantes, con `why_necessary`. Sigue siendo lo que rellena `OpenQuestionsForm.tsx` y lo que se responde para regenerar.
- `deferrable_decisions: DeferrableDecision[]` — cosas que faltan pero no bloquean, nuevo.
- `recommendations: Recommendation[]` — sugerencias de la IA, siempre marcadas como tales, nunca como requisito u obligación.

El system prompt (`server/deepseek.ts`) y el validador (`server/schema.ts`) se actualizaron en consecuencia. La interfaz (`StructuredPromptView.tsx`) muestra cada categoría por separado, con las recomendaciones y decisiones aplazables visualmente atenuadas para no competir con lo importante.

**Verificado con la petición de prueba pedida por el usuario** ("Quiero que me hagas un programa basado en Python para crear bots de trading"): no inventa exchange ni estrategia como requisitos (van a `necessary_decisions`/`deferrable_decisions` respectivamente), identifica solo 2 decisiones realmente bloqueantes (mercado/broker, real vs. simulación), recomienda arquitectura y librerías marcándolas explícitamente como recomendación, el rol incluye 5 comportamientos concretos (no solo la etiqueta "experto"), y el `final_prompt` es un párrafo compacto que integra todo sin listar cada categoría por separado.

## Idea futura (no planificada todavía)

"Hilo de prompts" por proyecto: si un proyecto es largo y necesita varias peticiones relacionadas, que la aplicación recuerde el contexto entre esas peticiones del mismo proyecto, pero lo olvide por completo al cambiar de proyecto. Ahora mismo cada petición ya es independiente (no hay memoria entre peticiones), así que esto sería añadir memoria *dentro* de un mismo proyecto, no quitarla. Pendiente de diseño (cómo se identifica un "proyecto", dónde se guarda el historial).

## Hecho

- Estructura del proyecto (frontend React+Vite+TS, backend Express+TS)
- Endpoint `POST /api/generate-prompt`: recibe una petición en lenguaje natural, llama a DeepSeek con un system prompt que exige estructura (objetivo, contexto, requisitos, restricciones, información ausente, preguntas abiertas, propuestas asumidas, criterios de verificación, resultado esperado, y sección Claude Code cuando corresponde) y devuelve JSON validado
- Frontend: formulario de entrada + vista estructurada del resultado + botón de copiar el prompt final
- Validación de forma de la respuesta de DeepSeek (`server/schema.ts`) para evitar mostrar datos corruptos
- Verificado: `npm run typecheck` sin errores, `npm run build` genera `dist/` correctamente
- **Verificado end-to-end con clave real de DeepSeek (modelo `deepseek-flash`)**, varias pruebas:
  - Petición de software ("app móvil de gastos"): `is_software_request: true`, `claude_code` relleno con contenido concreto y no genérico; distingue bien preguntas abiertas (plataforma, sincronización) de propuestas asumidas (almacenamiento local, categorías por defecto), marcadas como tales.
  - Petición no-software ("correo para pedir aumento de sueldo"): `is_software_request: false`, `claude_code: null` como se esperaba; no inventa datos (nombres, cifras) y los marca como placeholders o preguntas abiertas.
  - Petición real de software del usuario ("bot de trading en Python con Claude Code"): resultado de buena calidad — distingue preguntas personales (mercado, dinero real, estrategia) de propuestas convencionales (estructura modular, modo simulación por defecto, pytest); la restricción de seguridad "no operar con dinero real sin confirmación" aparece consistentemente en restricciones, propuestas e instrucciones persistentes.
  - **Observación:** en una llamada puntual con la petición de la app de gastos, la respuesta incumplió el esquema (`claude_code` mal formado) y el backend lo rechazó correctamente con error 502 en lugar de mostrar datos corruptos — el comportamiento de validación funciona, pero confirma que hay que contar con fallos ocasionales de formato del modelo.
- Interfaz de la app, textos fijos del código y documentación del repositorio traducidos a castellano (2026-09-15). El contenido generado por DeepSeek sigue respondiendo en el idioma en que el usuario escriba su petición — ver [DECISIONS.md](DECISIONS.md).
- Documentación base: README, CLAUDE.md, este archivo, DECISIONS.md

## v0.4.1 — Corrección: error "La respuesta de DeepSeek no es JSON válido"

Tras publicar v0.4.0 se detectó que la petición de prueba de bots de trading fallaba con bastante frecuencia (~50% de las veces) con ese error. Diagnóstico confirmado con `finish_reason: "length"` en la respuesta cruda: el nuevo esquema (más campos que antes: `role`, `necessary_decisions`, `deferrable_decisions`, `recommendations`) genera respuestas largas, y la llamada a la API no fijaba `max_tokens`, dejándola en un valor por defecto insuficiente que cortaba el JSON a medias.

Solución en `server/deepseek.ts`:
- `max_tokens: 8192` explícito en la llamada (el modelo `deepseek-flash` admite hasta 384K de salida, así que hay margen de sobra).
- Reintento automático: si el JSON sale inválido o no cumple el esquema, se reintenta una vez más antes de devolver error al usuario.

Verificado con 10 llamadas reales consecutivas tras el fix: 10/10 correctas (antes, 7 de 13 fallaban).

## v0.5.0 — Recomendación de qué IA usar

Investigación real (búsqueda web) de límites y versión gratuita de Claude.ai, ChatGPT y Gemini a fecha 2026-09-15, guardada en [`config/ai_recommendations.json`](../config/ai_recommendations.json) y documentada en legible en [docs/RECOMENDACIONES_IA.md](RECOMENDACIONES_IA.md).

**Decisión técnica importante:** se investigó si la propia API de DeepSeek podía hacer la búsqueda web en cada petición (como pidió el usuario inicialmente). Se confirmó que DeepSeek sí tiene búsqueda web nativa, pero solo a través de su endpoint compatible con Anthropic (`api.deepseek.com/anthropic`), no en el endpoint compatible con OpenAI que usa esta app — y su documentación pública no detalla activación, parámetros ni coste con suficiente claridad para implementarlo con confianza. Se descartó integrarlo en el backend por ahora.

**Solución adoptada:** el backend elige la herramienta recomendada de forma determinista (sin IA, `server/aiRecommendations.ts`) según si la petición es de software o no. Los datos de precios/límites se actualizan a mano, con ayuda de un agente con búsqueda web (como Claude Code), siguiendo el procedimiento en [docs/ACTUALIZAR_RECOMENDACIONES_IA.md](ACTUALIZAR_RECOMENDACIONES_IA.md). La interfaz avisa cuando esos datos tienen más de 7 días.

**Limitación aceptada conscientemente:** quien descargue el proyecto sin un agente con búsqueda web no puede refrescar estos datos — se quedan congelados en la fecha del último `git push`. El usuario decidió aceptar esta limitación para esta versión en lugar de añadir una API de búsqueda de pago al backend. Ver [DECISIONS.md](DECISIONS.md).

## v0.6.0 — Catálogo de IA ampliado a 8 categorías

El usuario señaló que limitar la recomendación a "software o texto general" desaprovechaba el potencial real: la IA sirve para imagen, vídeo, música, resúmenes de documentos, transcripción, investigación, etc. Se investigó (búsqueda web real) cada categoría y se amplió el catálogo.

**Cambio de modelo:** `StructuredPrompt` ahora incluye `content_category` (8 valores posibles, ver `src/types.ts`), que DeepSeek clasifica en la misma llamada que ya hace el análisis (sin coste extra de llamadas). `server/aiRecommendations.ts` elige la herramienta cuyo `categories` incluya la categoría detectada, en vez de la regla binaria anterior (software → Claude, resto → ChatGPT).

**Catálogo añadido:** Leonardo AI (imagen), Kling AI (vídeo), Suno (música), NotebookLM (resumen de documentos e investigación profunda), Otter.ai (transcripción de audio) — datos investigados el 2026-09-15, ver [docs/RECOMENDACIONES_IA.md](RECOMENDACIONES_IA.md).

Verificado con llamadas reales para las tres categorías nuevas más comprobación de que código/software sigue recomendando Claude.ai sin regresión: imagen → Leonardo AI, música → Suno, resumen de documentos → NotebookLM, código → Claude.ai. Los cuatro casos clasificaron `content_category` correctamente y sugirieron la herramienta esperada.

Verificado con llamada real: petición de software → recomienda Claude.ai; petición no-software → recomienda ChatGPT; `recommendationsUpdatedAt` se sirve correctamente.

## v0.7.0 — Recomendación de IA por juicio real, no por regla fija

El usuario señaló que la selección determinista por categoría (`content_category` → una única herramienta fija) desaprovechaba el potencial real: peticiones con varias subtareas (por ejemplo, una tienda online que necesita desarrollo + textos + imágenes) necesitan poder recomendar varias herramientas distintas, y la elección debe ser un juicio sobre la naturaleza del trabajo, no una coincidencia de categoría.

**Cambio de fondo:** se eliminó `pickRecommendedTool()` (selección determinista en `server/aiRecommendations.ts`). Ahora DeepSeek recibe el catálogo completo como contexto en el mismo mensaje (`formatCatalogForPrompt()`) y decide él mismo, dentro de la misma llamada que ya hace el resto del análisis (sin coste extra de llamadas):
- `task_breakdown`: qué tareas/subtareas contiene la petición y qué capacidades necesita cada una.
- `primary`: herramienta principal (`tool_id` del catálogo, nunca inventado — el validador lo comprueba contra los IDs reales).
- `complementary`: herramientas adicionales cuando distintas partes del trabajo necesiten cosas distintas.
- `alternatives`: herramientas comparables, con la diferencia explicada — o reconociendo que el catálogo no distingue con confianza (nunca inventa una diferencia).

Este bloque (`ai_tool_recommendation`) es un campo propio de `StructuredPrompt`, separado de `recommendations` (que trata de cómo resolver el proyecto, no de qué herramienta usar) — ver DECISIONS.md.

**Catálogo ampliado:** se separó `claude_ai` (chat, no agéntico) de `claude_code` (agente autónomo) como entradas distintas con un campo `is_agentic`, y se añadió `deepseek` al catálogo (para evitar sesgo: la IA puede recomendarse a sí misma si encaja). Los datos de precio/cuota que la IA no debe inventar (campo `price_note`, límites) solo se resuelven en el backend/frontend a partir del `tool_id`, nunca los reescribe DeepSeek.

**UI:** `SuggestedToolCard.tsx` reescrito para mostrar IA principal, complementarias y alternativas, resolviendo cada `tool_id` contra el catálogo recibido (`toolCatalog` en la respuesta del endpoint).

**Verificado con los tres casos pedidos por el usuario:**
1. Proyecto de software complejo (plataforma de inventario) → principal: Claude Code (agéntico), complementaria: Claude.ai (diseño/documentación). Distingue correctamente ambas herramientas del mismo proveedor.
2. Canal de YouTube de divulgación → principal: Claude.ai (guiones/investigación), complementarias: Leonardo AI (miniaturas) y NotebookLM (síntesis de fuentes). Sin ninguna herramienta agéntica, correctamente.
3. Tienda online (desarrollo + textos + imágenes) → principal: Claude Code, complementarias: Claude.ai (descripciones) y Leonardo AI (imágenes de producto) — las tres subtareas distintas recomendadas con herramientas distintas, como se pedía explícitamente.

Ningún caso recomendó Claude/Anthropic por defecto sin razonamiento explícito; los tres justifican la elección con las capacidades reales de cada tarea.

## v0.8.0 — Distinguir decisiones bloqueantes de decisiones importantes no bloqueantes

El usuario detectó que el sistema confundía "esto es importante" con "esto bloquea el trabajo". Con el modelo anterior (`necessary_decisions` vs `deferrable_decisions`), cualquier cosa moderadamente relevante tendía a acabar como pregunta bloqueante, obligando a responder antes de poder avanzar aunque se pudiera continuar razonablemente con una hipótesis.

**Cambio quirúrgico** (sin tocar la arquitectura de recomendación de IA de v0.7.0, tal como pidió el usuario): se añadió una categoría intermedia, `important_pending_decisions`, entre las bloqueantes y las aplazables. Cada una lleva `topic`, `provisional_approach` (la hipótesis con la que se avanza), `why_important` y `what_could_change` (qué cambiaría si el usuario decide otra cosa después). La regla central añadida al system prompt (`server/deepseek.ts`, regla 2): antes de marcar algo como bloqueante hay que comprobar tres condiciones a la vez (impide continuar / no es razonable asumir una hipótesis / continuar sin ello podría causar trabajo inútil o difícil de revertir) — si no se cumplen las tres, no es bloqueante. También se añadió la regla de "bloqueo parcial": si algo bloquea solo una parte del proyecto, `why_necessary` debe decirlo explícitamente en vez de presentarlo como si detuviera todo.

**UI:** nuevo componente `ImportantPendingDecisions.tsx` (sin formulario de respuesta — no obliga a regenerar) entre las decisiones bloqueantes (`OpenQuestionsForm`, renombrada en pantalla a "Decisiones bloqueantes") y las recomendaciones.

**`final_prompt`:** regla explícita para no incluir contradicciones tipo "debes responder esto antes de continuar" cuando la decisión es de tipo "importante pendiente" — en su lugar, menciona la hipótesis de forma natural.

**Verificado con los tres casos pedidos por el usuario:**
1. App móvil de notas con sincronización, sin decidir nativa/multiplataforma → solo 1 decisión bloqueante (la elección de plataforma, con bloqueo parcial explícito: bloquea el cliente pero no el backend/modelo de datos); 3 decisiones importantes con hipótesis concretas (backend, resolución de conflictos, alcance MVP); resto aplazable.
2. Canal de YouTube sin público objetivo definido → **0 decisiones bloqueantes**, 5 decisiones importantes con hipótesis razonables (público, idioma, formato, frecuencia, objetivo del canal).
3. Tienda online sin país ni métodos de pago decididos → **0 decisiones bloqueantes**; país/pagos pasan a importantes con hipótesis provisional (pasarela configurable, región neutra parametrizable); el `final_prompt` dice explícitamente "avanza con hipótesis provisionales y no las trates como bloqueos", sin contradicciones.

Confirmado sin regresión: la recomendación de herramienta de IA (`ai_tool_recommendation`) sigue funcionando exactamente igual (verificado con el caso 3: sigue recomendando Claude Code como principal con el mismo razonamiento que antes de este cambio).

## v0.9.0 — Entorno de trabajo (CLAUDE.md/TODO.md) cuando la IA recomendada es Claude Code

El usuario señaló que recomendar Claude Code no debería quedarse solo en el prompt: Claude Code trabaja con un `CLAUDE.md` persistente en el proyecto, así que la aplicación puede prepararlo directamente. Se decidió con el usuario: pregunta explícita de sí/no antes de mostrar el contenido extra (para no ensuciar la pantalla cuando no interesa), y entrega por botón de copiar por archivo — la app es solo frontend+backend sin acceso al disco del usuario, no puede escribir la carpeta del proyecto ella misma ni generar un .zip en esta versión.

**Nuevo campo** `claude_code_workspace` en `StructuredPrompt` (`{offer_message, suggested_folder_name, claude_md_content, todo_md_content}`), rellenado por DeepSeek en la misma llamada solo cuando `ai_tool_recommendation.primary.tool_id === "claude_code"` — en cualquier otro caso es `null`. El contenido es real y específico del proyecto (basado en el rol, objetivo, restricciones y decisiones/hipótesis ya analizadas), no una plantilla genérica. El validador (`server/schema.ts`) rechaza la respuesta si `claude_code_workspace` aparece sin que la herramienta principal sea `claude_code`, evitando incoherencia.

**UI:** nuevo componente `ClaudeCodeWorkspaceOffer.tsx` — muestra primero solo la pregunta (`offer_message` redactado por DeepSeek, adaptado a cada petición) con botones Sí/No; si Sí, expande el nombre de carpeta sugerido y los dos archivos con su propio botón de copiar cada uno (reutilizando `CopyButton` con la nueva prop `label`).

**Verificado con llamada real** (gestor de tareas personales en Python): `claude_code_workspace` se generó con contenido específico del proyecto real (esquema SQLite, CLI como hipótesis, recordatorios) en ambos archivos, no genérico. Verificado también que con una petición cuya herramienta principal no es Claude Code (canal de YouTube → `claude_ai`), el campo es `null` correctamente.

## v0.9.1 — Corrección: volvió a aparecer "La respuesta de DeepSeek no es JSON válido"

Tras publicar v0.9.0, el `max_tokens: 8192` fijado en la corrección de v0.4.1 se quedó corto otra vez: los campos añadidos desde entonces (`important_pending_decisions`, `ai_tool_recommendation` con el catálogo completo, y sobre todo `claude_code_workspace` con el contenido íntegro de CLAUDE.md y TODO.md) hacen que la respuesta JSON sea mucho más grande, y volvía a cortarse a medias (`finish_reason: length`).

Se subió `max_tokens` a 16384 en `server/deepseek.ts` (el modelo `deepseek-flash` admite hasta 384K de salida, sigue habiendo margen de sobra). Verificado con 7 llamadas reales usando la petición que genera el JSON más grande (software con `claude_code_workspace`): 7/7 respuestas válidas con el workspace generado correctamente. Un intento adicional dio un corte de conexión (`HTTP 000`, sin respuesta del servidor) que no está relacionado con este error — no llegó a haber respuesta de DeepSeek que parsear.

## Pendiente / no hecho todavía

- Entrega del entorno de trabajo de Claude Code solo por copiar/pegar archivo a archivo — no genera un .zip descargable ni escribe directamente al disco (la app no tiene acceso al sistema de archivos del usuario). Aceptado conscientemente para esta versión; podría mejorarse más adelante si aporta valor suficiente.

- Botón para borrar la petición actual y empezar una consulta nueva, cerca del campo de entrada de texto. Pedido por el usuario, no implementado todavía.
- Mejorar la actualización de las recomendaciones de IA para que no dependa de tener un agente con búsqueda web (por ejemplo con una API de búsqueda propia del backend) — limitación conocida y aceptada de v0.5.0, ver arriba.

- Posible mejora del system prompt (detectada revisando la respuesta del caso "bot de trading"): el `final_prompt` no siempre repite con la misma fuerza que `claude_code.documentation_to_create` la instrucción de crear documentación persistente (CLAUDE.md/docs/), y los criterios de verificación no siempre incluyen comprobar que no se han subido credenciales a git pese a que las instrucciones persistentes sí lo piden. Ajuste menor, no bloqueante.
- Sin tests automatizados
- Sin persistencia/historial de peticiones (deliberadamente fuera de v1, ver DECISIONS.md)
- Sin gestión de rate-limiting ni de peticiones concurrentes en el backend

## Decisión pendiente abierta

Validar con uso real y continuado si este concepto aporta suficiente valor respecto a escribir el prompt directamente. Las pruebas realizadas son prometedoras (detecta vacíos reales, no inventa datos, refuerza restricciones de seguridad de forma consistente), pero conviene seguir probando con más casos de uso del usuario.

## Cómo continuar en una sesión futura

1. Lee este archivo y [DECISIONS.md](DECISIONS.md).
2. Confirma que `.env` tiene una clave válida (`npm run dev` y prueba una petición).
3. Revisa la lista "Pendiente" antes de añadir funcionalidad nueva.
