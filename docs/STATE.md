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

## v0.10.0 — Coherencia interna: una decisión no puede vivir en dos categorías contradictorias

El usuario detectó (con un caso real de mods para AzerothCore) que una misma decisión podía aparecer a la vez en `claude_code` como algo "que el agente puede decidir" y como algo "que debe consultar obligatoriamente" — instrucciones contradictorias para el agente final. La causa raíz: `ClaudeCodeSection` tenía `decisions_to_make`/`decisions_to_consult` como listas de texto libre **redundantes** con el modelo de fases ya existente (`necessary_decisions`/`important_pending_decisions`/`recommendations`/`deferrable_decisions`), generadas por separado sin ninguna referencia cruzada — el modelo podía (y a veces lo hacía) escribir el mismo tema en dos sitios con tratamiento distinto.

**Solución elegida (la más pequeña posible, sin arquitectura nueva):** eliminar la redundancia en vez de añadir una capa de detección de contradicciones sobre texto libre (más frágil e imprecisa). `ClaudeCodeSection.decisions_to_make`/`decisions_to_consult` se sustituyeron por un único campo `decision_references: string[]` — solo puede contener los `question`/`topic` **exactos, copiados literalmente**, de decisiones que ya existen en `necessary_decisions`/`important_pending_decisions`/`recommendations`. Nunca redacta un texto nuevo ni reclasifica: solo apunta. Con esto, la contradicción es estructuralmente imposible — no hay dos fuentes de verdad sobre la misma decisión, solo una.

**Dos capas de verificación añadidas en `server/schema.ts`:**
1. `findDuplicateDecisionTopic()`: recorre `necessary_decisions`, `important_pending_decisions`, `recommendations` y `deferrable_decisions` y rechaza la respuesta si el mismo `question`/`topic` aparece en más de una de esas categorías.
2. `isClaudeCodeSection()` ahora exige que cada entrada de `decision_references` coincida literalmente con un tema ya existente en alguna de esas categorías (usa `collectDecisionTopics()`) — si referencia algo que no existe, se rechaza.

Si el validador detecta cualquiera de las dos incoherencias, la respuesta se rechaza como si fuera JSON malformado, lo que dispara el reintento automático ya existente (de v0.4.1) — el usuario nunca ve un resultado contradictorio, sencillamente se genera de nuevo.

**System prompt** (`server/deepseek.ts`): nueva regla explícita de coherencia (regla 2, "UNA DECISIÓN, UNA SOLA CATEGORÍA") pidiendo revisar antes de responder que ningún tema aparezca en dos categorías con tratamiento distinto, y que una decisión que necesitará confirmación en una fase posterior (ej. antes de producción) se exprese como parte de la misma decisión importante-no-bloqueante (usando `what_could_change`/`provisional_approach`), nunca duplicada como bloqueante.

**Verificado con el caso real que dio el usuario** (mod de torneo con jefes gemelos en AzerothCore, con la petición explícita de buscar documentación): "Zona exacta del mapa y ubicación del evento" aparece una sola vez, clasificada en `important_pending_decisions` con hipótesis provisional y `what_could_change` claro; `claude_code.decision_references` solo apunta a ese mismo texto, sin redactarlo de nuevo ni contradecirlo. Verificado programáticamente sobre 3 llamadas reales: 0 duplicados entre categorías, 0 referencias inválidas en `decision_references`. Verificado sin regresión: petición no-software sigue con `claude_code: null`; `ai_tool_recommendation` y `claude_code_workspace` siguen funcionando exactamente igual que antes (no se tocó esa lógica, tal como pidió el usuario).

## v0.10.1 — Claridad de etiquetas y foco en la pregunta de Claude Code

El usuario, probando un caso real (mod de AzerothCore recomendando Claude Code), señaló dos problemas de interfaz — analizados antes de asumir que tenía razón:

1. **"IA complementaria" vs "Alternativas":** se revisó la definición real en el system prompt (regla 9.d/9.e de `server/deepseek.ts`) y se confirmó con datos reales que la lógica ya era correcta: `complementary` son herramientas que trabajan *junto a* la principal para partes distintas del trabajo (ej. Claude.ai para diseño mientras Claude Code construye), y `alternatives` son herramientas que la *sustituirían* haciendo el mismo papel (ej. DeepSeek en vez de Claude Code). No eran lo mismo, así que no había que fusionarlas ni convertir "complementaria" en "alternativa a no usar Claude Code" — el problema era que las etiquetas de la UI no comunicaban esa diferencia. Se cambiaron a "IA complementaria (se usa junto a la principal, para otra parte del trabajo)" y "Alternativas a la IA principal (en vez de ella, no además)" en `SuggestedToolCard.tsx`.

2. **Foco en la pregunta de Claude Code:** cuando aparece `claude_code_workspace`, toda la demás información (rol, objetivo, decisiones, prompt final...) se mostraba igualmente debajo de la pregunta "¿Preparamos el entorno de trabajo?", enterrándola entre contenido. Se subió el estado de la elección (`pending`/`yes`/`no`) de `ClaudeCodeWorkspaceOffer` a `StructuredPromptView` (ahora controlado por props `choice`/`onChoice`), y se envuelve todo el contenido posterior en un condicional que no renderiza nada mientras la elección esté `pending`. En cuanto se responde (sí o no), el resto de la pantalla vuelve a aparecer con normalidad.

Verificado: `npm run typecheck`, `npm test` (6/6) y `npm run build` sin errores tras el cambio.

## v0.10.2 — decision_references ya no puede apuntar a recomendaciones ni a decisiones aplazables

El usuario, revisando el caso real de AzerothCore, detectó que la sección de Claude Code ("Decisiones relevantes para esta tarea") listaba cosas como "Estructura dels mods", "Reutilitzar mòduls existents" y "Ordre d'implementació" como si fueran decisiones pendientes, cuando en realidad eran `recommendations` ya resueltas por la IA — daba la falsa impresión de que había que consultarlas o decidirlas.

**Causa raíz:** la regla 4 del system prompt (`server/deepseek.ts`) permitía que `claude_code.decision_references` referenciara temas de tres categorías (`necessary_decisions`, `important_pending_decisions` **o `recommendations`**). El validador de v0.10.0 (`findDuplicateDecisionTopic`) no detectaba esto como contradicción porque técnicamente no había duplicado incompatible — era un fallo de diseño de qué categorías son válidas como referencia, no un caso que el mecanismo de v0.10.0 estuviera pensado para cubrir.

**Cambio (mínimo, sin tocar arquitectura ni el motor de recomendación de IA):**
- System prompt: `decision_references` ahora solo puede referenciar `necessary_decisions` o `important_pending_decisions` — nunca `recommendations` ni `deferrable_decisions`. Si se quiere que Claude Code aplique una recomendación, debe ir en `persistent_instructions` con su propio texto, no mezclada como decisión pendiente.
- `server/schema.ts`: nueva función `collectPendingDecisionTopics()` (solo las 2 categorías realmente pendientes) usada para validar `decision_references`, sustituyendo la anterior `collectDecisionTopics()` (que en la práctica había quedado como código muerto — no se llamaba desde ningún sitio tras el cambio de v0.10.0, `findDuplicateDecisionTopic()` hace su propia recolección internamente). Se eliminó por limpieza.
- 9 tests nuevos en `server/schema.test.ts`: casos representativos de las 4 categorías, una decisión que solo necesita confirmación en fase posterior, y un test explícito de la contradicción "puede decidir" (recommendation) vs "debe consultar" (necessary_decision) sobre el mismo topic — confirma que el validador la detecta y rechaza. Total: 15/15 tests pasan.

**Verificado con el mismo caso real de AzerothCore:** `claude_code.decision_references` ahora solo contiene las 4 decisiones de `important_pending_decisions` (enfoque C++/Lua, significado de "torneig de twins", economía de la subhasta, specs de NPCs); ninguna de las 4 `recommendations` ("seguir estructura oficial", "reutilizar proyectos de GitHub", "orden de desarrollo", "configurabilidad") aparece ya en esa lista — en su lugar, la recomendación de seguir la estructura oficial se refleja correctamente en `claude_code.persistent_instructions`.

## v0.11.0 — Diseño visual, acceso remoto vía túnel, y ajuste de max_tokens

**Diagnóstico de lentitud:** el usuario reportó que la aplicación tarda mucho en responder. Medido con una petición real (software con `claude_code_workspace`): **68 segundos**, con una respuesta de ~22.500 caracteres (~6.000 tokens). Causa: se hace una sola llamada grande a DeepSeek que junta análisis completo + recomendación de IA + `CLAUDE.md`/`TODO.md`, en vez de varias llamadas pequeñas — decisión de diseño original para minimizar coste, cuyo coste es el tiempo de espera. No se ha resuelto en esta versión (ver "Pendiente"); solo se subió `max_tokens` de 16384 a 24576 de forma preventiva, ya que el patrón histórico (v0.4.1, v0.9.1) es que el proyecto tiende a superar el límite anterior según crece el system prompt.

**Diseño visual:** rediseño completo de `src/index.css` con un sistema de tokens propio — acento índigo (`#5b5fef` claro / `#8b8ef8` oscuro), neutros con matiz violeta en vez de gris puro, tipografía Fraunces (serif, títulos) + Inter (cuerpo) + JetBrains Mono (prompt final, bloques de código, metadatos), cargadas vía Google Fonts en `index.html`. Cada tipo de sección lleva un borde lateral de color según su naturaleza (azul para Claude Code/rol, verde para recomendaciones y el prompt final, ámbar para decisiones importantes) en vez de un estilo uniforme. Se mantuvieron todas las clases existentes usadas por los componentes React (verificado cruzando `className` de los componentes contra las reglas CSS) — cambio solo de apariencia, ninguna estructura tocada.

**Acceso remoto:** `vite.config.ts` ahora tiene `allowedHosts: true`, necesario para poder exponer el servidor de desarrollo a través de un túnel temporal (Cloudflare Tunnel u otro) con hostname aleatorio — sin esto, Vite rechaza con 403 cualquier petición cuyo `Host` no reconozca. Solo afecta al servidor de desarrollo local, nunca a producción (esta app no tiene despliegue).

Verificado: `npm run typecheck`, `npm test` (15/15) y `npm run build` sin errores.

## v0.12.0 — Separar la generación del workspace + indicador de progreso

Continuación del diagnóstico de lentitud de v0.11.0. Dos cambios, medidos con la misma petición pesada (software con Claude Code) contra una instancia aislada de depuración (puerto 3098, sin tocar el servidor del usuario):

**1. `claude_code_workspace` en una llamada separada.** Antes, `generateStructuredPrompt()` generaba siempre el contenido íntegro de CLAUDE.md/TODO.md junto con el resto del análisis, aunque el usuario acabara respondiendo "No, solo el prompt". Ahora:
- La llamada principal (`server/deepseek.ts`, `SYSTEM_PROMPT`) solo pide la oferta breve (`offer_message` + `suggested_folder_name`) — el tipo `ClaudeCodeWorkspaceOfferInfo`, ya no `ClaudeCodeWorkspace` completo.
- Nueva función `generateClaudeCodeWorkspace()` con su propio system prompt (`WORKSPACE_SYSTEM_PROMPT`), llamada solo cuando el usuario pulsa "Sí, prepáralo", vía el nuevo endpoint `POST /api/generate-workspace` (recibe `userRequest` + el `result` ya obtenido, sin recalcular nada).
- El mecanismo de reintento único (de v0.4.1) se extrajo a una función genérica `withSingleRetry()` para no duplicar la lógica entre ambas llamadas.
- `server/schema.ts`: `isClaudeCodeWorkspaceOfferInfo()` sustituye a la validación anterior (ya no exige `claude_md_content`/`todo_md_content` en la respuesta principal); nueva validación ligera para la respuesta de la segunda llamada.

**Medido:** llamada principal ahora ~62s (antes ~68s con todo junto) y genera una respuesta de ~15.7KB (antes ~22.5KB) — mejora real pero moderada, porque gran parte del tiempo no es generación de tokens de salida sino el razonamiento del modelo antes de escribir (`temperature: 0.3`, system prompt largo con reglas de coherencia). La llamada de workspace por separado tarda ~36s. En el caso de responder "No" (probablemente el más frecuente mientras se prueba la app), el ahorro es real (~6s menos, respuesta más ligera); en el caso de responder "Sí", el total combinado (~98s) es similar a antes, pero ahora el usuario ve el análisis principal a los 62s en vez de esperar a que todo esté listo a la vez.

**2. Indicador de progreso.** Nuevo componente `ElapsedTimer.tsx` (contador de segundos transcurridos, sin dependencias), usado en `RequestInput.tsx` (llamada principal, con aviso de "puede tardar 1-2 minutos") y en `ClaudeCodeWorkspaceOffer.tsx` (llamada de workspace). Sustituye la pantalla en blanco silenciosa anterior.

Verificado: `npm run typecheck`, `npm test` (16/16, se añadieron 2 tests para el nuevo `ClaudeCodeWorkspaceOfferInfo`) y `npm run build` sin errores. Verificado con llamadas reales que ambos endpoints devuelven contenido de buena calidad y específico del proyecto.

## v0.13.0 — Revisión de arquitectura: quién decide y cuándo confirmar

El usuario pidió una revisión de calidad (sin reescritura general, sin tocar el motor de recomendación de IA) para comprobar si el sistema distingue bien: requisitos confirmados, información a investigar, decisiones bloqueantes, importantes-no-bloqueantes, decisiones que puede tomar el agente, decisiones que el agente debe investigar antes de tomar, decisiones que solo necesitan confirmación antes de una acción irreversible, y decisiones aplazables.

**Inspección previa (antes de tocar nada):** se revisó `server/deepseek.ts`, `server/schema.ts`, `server/schema.test.ts`, `StructuredPromptView.tsx` y `ImportantPendingDecisions.tsx`. Confirmado que ya funcionaban bien y no se tocaron: la distinción bloqueante/importante/delegable/aplazable (v0.8.0), la detección de duplicados entre categorías (v0.10.0), la restricción de `decision_references` (v0.10.2), y el motor de `ai_tool_recommendation` (v0.7.0).

**Problemas reales detectados (3):**
1. No existía un campo explícito para "quién decide" — no se distinguía entre una decisión que el agente puede resolver directamente y una que solo puede resolver bien después de investigar el proyecto real (ej. "qué base de datos usar" depende de lo que ya exista).
2. No existía un campo estructurado para "cuándo hay que confirmar" — el `what_could_change` de texto libre a veces mencionaba una fase (ej. "antes de producción") pero no había ninguna estructura que lo garantizara ni lo distinguiera de una decisión bloqueante.
3. La regla del `final_prompt` no mencionaba explícitamente conservar estas condiciones de confirmación, con riesgo real de perder esa información en la síntesis.

**Cambio mínimo implementado:** se amplió únicamente `important_pending_decisions` (ninguna categoría nueva, ninguna otra categoría tocada) con dos campos:
- `decided_by: "user" | "agent" | "agent_after_investigation"` — quién debería tomar la decisión definitiva.
- `confirmation_trigger: string | null` — solo se rellena cuando la decisión, aunque no bloquee ahora, deba confirmarse obligatoriamente antes de una acción irreversible o de alto riesgo (producción, dinero real, borrado de datos, comunicaciones públicas). `null` es lo normal; no es una forma disimulada de convertir la decisión en bloqueante.

System prompt (`server/deepseek.ts`): nuevas reglas 2b (cómo elegir `decided_by`, con criterio explícito para no usar "user" por defecto) y 2c (cuándo rellenar `confirmation_trigger`). Regla 6 (`final_prompt`) reforzada para que mencione explícitamente las condiciones de confirmación cuando existan. `WORKSPACE_SYSTEM_PROMPT` también actualizado para que el TODO.md refleje `decided_by`/`confirmation_trigger`.

`server/schema.ts`: `isImportantPendingDecisionArray()` valida ahora `decided_by` (contra los 3 valores válidos) y `confirmation_trigger` (string o null).

**UI:** `ImportantPendingDecisions.tsx` muestra una etiqueta con quién decide, y si hay `confirmation_trigger`, una segunda etiqueta de aviso con la condición.

**Tests:** 3 tests nuevos (18 en total) — decisión con `decided_by` inválido rechazada, `agent_after_investigation` válido, y confirmación en fase posterior usando el campo real en vez de texto libre dentro de `what_could_change`.

**Verificado con llamada real** (bot de trading con Claude Code sobre proyecto existente): 0 decisiones bloqueantes, 5 importantes-no-bloqueantes bien clasificadas — `confirmation_trigger` solo se rellenó en las dos decisiones que de verdad implican dinero real ("confirmar antes de ejecutar la primera orden con fondos reales", "confirmar antes de habilitar el trading con fondos reales"), las otras 3 quedaron en `null` correctamente (sin inflar artificialmente); `decided_by: "agent_after_investigation"` apareció exactamente en la decisión que depende del proyecto existente ("Integración con el proyecto existente"). Confirmado que el `final_prompt` conserva la condición de confirmación ("Antes de habilitar el trading con fondos reales, deberás confirmar explícitamente...") sin alargarse innecesariamente.

Verificado: `npm run typecheck`, `npm test` (18/18) y `npm run build` sin errores.

## v0.14.0 — Triaje previo: preguntar por Claude Code antes de generar el análisis completo

El usuario pidió reducir el consumo innecesario: cuando la herramienta recomendada acababa siendo Claude Code, la aplicación ya había generado y pagado todo el análisis completo (decisiones, recomendaciones, `final_prompt`) antes de preguntar si el usuario lo quería. Se añadió una llamada de triaje previa, corta y barata (`POST /api/triage`, `max_tokens: 1024`), que solo detecta si es software, su categoría, y si Claude Code merece preguntarse antes de analizar a fondo (`claude_code_recommended`).

**Flujo resultante:**
- Triaje descarta Claude Code (no-software o proyecto pequeño) → llamada completa de análisis directamente, sin pregunta previa (igual que antes).
- Triaje recomienda Claude Code → se muestra la pregunta ANTES de generar nada más. "Sí" → llamada completa normal. "No" → llamada completa con instrucción explícita de excluir Claude Code (`excludeClaudeCode: true` en `POST /api/generate-prompt`), que nunca lo propone como principal ni complementaria.

**Decisión de diseño:** siempre se hacen las mismas dos llamadas (triaje + la que corresponda), incluso en peticiones claramente no-software — se descartó añadir una heurística local previa para ahorrar ese triaje en el caso más frecuente, priorizando simplicidad y previsibilidad sobre la optimización marginal (el triaje es barato). Ver [DECISIONS.md](DECISIONS.md).

**Verificado con llamadas reales** contra una instancia de depuración aislada (puerto 3098, sin tocar el servidor del usuario):
1. Petición de inventario con envergadura real (backend, BD, auth, informes, repo existente) → triaje detecta `claude_code_recommended: true` con `offer_message` específico mencionando Express/PostgreSQL del texto real.
2. Petición no-software (correo pidiendo aumento de sueldo) → triaje devuelve `claude_code_recommended: false`, `offer_message`/`suggested_folder_name` correctamente `null`.
3. Misma petición de inventario confirmando "sí" → `ai_tool_recommendation.primary.tool_id` es `claude_code`, `claude_code_workspace` presente.
4. Misma petición de inventario con `excludeClaudeCode: true` (caso "no") → `primary` pasa a `claude_ai`, ninguna herramienta complementaria es Claude Code, `claude_code_workspace` es `null`, `final_prompt` mantiene la misma calidad y especificidad que antes.

Verificado: `npm run typecheck`, `npm test` (22/22, 4 tests nuevos para `isTriageResult`) y `npm run build` sin errores.

## v0.15.0 — Historial de conversaciones con SQLite y continuación real de hilo

El usuario pidió una barra lateral de historial tipo chat: título por conversación, renombrar, eliminar, y que un hilo se pueda continuar recordando el contexto de peticiones anteriores del mismo proyecto (no solo volver a consultar un resultado ya cerrado). También pidió que, al copiar el prompt final, se pregunte si guardar la consulta en el historial o descartarla.

**Cambio de fondo consciente:** se adopta SQLite (`better-sqlite3`) para persistencia, rompiendo deliberadamente la regla previa "V1 sin base de datos" — se preguntó explícitamente al usuario (¿localStorage basta?) y prefirió una base de datos real porque el objetivo es que los hilos recuerden bien el contexto, no solo listar texto. Ver justificación completa en [DECISIONS.md](DECISIONS.md).

**Backend:**
- `server/db.ts`: esquema SQLite (`conversations`, `messages`), fichero `data/history.db` (gitignored).
- `server/history.ts`: CRUD de conversaciones y mensajes.
- Endpoints nuevos: `GET/POST /api/conversations`, `GET/PATCH/DELETE /api/conversations/:id`, `POST /api/conversations/:id/messages`.
- `POST /api/generate-prompt` acepta `threadHistory` (peticiones+resultados anteriores del mismo hilo) y los antepone como turnos reales `user`/`assistant` en la llamada a DeepSeek (`buildThreadMessages()` en `server/deepseek.ts`) — contexto real, no un resumen. Nueva regla "CONTINUIDAD DE HILO" en `SYSTEM_PROMPT`.

**Frontend:**
- `Sidebar.tsx`: lista de conversaciones guardadas, botón "Nueva consulta", renombrar inline, eliminar con confirmación.
- `SaveConversationPrompt.tsx`: diálogo que aparece la primera vez que se copia el `final_prompt` de un hilo no guardado — "Guardar" o "No, descartar". Si se descarta, nunca se escribe en SQLite (no hay guardado oculto en segundo plano).
- `App.tsx` reestructurado: layout de dos columnas (sidebar + contenido), el hilo activo se guarda como lista de mensajes en memoria y se muestra completo y apilado (como un chat), reutilizando `StructuredPromptView` por cada mensaje.
- `#root`/`.app-main` cambian de contenedor único centrado a layout de sidebar + columna principal (`src/index.css`), manteniendo el mismo sistema de tokens visuales existente.

**Verificado con llamadas reales** contra una instancia de depuración aislada (puerto 3098, sin tocar el servidor ni la base de datos del usuario):
1. Conversación creada con un primer mensaje (blog de fotografía con Astro) vía `POST /api/conversations`.
2. Segunda petición relacionada ("añade comentarios") enviando `threadHistory` con el primer mensaje → el `final_prompt` resultante reconoce correctamente que es una ampliación del mismo blog, no un proyecto nuevo — confirma que el contexto real del hilo llega a DeepSeek.
3. Segundo mensaje añadido a la conversación ya guardada vía `POST /api/conversations/:id/messages` → la conversación pasa a tener 2 mensajes correctamente.
4. Renombrar (`PATCH`) y eliminar (`DELETE`, 204) verificados — tras eliminar, la conversación desaparece del listado.

Verificado: `npm run typecheck` y `npm run build` sin errores.

## v0.16.0 — Contador de saldo y consumo de la última consulta

Se pidió mostrar el saldo disponible en DeepSeek y el consumo de la última consulta. Inspección previa confirmó que la clave ya vivía solo en el backend (sin cambios necesarios ahí) y que la respuesta de la API ya incluye `usage` (tokens) sin leerlo.

**Backend:**
- `getBalance()` en `server/deepseek.ts`: llama a `GET https://api.deepseek.com/user/balance` con la clave del backend.
- Nuevo endpoint `GET /api/balance`.
- `generateStructuredPrompt()` y `triageRequest()` ahora devuelven `{data, usage}` en vez de solo los datos — `usage` sale de `completion.usage`, ya presente en cada respuesta de la API, sin llamada adicional.
- `GeneratePromptResponse`/`TriageResponse` llevan un campo `usage` nuevo.

**Frontend:**
- `UsagePanel.tsx`: panel compacto en la cabecera junto al título — saldo actual (USD) y, si hay una consulta reciente, sus tokens totales y el coste estimado.
- `App.tsx`: consulta el saldo al pulsar para generar (antes de `/api/triage`) y de nuevo al recibir el resultado de `/api/generate-prompt` — el coste mostrado es la diferencia real entre ambos saldos, no un cálculo con tabla de precios (ver justificación en [DECISIONS.md](DECISIONS.md)). Estados de carga y error del saldo gestionados sin bloquear el resto de la app si `/api/balance` falla.

**Verificado con llamadas reales** contra una instancia de depuración aislada (puerto 3098): `GET /api/balance` devuelve el saldo real en USD; `POST /api/triage` y `POST /api/generate-prompt` devuelven `usage` con cifras reales de tokens (ej. 727 y 9280 tokens en dos pruebas); el saldo bajó de 2.98 a 2.96 USD entre pruebas de sesiones distintas, confirmando que refleja consumo real. Se detectó y documentó una limitación real (no un bug): el saldo solo tiene 2 decimales de precisión en origen, así que una sola consulta barata puede no mover la cifra — el panel lo muestra como "< 0.01" en vez de "0.00" para no aparentar que fue gratis.

Verificado: `npm run typecheck` y `npm run build` sin errores.

## v0.16.1 — Botón "Nueva consulta" junto al campo de entrada

Pedido por el usuario desde hace varias versiones (ver CHANGELOG histórico). Ya existía la opción de empezar una consulta nueva desde la barra lateral (`Sidebar.tsx`, `startNewConversation()`); esta versión añade el mismo botón junto al campo de texto (`RequestInput.tsx`, prop `onNewRequest`/`showNewRequest`), visible solo cuando hay una conversación en curso o texto ya escrito — reutiliza la misma función, sin lógica nueva.

Verificado: `npm run typecheck`, `npm test` (22/22) y `npm run build` sin errores.

## v0.16.2 — final_prompt refuerza documentación persistente y verificación de credenciales

Dos ajustes menores al `SYSTEM_PROMPT` (`server/deepseek.ts`), detectados revisando el caso "bot de trading" en versiones anteriores:

1. Nueva instrucción en la regla 6 (`final_prompt`): si `claude_code.documentation_to_create` no está vacío, `final_prompt` debe mencionar con la misma fuerza que la sección aparte la instrucción de crear y mantener esa documentación.
2. Nueva instrucción en la regla 7: si `is_software_request` es true y el proyecto usa alguna credencial (API keys, contraseñas, secretos de terceros), `verification_criteria` debe incluir un criterio explícito de comprobar que no se han subido credenciales al repositorio ni al historial de git. No se añade si el proyecto no maneja ninguna credencial real.

Cambio solo de texto del prompt — no toca `server/schema.ts` ni el modelo de datos, así que no requiere tests nuevos.

**Verificado con llamada real** (bot de trading conectado a la API de Binance) contra una instancia de depuración aislada (puerto 3098): `verification_criteria` incluyó dos criterios explícitos de credenciales (código fuente/historial de git, y variables de entorno sin logs); `final_prompt` mencionó expresamente crear `.env.example` y el registro de decisiones técnicas, y reforzó "no incluyas credenciales reales... verifica que .gitignore excluya .env".

Verificado: `npm run typecheck`, `npm test` (22/22) y `npm run build` sin errores.

## Pendiente / no hecho todavía

- **La lentitud sigue sin resolverse del todo:** el cuello de botella real no es solo el volumen de tokens de salida, sino el tiempo de razonamiento del modelo. Pendiente de decidir con el usuario: medir `deepseek-v4-pro` (ya configurado en `.env`) frente a `deepseek-flash`; considerar si el streaming de la respuesta merece la pena dado que la respuesta es un único objeto JSON que no se puede parsear hasta estar completo.
- Entrega del entorno de trabajo de Claude Code solo por copiar/pegar archivo a archivo — no genera un .zip descargable ni escribe directamente al disco. Aceptado conscientemente; podría mejorarse más adelante si aporta valor suficiente.
- Observación menor de la revisión v0.13.0 (no confirmada como patrón, solo un caso): en una prueba real, varias decisiones no relacionadas con investigar el proyecto salieron todas como `decided_by: "user"`. Vigilar en próximas pruebas antes de decidir si hace falta ajustar la regla 2b.
- Mejorar la actualización de las recomendaciones de IA para que no dependa de tener un agente con búsqueda web — limitación conocida y aceptada de v0.5.0, ver arriba.
- Tests automatizados limitados: solo cubren la validación de coherencia de `server/schema.ts` (`npm test`, 22 tests). El resto del proyecto (frontend, integración con DeepSeek) sigue verificándose solo a mano.
- Sin gestión de rate-limiting ni de peticiones concurrentes en el backend.

## Decisión pendiente abierta

Validar con uso real y continuado si este concepto aporta suficiente valor respecto a escribir el prompt directamente. Las pruebas realizadas son prometedoras (detecta vacíos reales, no inventa datos, refuerza restricciones de seguridad de forma consistente), pero conviene seguir probando con más casos de uso del usuario.

## Cómo continuar en una sesión futura

1. Lee este archivo y [DECISIONS.md](DECISIONS.md).
2. Confirma que `.env` tiene una clave válida (`npm run dev` y prueba una petición).
3. Revisa la lista "Pendiente" antes de añadir funcionalidad nueva.
