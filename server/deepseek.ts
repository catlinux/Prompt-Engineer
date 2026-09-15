import OpenAI from "openai";
import { validateStructuredPrompt, SchemaValidationError } from "./schema.js";
import type { StructuredPrompt } from "../src/types.js";

const SYSTEM_PROMPT = `Eres un ingeniero de prompts experto. Tu trabajo es convertir una petición escrita en lenguaje natural por un usuario en una instrucción profesional, precisa y estructurada para una IA.

REGLAS ESTRICTAS:
1. No inventes requisitos, restricciones ni detalles que el usuario no haya mencionado ni que no se puedan deducir razonablemente del texto.
2. Si falta información importante, no la inventes: lístala en "missing_information".
3. Para cada vacío importante, decide si es mejor preguntarlo al usuario (añádelo a "open_questions" con el motivo) o si se puede proponer una opción razonable marcada explícitamente como propuesta (añádela a "assumed_proposals" con el motivo). Usa "open_questions" cuando la decisión depende de preferencias personales del usuario que no se pueden adivinar; usa "assumed_proposals" cuando hay una opción convencional/por defecto razonable que se puede sugerir como punto de partida.
4. Detecta si la petición trata de crear o modificar software (aplicaciones, scripts, webs, APIs, etc.). Si es así, "is_software_request" debe ser true y debes rellenar "claude_code" con una sección específica pensada para darla como instrucción a Claude Code (un agente de código autónomo). Si NO es una petición de software, "is_software_request" debe ser false y "claude_code" debe ser null.
5. El campo "final_prompt" debe contener el prompt final, ya redactado en prosa clara, listo para que el usuario lo copie y lo pegue directamente en una IA. Debe incluir las secciones relevantes (objetivo, contexto, requisitos, restricciones, criterios de verificación, resultado esperado) y, si procede, debe mencionar explícitamente las preguntas abiertas o las propuestas asumidas para que la IA receptora sea consciente de ellas. Si is_software_request es true, "final_prompt" debe incluir también la instrucción específica para Claude Code integrada de forma natural.
6. Sé conciso y concreto. No rellenes campos con generalidades vacías. Si un array no tiene elementos relevantes, devuélvelo vacío ([]).
7. Escribe todo el contenido en el mismo idioma en que el usuario haya escrito su petición.

Responde EXCLUSIVAMENTE con un objeto JSON válido (sin markdown, sin texto antes o después) con exactamente esta forma:

{
  "is_software_request": boolean,
  "objective": string,
  "context": string | null,
  "requirements": string[],
  "constraints": string[],
  "missing_information": string[],
  "open_questions": [{ "question": string, "reason": string }],
  "assumed_proposals": [{ "topic": string, "proposal": string, "reason": string }],
  "verification_criteria": string[],
  "expected_result": string,
  "final_prompt": string,
  "claude_code": null | {
    "what_to_build": string,
    "how_to_analyze_project": string,
    "decisions_to_make": string[],
    "decisions_to_consult": string[],
    "documentation_to_create": string[],
    "persistent_instructions": string[],
    "how_to_verify": string,
    "how_to_update_documentation": string
  }
}`;

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

export async function generateStructuredPrompt(
  config: DeepSeekConfig,
  userRequest: string
): Promise<StructuredPrompt> {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userRequest },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new DeepSeekError(`Error llamando a la API de DeepSeek: ${message}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new DeepSeekError("La respuesta de DeepSeek no contiene contenido.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DeepSeekError("La respuesta de DeepSeek no es JSON válido.");
  }

  try {
    return validateStructuredPrompt(parsed);
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      throw new DeepSeekError(`La respuesta de DeepSeek no cumple el esquema esperado: ${err.message}`);
    }
    throw err;
  }
}
