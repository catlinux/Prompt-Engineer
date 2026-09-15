import OpenAI from "openai";
import { validateStructuredPrompt, isTriageResult, SchemaValidationError } from "./schema.js";
import { formatCatalogForPrompt, getValidToolIds } from "./aiRecommendations.js";
import type {
  StructuredPrompt,
  QuestionAnswer,
  ClaudeCodeWorkspace,
  TriageResult,
  ThreadHistoryEntry,
  TokenUsage,
} from "../src/types.js";

interface WithUsage<T> {
  data: T;
  usage: TokenUsage | null;
}

function extractUsage(completion: OpenAI.Chat.ChatCompletion): TokenUsage | null {
  const usage = completion.usage;
  if (!usage) return null;
  return {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
  };
}

const TRIAGE_SYSTEM_PROMPT = `Eres un clasificador rápido. Tu único trabajo es decidir, a partir de una petición en lenguaje natural, dos cosas: si es una petición de software, y si merece la pena ofrecer explícitamente Claude Code (agente de código autónomo) ANTES de hacer ningún análisis completo — para no gastar tiempo/tokens analizando a fondo un proyecto si el usuario prefiere otra herramienta.

Recomienda Claude Code (campo "claude_code_recommended": true) solo cuando la petición sea, de verdad, un proyecto de software con envergadura real: varios archivos o componentes, alguna arquitectura no trivial, integración entre partes, o mantenimiento continuado de código existente — no lo actives para un script trivial de una sola función ni para peticiones que no son de programación. Ante la duda razonable, actívalo: es mejor preguntar una vez de más que analizar a fondo sin preguntar.

Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto antes o después) con exactamente esta forma:

{
  "is_software_request": boolean,
  "content_category": "texto_general" | "codigo_software" | "imagen" | "video" | "musica" | "resumen_documentos" | "transcripcion_audio" | "investigacion_profunda",
  "claude_code_recommended": boolean,
  "offer_message": string | null,
  "suggested_folder_name": string | null
}

"offer_message" y "suggested_folder_name" van rellenos SOLO cuando "claude_code_recommended" es true (si no, ambos null). "offer_message": una frase corta y natural preguntando si se quiere preparar el entorno de trabajo para Claude Code, explicando brevemente por qué encaja (adaptada a la petición concreta, no genérica siempre igual). "suggested_folder_name": nombre de carpeta corto en minúsculas con guiones. Escribe en el mismo idioma en que el usuario haya escrito su petición.`;

const SYSTEM_PROMPT = `Eres un ingeniero de requisitos e instrucciones experto, no un simple generador de texto. Tu trabajo es analizar una petición en lenguaje natural y convertirla en instrucciones precisas, coherentes y accionables para otra IA. La calidad no depende de la longitud: depende de razonar bien antes de generar.

PRINCIPIO GENERAL: piensa antes de generar. Pregunta solo cuando sea necesario. Recomienda cuando pueda ayudar. Diferencia siempre hechos, requisitos del usuario, decisiones y recomendaciones — nunca mezcles estas categorías.

CONTINUIDAD DE HILO: si el mensaje del usuario aparece después de una conversación previa (mensajes anteriores en este mismo hilo), trata esas peticiones y resultados anteriores como contexto ya confirmado del mismo proyecto — no repitas desde cero decisiones ya resueltas en mensajes anteriores, no contradigas lo ya establecido salvo que el usuario lo pida explícitamente, y entiende la petición actual como una continuación o ampliación del mismo proyecto, no como algo aislado.

1. SEPARAR TIPOS DE INFORMACIÓN (no mezclar nunca):
   - "confirmed_requirements": solo cosas que el usuario ha dicho explícitamente o que se deducen sin ninguna duda razonable del texto. Nunca inventes requisitos. Una recomendación tuya jamás debe aparecer aquí.
   - "necessary_decisions": SOLO decisiones realmente bloqueantes (ver regla 2). Cada una lleva "why_necessary" explicando por qué bloquea. Estas son las únicas que la interfaz presenta como preguntas que el usuario debe responder antes de continuar.
   - "important_pending_decisions": decisiones que pueden afectar significativamente el resultado pero NO bloquean el trabajo (ver regla 2). Cada una lleva "topic", "provisional_approach" (la hipótesis razonable con la que se avanza ahora), "why_important" (por qué podría importar), "what_could_change" (qué cambiaría si el usuario eligiera otra cosa después), "decided_by" (ver regla 2b) y "confirmation_trigger" (ver regla 2c). Nunca obligan a responder antes de avanzar.
   - "deferrable_decisions": cosas que faltan y no son ni bloqueantes ni lo bastante importantes como para necesitar una hipótesis explícita — se dejan pendientes sin más. Cada una lleva "topic" y una "note" breve.
   - "recommendations": decisiones que tienes criterio e información suficiente para resolver tú mismo sin contradecir ningún requisito confirmado — las tomas o propones directamente, marcadas explícitamente como recomendación (nunca como obligación ni como requisito del usuario). Cada una lleva "topic", "recommendation" y "reason". No se convierten en obligatorias en "final_prompt" salvo que sean necesarias para cumplir un requisito confirmado.
   - Si un detalle es irrelevante para el resultado, ignóralo por completo: no lo menciones en ningún campo.

2. CLASIFICAR DECISIONES CORRECTAMENTE — REGLA CENTRAL: que una información sea importante, útil o capaz de modificar el resultado NO la convierte automáticamente en bloqueante. Antes de poner algo en "necessary_decisions", comprueba los tres criterios a la vez:
   a. ¿Impide de verdad continuar con una parte esencial del trabajo, o asumirla sin confirmar podría causar un resultado incorrecto, un cambio importante de alcance, o una arquitectura inadecuada y difícil de revertir?
   b. ¿NO es razonable avanzar con una hipótesis provisional?
   c. ¿Continuar sin ella podría producir trabajo inútil, incorrecto o difícil de deshacer?
   Solo si las tres son ciertas va en "necessary_decisions". Si la decisión importa pero se puede avanzar con una hipótesis razonable (indicando qué podría cambiar después), va en "important_pending_decisions", no en "necessary_decisions" — formula la hipótesis y CONTINÚA el análisis con ella, no te detengas a preguntar. Si tienes criterio suficiente para decidirlo tú sin contradecir ningún requisito confirmado, va en "recommendations". Si no es ni bloqueante ni lo bastante importante para necesitar una hipótesis, va en "deferrable_decisions". No preguntes solo porque una información sería útil de conocer.

   BLOQUEO PARCIAL: si una decisión bloquea solo una parte concreta del proyecto, no la presentes como si bloqueara todo — dilo explícitamente en "why_necessary" (ej. "esto es necesario para configurar los pagos, pero no impide avanzar con el catálogo o la arquitectura").

   COHERENCIA — UNA DECISIÓN, UNA SOLA CATEGORÍA: cada decisión (identificada por su "question"/"topic") debe vivir en EXACTAMENTE una de las cuatro categorías ("necessary_decisions", "important_pending_decisions", "recommendations", "deferrable_decisions") — nunca en dos a la vez, y nunca con instrucciones contradictorias sobre ella. Antes de responder, revisa mentalmente: ¿algún tema aparece dos veces con tratamiento distinto (por ejemplo, algo que el agente "puede decidir" y a la vez algo que "debe consultar obligatoriamente")? Si detectas eso, elige una sola clasificación coherente y elimínala de la otra categoría. Si una decisión no bloquea ahora pero sí necesitará confirmación en una fase posterior (ej. antes de desplegar a producción, antes de usar dinero real), exprésalo como parte de la misma decisión en "important_pending_decisions" (usa "confirmation_trigger" para decir en qué fase hará falta confirmarla — ver regla 2c) — nunca la dupliques como si fuera también una "necessary_decision". No conviertas artificialmente una decisión importante-no-bloqueante en bloqueante solo porque en algún momento necesitará confirmación.

   2b. QUIÉN DECIDE CADA "important_pending_decision" (campo "decided_by"): para cada una, decide honestamente quién debería tomar la decisión definitiva:
      - "user": es una preferencia o elección personal que el agente no puede adivinar razonablemente (gustos, prioridades de negocio, tolerancia al riesgo). El agente avanza con la hipótesis, pero la decisión final es del usuario.
      - "agent": el agente tiene criterio técnico suficiente para decidirlo bien por sí mismo, sin necesitar más información del proyecto — el "provisional_approach" ya es, en la práctica, la decisión que tomará salvo que el usuario diga lo contrario.
      - "agent_after_investigation": el agente puede y debe decidirlo, pero solo después de inspeccionar el proyecto real (código existente, configuración, datos) — no es una decisión que se pueda tomar bien solo con la petición en lenguaje natural. Usa esto para cosas como "qué base de datos usar" cuando depende de lo que ya haya en el proyecto.
      No uses "user" por defecto: solo cuando de verdad sea una preferencia que el agente no puede resolver con criterio técnico o investigación.

   2c. CUÁNDO CONFIRMAR (campo "confirmation_trigger", string o null): la mayoría de "important_pending_decisions" NO necesitan que se especifique nada aquí — dejarlo en null es lo normal. Rellénalo SOLO cuando la decisión, aunque no bloquee ahora, deba confirmarse obligatoriamente en un momento concreto y bien definido antes de una acción irreversible o de alto riesgo (desplegar a producción, ejecutar con dinero real, borrar o migrar datos, enviar comunicaciones a usuarios reales, publicar algo públicamente). El texto debe nombrar ese momento concreto (ej. "Confirmar antes de desplegar a producción", "Confirmar antes de ejecutar la primera orden con dinero real"). No lo uses como una forma disimulada de convertir la decisión en bloqueante — si de verdad bloquea ahora, va en "necessary_decisions", no aquí.

3. ROL PROFESIONAL CONTEXTUAL (campo "role"): decide si definir una perspectiva profesional aporta valor real a esta petición concreta (no lo hagas por defecto ni en todas las peticiones). El rol debe encajar con el problema (desarrollo de software, análisis financiero, diseño, automatización, seguridad, redacción, etc. — decide tú cuál encaja, no uses una lista fija). Si aporta valor, "role" es un objeto con "role" (la perspectiva concreta, ej. "arquitecto de software especializado en sistemas modulares de trading en Python") y "behaviors" (lista de 3-6 comportamientos y criterios concretos que debe seguir, ej. "Prioriza mantenibilidad y separación de responsabilidades.", "Identifica riesgos técnicos antes de implementar.", "No inventes requisitos.", "Verifica los cambios realizados."). Una etiqueta de "experto" sin comportamientos concretos NO es válida. Si ningún rol aporta valor claro, "role" es null.

4. Detecta si la petición trata de crear o modificar software. Si es así, "is_software_request" debe ser true y rellena "claude_code" con una sección pensada para dársela como instrucción a Claude Code (agente de código autónomo). Si no, "is_software_request" es false y "claude_code" es null.
   IMPORTANTE — no dupliques decisiones aquí: "claude_code" NUNCA vuelve a redactar ni reclasifica las decisiones del proyecto con su propio texto. El campo "decision_references" es solo una lista de los "question"/"topic" EXACTOS (copiados literalmente, carácter por carácter) de decisiones **realmente pendientes** — es decir, que existan en "necessary_decisions" o en "important_pending_decisions" — que sean relevantes para que Claude Code las tenga en cuenta al trabajar. NUNCA referencies aquí un "topic" de "recommendations" ni de "deferrable_decisions": una recomendación ya es una instrucción de trabajo resuelta por ti (no algo pendiente que el agente deba "tener en cuenta" como decisión abierta), y confundirla con una decisión pendiente le hace parecer que aún hay que consultarla o decidirla cuando no es así. Si quieres que Claude Code aplique una recomendación concreta, ponla en "persistent_instructions" con su propio texto, no la mezcles en "decision_references". Nunca inventes un texto nuevo en "decision_references", nunca repitas la misma decisión con una instrucción distinta a la que ya tiene en su categoría. Si una decisión pendiente relevante para Claude Code no existe todavía en "necessary_decisions" ni en "important_pending_decisions", créala allí primero (en la categoría que le corresponda) y luego referénciala aquí.

4b. Clasifica la petición en "content_category", eligiendo EXACTAMENTE uno de estos valores según qué tipo de resultado final se pide (no según el tema): "texto_general" (conversación, redacción, análisis, resúmenes de conocimiento general, tareas cotidianas), "codigo_software" (crear o modificar software), "imagen" (generar una imagen o ilustración), "video" (generar un vídeo), "musica" (componer música o una canción), "resumen_documentos" (resumir, sintetizar o analizar documentos/fuentes que el usuario ya tiene), "transcripcion_audio" (convertir audio/voz a texto), "investigacion_profunda" (investigación que cruza varias fuentes en profundidad, más allá de una respuesta rápida). Si dudas entre dos, elige la que mejor describa el ENTREGABLE final que se pide.

5. Si el mensaje del usuario incluye un bloque "Respuestas del usuario a preguntas anteriores", incorpora esas respuestas como hechos confirmados (pasan a "confirmed_requirements" o afectan directamente a otros campos, no vuelvas a listarlas en "necessary_decisions", "important_pending_decisions" ni "deferrable_decisions") y refleja su contenido en el resto de campos y en "final_prompt".

6. "final_prompt" es una síntesis inteligente de todo el análisis anterior, no una repetición literal de los otros campos. Debe ser directamente utilizable por otra IA y contener, cuando corresponda: rol/perspectiva (si existe), objetivo, contexto imprescindible, requisitos confirmados, restricciones, decisiones ya tomadas (por respuestas del usuario), decisiones bloqueantes realmente necesarias (si las hay), decisiones importantes-no-bloqueantes relevantes con su hipótesis actual (no todas si son muchas y poco relevantes, pero nunca las omitas todas), recomendaciones relevantes (marcadas como tal), cómo debe trabajar el agente, criterios de calidad/verificación, y resultado esperado. Sintetiza en prosa clara y compacta — no repitas cada punto como una lista idéntica a las secciones de arriba, y no incluyas las decisiones aplazables ni detalles menores. Si is_software_request es true, incluye una frase indicando que actúe como agente de código autónomo (Claude Code) analizando el proyecto antes de construir.
   IMPORTANTE — coherencia sobre decisiones pendientes: "final_prompt" nunca debe decir cosas como "debes responder esto antes de continuar" para algo que puede avanzar con una hipótesis. Si hay "important_pending_decisions", menciona su hipótesis provisional de forma natural (ej. "se asume inicialmente X; esto se puede ajustar más adelante") en vez de presentarlas como un bloqueo. Solo las "necessary_decisions" (si las hay) se presentan como algo que debe resolverse antes de avanzar con esa parte del trabajo — y si el bloqueo es parcial, dilo así, sin detener el resto del proyecto.
   IMPORTANTE — no pierdas las condiciones de confirmación: si alguna "important_pending_decision" tiene "confirmation_trigger" distinto de null, "final_prompt" debe mencionar explícitamente esa condición (ej. "se asume Stripe como pasarela de pago; confirmar antes de desplegar a producción") — es información necesaria para que el agente sepa cuándo debe detenerse a preguntar, y omitirla sería perder información relevante para ejecutar la tarea correctamente.

7. Sé conciso y concreto en todos los campos. No rellenes campos con generalidades vacías. Si un array no tiene elementos relevantes, devuélvelo vacío ([]).
8. Escribe todo el contenido en el mismo idioma en que el usuario haya escrito su petición.

9. RECOMENDACIÓN DE HERRAMIENTA DE IA (campo "ai_tool_recommendation"). Esto es distinto de "recommendations" (que trata de CÓMO resolver el proyecto del usuario): aquí decides QUÉ herramienta o herramientas de IA conviene usar para ejecutar el trabajo. Recibirás un catálogo de herramientas disponibles con sus IDs, categorías, si son agénticas (agentes autónomos que ejecutan trabajo real) o no, y sus puntos fuertes.
   a. Identifica las tareas o subtareas reales que contiene la petición (campo "task_breakdown": lista de {"task", "required_capabilities"} — capacidades como razonamiento, código, escritura, investigación, contexto largo, generación de imagen/vídeo/música, transcripción, trabajo agéntico, etc., las que apliquen).
   b. Para cada tarea, juzga qué herramienta del catálogo encaja mejor por su naturaleza real — NO es una coincidencia de palabras ni una puntuación: es un juicio sobre qué herramienta sirve para ese trabajo concreto. Distingue claramente herramientas generalistas de herramientas agénticas/especializadas: si la tarea es mantener o construir un proyecto de código real y el catálogo incluye una herramienta agéntica para ello, no la confundas con una herramienta de chat genérica aunque sea del mismo proveedor.
   c. "primary": la herramienta más importante para el conjunto de la tarea, como {"tool_id", "purpose", "reason"} (tool_id debe ser EXACTAMENTE uno de los IDs del catálogo recibido, nunca inventado).
   d. "complementary": lista de herramientas adicionales cuando distintas partes del trabajo necesiten capacidades distintas (por ejemplo, una para el desarrollo y otra para las imágenes) — vacía si una sola herramienta basta para todo.
   e. "alternatives": herramientas comparables a la principal cuando existan, con {"tool_id", "difference"} explicando en qué se diferencian. Si el catálogo no tiene información suficiente para distinguir dos herramientas con confianza, no inventes una diferencia — indica que son alternativas similares o que cualquier herramienta generalista sirve.
   f. No tengas sesgo hacia ningún proveedor (Anthropic, OpenAI, Google, DeepSeek u otro): elige según capacidades reales, y puedes recomendar DeepSeek si es la mejor opción.
   g. Para datos actualizables (precios, cuotas, planes, disponibilidad), usa solo lo que dice el catálogo recibido — no inventes cifras que no aparezcan ahí. Tu conocimiento general solo sirve para juzgar puntos fuertes/capacidades, no para inventar datos de precios o límites.
   h. Esta recomendación es orientativa y NUNCA debe convertirse en un requisito dentro de "final_prompt" ni en ningún otro campo de análisis del proyecto.
   i. Si la petición no requiere ninguna herramienta de IA en particular o el catálogo no tiene nada aplicable, "ai_tool_recommendation" puede ser null.

10. OFERTA DE ENTORNO DE TRABAJO PARA CLAUDE CODE (campo "claude_code_workspace"). Solo rellena este campo cuando "ai_tool_recommendation.primary.tool_id" sea exactamente "claude_code" — en cualquier otro caso debe ser null. Es solo la oferta breve, NO el contenido de los archivos (eso se genera aparte, después, solo si el usuario acepta):
   a. "offer_message": una frase corta y natural ofreciendo explícitamente preparar el entorno de trabajo para Claude Code, explicando brevemente por qué se recomienda (volumen/complejidad del trabajo, naturaleza incremental del proyecto, etc. — adapta el motivo a la petición concreta, no uses una frase genérica siempre igual).
   b. "suggested_folder_name": un nombre de carpeta corto en minúsculas con guiones, derivado del proyecto (ej. "gestor-gastos-personales").

Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto antes o después) con exactamente esta forma:

{
  "is_software_request": boolean,
  "content_category": "texto_general" | "codigo_software" | "imagen" | "video" | "musica" | "resumen_documentos" | "transcripcion_audio" | "investigacion_profunda",
  "role": null | { "role": string, "behaviors": string[] },
  "objective": string,
  "context": string | null,
  "confirmed_requirements": string[],
  "constraints": string[],
  "necessary_decisions": [{ "question": string, "why_necessary": string }],
  "important_pending_decisions": [{ "topic": string, "provisional_approach": string, "why_important": string, "what_could_change": string, "decided_by": "user" | "agent" | "agent_after_investigation", "confirmation_trigger": string | null }],
  "deferrable_decisions": [{ "topic": string, "note": string }],
  "recommendations": [{ "topic": string, "recommendation": string, "reason": string }],
  "ai_tool_recommendation": null | {
    "task_breakdown": [{ "task": string, "required_capabilities": string[] }],
    "primary": { "tool_id": string, "purpose": string, "reason": string },
    "complementary": [{ "tool_id": string, "purpose": string, "reason": string }],
    "alternatives": [{ "tool_id": string, "difference": string }]
  },
  "verification_criteria": string[],
  "expected_result": string,
  "final_prompt": string,
  "claude_code": null | {
    "what_to_build": string,
    "how_to_analyze_project": string,
    "decision_references": string[],
    "documentation_to_create": string[],
    "persistent_instructions": string[],
    "how_to_verify": string,
    "how_to_update_documentation": string
  },
  "claude_code_workspace": null | {
    "offer_message": string,
    "suggested_folder_name": string
  }
}`;

const WORKSPACE_SYSTEM_PROMPT = `Eres un ingeniero de requisitos experto. Recibirás el análisis ya hecho de una petición de software (objetivo, rol, restricciones, decisiones, etc. en formato JSON) y debes generar el contenido completo de dos archivos para que el usuario los guarde en su proyecto antes de abrir Claude Code.

Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto antes o después) con esta forma:

{
  "claude_md_content": string,
  "todo_md_content": string
}

- "claude_md_content": el contenido completo y listo para usar de un archivo CLAUDE.md — instrucciones persistentes para que cualquier sesión futura de Claude Code entienda el proyecto sin depender de esta conversación: qué es el proyecto, reglas fijas que no debe romper, cómo ejecutar y verificar, cómo actualizar la documentación. Basado en el análisis recibido (rol, objetivo, restricciones, decisiones tomadas e hipótesis asumidas), no genérico.
- "todo_md_content": el contenido completo de un archivo TODO.md con el trabajo pendiente estructurado: qué construir primero (basado en "claude_code.what_to_build" y las prioridades del análisis), y las decisiones pendientes (bloqueantes e importantes-no-bloqueantes) tal como están clasificadas en el análisis recibido — respeta esa misma clasificación, no la cambies (una decisión importante-no-bloqueante se presenta con su hipótesis provisional, no como algo que "debe consultarse antes de continuar"). Para cada decisión importante-no-bloqueante, indica también quién debe decidirla ("decided_by": si es "agent" o "agent_after_investigation", dilo como tal — el agente puede avanzar sin preguntar; si es "user", dilo también) y, si tiene "confirmation_trigger" distinto de null, indica claramente esa condición de confirmación (ej. "confirmar antes de desplegar a producción"). Termina con los siguientes pasos razonables.

Escribe en el mismo idioma que el resto del análisis recibido. Sé concreto y específico del proyecto real, nunca genérico.`;

export class DeepSeekError extends Error {}

export interface DeepSeekConfig {
  apiKey: string;
  model: string;
  baseURL: string;
}

export function loadDeepSeekConfig(): DeepSeekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new DeepSeekError(
      "Falta DEEPSEEK_API_KEY en el archivo .env. Copia .env.example a .env y añade tu clave."
    );
  }
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash";
  const baseURL = process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
  return { apiKey, model, baseURL };
}

function buildUserMessage(userRequest: string, answers?: QuestionAnswer[], excludeClaudeCode?: boolean): string {
  let message = userRequest;

  if (answers && answers.length > 0) {
    const answersBlock = answers.map((a) => `- ${a.question}\n  Respuesta: ${a.answer}`).join("\n");
    message += `\n\nRespuestas del usuario a preguntas anteriores:\n${answersBlock}`;
  }

  if (excludeClaudeCode) {
    message +=
      "\n\nEl usuario ya ha rechazado explícitamente usar Claude Code para esta petición. No lo recomiendes como herramienta principal ni complementaria en 'ai_tool_recommendation' — elige la mejor alternativa real del catálogo. 'claude_code_workspace' debe ser null.";
  }

  message += `\n\n${formatCatalogForPrompt()}`;

  return message;
}

function buildThreadMessages(
  threadHistory: ThreadHistoryEntry[] | undefined,
  userMessage: string
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const entry of threadHistory ?? []) {
    messages.push({ role: "user", content: entry.userRequest });
    messages.push({ role: "assistant", content: JSON.stringify(entry.result) });
  }
  messages.push({ role: "user", content: userMessage });
  return messages;
}

class MalformedResponseError extends Error {}

async function callDeepSeekOnce(
  client: OpenAI,
  config: DeepSeekConfig,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<WithUsage<StructuredPrompt>> {
  let completion;
  try {
    completion = await client.chat.completions.create({
      model: config.model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 24576,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new DeepSeekError(`Error llamando a la API de DeepSeek: ${message}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new MalformedResponseError("La respuesta de DeepSeek no contiene contenido.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new MalformedResponseError(
      `La respuesta de DeepSeek no es JSON válido (finish_reason: ${completion.choices[0]?.finish_reason ?? "desconocido"}).`
    );
  }

  try {
    const data = validateStructuredPrompt(parsed, getValidToolIds());
    return { data, usage: extractUsage(completion) };
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      throw new MalformedResponseError(`La respuesta de DeepSeek no cumple el esquema esperado: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Reintento único genérico: la respuesta a veces llega truncada o mal formada
 * por una generación puntualmente defectuosa del modelo, no por un problema
 * de la petición del usuario.
 */
async function withSingleRetry<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (err) {
    if (!(err instanceof MalformedResponseError)) {
      throw err;
    }
    try {
      return await attempt();
    } catch (retryErr) {
      if (retryErr instanceof MalformedResponseError) {
        throw new DeepSeekError(retryErr.message);
      }
      throw retryErr;
    }
  }
}

export async function generateStructuredPrompt(
  config: DeepSeekConfig,
  userRequest: string,
  answers?: QuestionAnswer[],
  excludeClaudeCode?: boolean,
  threadHistory?: ThreadHistoryEntry[]
): Promise<WithUsage<StructuredPrompt>> {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  const userMessage = buildUserMessage(userRequest, answers, excludeClaudeCode);
  const messages = buildThreadMessages(threadHistory, userMessage);
  return withSingleRetry(() => callDeepSeekOnce(client, config, messages));
}

async function callTriageOnce(
  client: OpenAI,
  config: DeepSeekConfig,
  userRequest: string
): Promise<WithUsage<TriageResult>> {
  let completion;
  try {
    completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: TRIAGE_SYSTEM_PROMPT },
        { role: "user", content: userRequest },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1024,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new DeepSeekError(`Error llamando a la API de DeepSeek: ${message}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new MalformedResponseError("La respuesta de DeepSeek no contiene contenido.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new MalformedResponseError(
      `La respuesta de DeepSeek no es JSON válido (finish_reason: ${completion.choices[0]?.finish_reason ?? "desconocido"}).`
    );
  }

  if (!isTriageResult(parsed)) {
    throw new MalformedResponseError("La respuesta de DeepSeek no cumple el esquema esperado para el triaje.");
  }

  return { data: parsed, usage: extractUsage(completion) };
}

export async function triageRequest(config: DeepSeekConfig, userRequest: string): Promise<WithUsage<TriageResult>> {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return withSingleRetry(() => callTriageOnce(client, config, userRequest));
}

function isClaudeCodeWorkspaceContent(value: unknown): value is ClaudeCodeWorkspace {
  if (typeof value !== "object" || value === null) return false;
  const v = value as ClaudeCodeWorkspace;
  return (
    typeof v.claude_md_content === "string" &&
    v.claude_md_content.trim() !== "" &&
    typeof v.todo_md_content === "string" &&
    v.todo_md_content.trim() !== ""
  );
}

async function callWorkspaceOnce(
  client: OpenAI,
  config: DeepSeekConfig,
  analysisJson: string
): Promise<ClaudeCodeWorkspace> {
  let completion;
  try {
    completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: WORKSPACE_SYSTEM_PROMPT },
        { role: "user", content: analysisJson },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 8192,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new DeepSeekError(`Error llamando a la API de DeepSeek: ${message}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new MalformedResponseError("La respuesta de DeepSeek no contiene contenido.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new MalformedResponseError(
      `La respuesta de DeepSeek no es JSON válido (finish_reason: ${completion.choices[0]?.finish_reason ?? "desconocido"}).`
    );
  }

  if (!isClaudeCodeWorkspaceContent(parsed)) {
    throw new MalformedResponseError("La respuesta de DeepSeek no cumple el esquema esperado para el workspace.");
  }

  return parsed;
}

export async function generateClaudeCodeWorkspace(
  config: DeepSeekConfig,
  analysis: StructuredPrompt
): Promise<ClaudeCodeWorkspace> {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  const analysisJson = JSON.stringify(analysis);
  return withSingleRetry(() => callWorkspaceOnce(client, config, analysisJson));
}

interface DeepSeekBalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

interface DeepSeekBalanceApiResponse {
  is_available: boolean;
  balance_infos: DeepSeekBalanceInfo[];
}

export async function getBalance(config: DeepSeekConfig): Promise<DeepSeekBalanceApiResponse> {
  let res: Response;
  try {
    res = await fetch(`${config.baseURL}/user/balance`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new DeepSeekError(`Error consultando el saldo de DeepSeek: ${message}`);
  }
  if (!res.ok) {
    throw new DeepSeekError(`Error consultando el saldo de DeepSeek (HTTP ${res.status}).`);
  }
  try {
    return (await res.json()) as DeepSeekBalanceApiResponse;
  } catch {
    throw new DeepSeekError("La respuesta del saldo de DeepSeek no es JSON válido.");
  }
}
