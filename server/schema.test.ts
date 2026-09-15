import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStructuredPrompt, SchemaValidationError } from "./schema.js";

const VALID_TOOL_IDS = new Set(["claude_code", "claude_ai"]);

function baseValidPrompt(overrides: Record<string, unknown> = {}) {
  return {
    is_software_request: true,
    content_category: "codigo_software",
    role: null,
    objective: "Construir un módulo de ejemplo.",
    context: null,
    confirmed_requirements: ["Debe funcionar en el servidor."],
    constraints: [],
    necessary_decisions: [],
    important_pending_decisions: [],
    deferrable_decisions: [],
    recommendations: [],
    ai_tool_recommendation: null,
    verification_criteria: ["Compila sin errores."],
    expected_result: "Un módulo funcional.",
    final_prompt: "Construye el módulo siguiendo las instrucciones.",
    claude_code: {
      what_to_build: "El módulo descrito.",
      how_to_analyze_project: "Revisa la estructura antes de empezar.",
      decision_references: [],
      documentation_to_create: [],
      persistent_instructions: [],
      how_to_verify: "Ejecuta las pruebas.",
      how_to_update_documentation: "Actualiza el README.",
    },
    claude_code_workspace: null,
    ...overrides,
  };
}

test("acepta una respuesta válida sin decisiones", () => {
  const result = validateStructuredPrompt(baseValidPrompt(), VALID_TOOL_IDS);
  assert.equal(result.objective, "Construir un módulo de ejemplo.");
});

test("rechaza cuando el mismo topic aparece en necessary_decisions y en recommendations", () => {
  const input = baseValidPrompt({
    necessary_decisions: [{ question: "Zona del evento", why_necessary: "Bloquea la colocación." }],
    recommendations: [{ topic: "Zona del evento", recommendation: "Usar Azshara.", reason: "Poco transitada." }],
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});

test("rechaza cuando el mismo topic aparece en important_pending_decisions y en deferrable_decisions", () => {
  const input = baseValidPrompt({
    important_pending_decisions: [
      {
        topic: "Dificultad del jefe",
        provisional_approach: "Dificultad media.",
        why_important: "Afecta el equilibrio.",
        what_could_change: "Podría subir a difícil.",
      },
    ],
    deferrable_decisions: [{ topic: "Dificultad del jefe", note: "Se puede ajustar después." }],
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});

test("acepta el mismo topic solo cuando aparece en una única categoría", () => {
  const input = baseValidPrompt({
    important_pending_decisions: [
      {
        topic: "Zona del evento",
        provisional_approach: "Se asume Azshara.",
        why_important: "Afecta la decoración.",
        what_could_change: "Cambiarían las coordenadas.",
      },
    ],
    claude_code: {
      ...baseValidPrompt().claude_code,
      decision_references: ["Zona del evento"],
    },
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.important_pending_decisions[0]?.topic, "Zona del evento");
});

test("rechaza cuando claude_code.decision_references apunta a un topic inexistente", () => {
  const input = baseValidPrompt({
    claude_code: {
      ...baseValidPrompt().claude_code,
      decision_references: ["Un tema que no existe en ninguna categoría"],
    },
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});

test("rechaza claude_code_workspace presente cuando la herramienta principal no es claude_code", () => {
  const input = baseValidPrompt({
    ai_tool_recommendation: {
      task_breakdown: [],
      primary: { tool_id: "claude_ai", purpose: "Redactar.", reason: "Es un chat, no un agente." },
      complementary: [],
      alternatives: [],
    },
    claude_code_workspace: {
      offer_message: "¿Preparamos el entorno?",
      suggested_folder_name: "proyecto",
      claude_md_content: "# Proyecto",
      todo_md_content: "# TODO",
    },
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});
