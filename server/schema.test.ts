import { test } from "node:test";
import assert from "node:assert/strict";
import { validateStructuredPrompt, isTriageResult, SchemaValidationError } from "./schema.js";

const VALID_TOOL_IDS = new Set(["claude_code", "claude_ai"]);

function importantPendingDecision(overrides: Record<string, unknown> = {}) {
  return {
    topic: "Tema de ejemplo",
    provisional_approach: "Hipótesis provisional de ejemplo.",
    why_important: "Motivo de ejemplo.",
    what_could_change: "Qué cambiaría, de ejemplo.",
    decided_by: "agent",
    confirmation_trigger: null,
    ...overrides,
  };
}

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
      importantPendingDecision({
        topic: "Zona del evento",
        provisional_approach: "Se asume Azshara.",
        why_important: "Afecta la decoración.",
        what_could_change: "Cambiarían las coordenadas.",
      }),
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

test("rechaza cuando claude_code.decision_references apunta a una recommendation (no es una decisión pendiente)", () => {
  const input = baseValidPrompt({
    recommendations: [
      { topic: "Reutilizar módulos existentes", recommendation: "Partir de mod-auction-house-bot.", reason: "Ahorra trabajo." },
    ],
    claude_code: {
      ...baseValidPrompt().claude_code,
      decision_references: ["Reutilizar módulos existentes"],
    },
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});

test("rechaza cuando claude_code.decision_references apunta a una deferrable_decision (no es una decisión pendiente)", () => {
  const input = baseValidPrompt({
    deferrable_decisions: [{ topic: "Idioma de los textos", note: "Se decide más adelante." }],
    claude_code: {
      ...baseValidPrompt().claude_code,
      decision_references: ["Idioma de los textos"],
    },
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});

test("acepta claude_code.decision_references apuntando a una necessary_decision", () => {
  const input = baseValidPrompt({
    necessary_decisions: [
      { question: "¿Código fuente compilable o binario precocinado?", why_necessary: "Determina toda la arquitectura." },
    ],
    claude_code: {
      ...baseValidPrompt().claude_code,
      decision_references: ["¿Código fuente compilable o binario precocinado?"],
    },
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.claude_code?.decision_references[0], "¿Código fuente compilable o binario precocinado?");
});

// --- Casos representativos de las cuatro categorías + confirmación de fase + contradicción "puede decidir" / "debe consultar" ---

test("caso representativo: decisión bloqueante válida", () => {
  const input = baseValidPrompt({
    necessary_decisions: [
      {
        question: "¿El servidor permite recompilar módulos en C++?",
        why_necessary: "Determina si se puede usar C++ o hay que limitarse a Lua/SQL. Bloquea el inicio de la implementación, pero no la fase de investigación y diseño.",
      },
    ],
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.necessary_decisions.length, 1);
});

test("caso representativo: decisión importante no bloqueante válida", () => {
  const input = baseValidPrompt({
    important_pending_decisions: [
      importantPendingDecision({
        topic: "Zona del torneo",
        provisional_approach: "Se asume Azshara por ser poco transitada.",
        why_important: "Afecta la decoración y las coordenadas.",
        what_could_change: "Otra zona implicaría recalcular coordenadas y decoración.",
        decided_by: "agent",
        confirmation_trigger: null,
      }),
    ],
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.important_pending_decisions.length, 1);
  assert.equal(result.important_pending_decisions[0].decided_by, "agent");
});

test("caso representativo: decisión delegable (recommendation) válida", () => {
  const input = baseValidPrompt({
    recommendations: [
      { topic: "Estructura de los mods", recommendation: "Seguir la plantilla oficial mod-*.", reason: "Es el estándar de AzerothCore." },
    ],
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.recommendations.length, 1);
});

test("caso representativo: decisión aplazable válida", () => {
  const input = baseValidPrompt({
    deferrable_decisions: [{ topic: "Idioma de los NPCs", note: "Se puede decidir más adelante." }],
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.deferrable_decisions.length, 1);
});

test("caso representativo: decisión importante que solo necesita confirmación en una fase posterior", () => {
  const input = baseValidPrompt({
    important_pending_decisions: [
      importantPendingDecision({
        topic: "Proveedor de pagos",
        provisional_approach: "Se asume Stripe para poder avanzar con el checkout.",
        why_important: "No bloquea el desarrollo del catálogo ni la arquitectura.",
        what_could_change: "Si cambia, solo afecta la integración de pagos, no el resto del proyecto.",
        decided_by: "user",
        confirmation_trigger: "Confirmar antes de desplegar a producción.",
      }),
    ],
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.important_pending_decisions[0].decided_by, "user");
  assert.match(result.important_pending_decisions[0].confirmation_trigger ?? "", /desplegar a producción/);
});

test("rechaza important_pending_decision con decided_by inválido", () => {
  const input = baseValidPrompt({
    important_pending_decisions: [importantPendingDecision({ decided_by: "nadie" })],
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});

test("acepta important_pending_decision con decided_by 'agent_after_investigation'", () => {
  const input = baseValidPrompt({
    important_pending_decisions: [
      importantPendingDecision({
        topic: "Motor de base de datos",
        decided_by: "agent_after_investigation",
        why_important: "Depende de lo que ya exista en el proyecto real.",
      }),
    ],
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.important_pending_decisions[0].decided_by, "agent_after_investigation");
});

test("contradicción 'puede decidir' vs 'debe consultar': se detecta y se rechaza", () => {
  // Mismo topic tratado a la vez como recomendación (el agente puede decidirlo)
  // y como decisión bloqueante (debe consultarse obligatoriamente) — contradicción real.
  const input = baseValidPrompt({
    recommendations: [
      { topic: "Zona del torneo", recommendation: "Usar Azshara.", reason: "Poco transitada." },
    ],
    necessary_decisions: [
      { question: "Zona del torneo", why_necessary: "Debe confirmarse antes de continuar." },
    ],
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});

test("acepta claude_code_workspace solo con offer_message + suggested_folder_name cuando primary es claude_code", () => {
  const input = baseValidPrompt({
    ai_tool_recommendation: {
      task_breakdown: [],
      primary: { tool_id: "claude_code", purpose: "Construir el proyecto.", reason: "Es un agente autónomo." },
      complementary: [],
      alternatives: [],
    },
    claude_code_workspace: {
      offer_message: "¿Preparamos el entorno?",
      suggested_folder_name: "proyecto",
    },
  });
  const result = validateStructuredPrompt(input, VALID_TOOL_IDS);
  assert.equal(result.claude_code_workspace?.suggested_folder_name, "proyecto");
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
    },
  });
  assert.throws(() => validateStructuredPrompt(input, VALID_TOOL_IDS), SchemaValidationError);
});

// --- Triaje previo (isTriageResult) ---

test("acepta un triaje válido sin Claude Code recomendado", () => {
  const input = {
    is_software_request: false,
    content_category: "texto_general",
    claude_code_recommended: false,
    offer_message: null,
    suggested_folder_name: null,
  };
  assert.equal(isTriageResult(input), true);
});

test("acepta un triaje válido con Claude Code recomendado", () => {
  const input = {
    is_software_request: true,
    content_category: "codigo_software",
    claude_code_recommended: true,
    offer_message: "¿Preparamos Claude Code para este proyecto?",
    suggested_folder_name: "mi-proyecto",
  };
  assert.equal(isTriageResult(input), true);
});

test("rechaza un triaje con claude_code_recommended true pero sin offer_message", () => {
  const input = {
    is_software_request: true,
    content_category: "codigo_software",
    claude_code_recommended: true,
    offer_message: null,
    suggested_folder_name: "mi-proyecto",
  };
  assert.equal(isTriageResult(input), false);
});

test("rechaza un triaje con claude_code_recommended false pero con offer_message relleno", () => {
  const input = {
    is_software_request: false,
    content_category: "texto_general",
    claude_code_recommended: false,
    offer_message: "Esto no debería estar aquí.",
    suggested_folder_name: null,
  };
  assert.equal(isTriageResult(input), false);
});
