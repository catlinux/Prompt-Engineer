import type {
  AiToolAlternative,
  AiToolPick,
  AiToolRecommendationResult,
  ClaudeCodeSection,
  ContentCategory,
  DeferrableDecision,
  DetectedTask,
  ImportantPendingDecision,
  NecessaryDecision,
  ProfessionalRole,
  Recommendation,
  StructuredPrompt,
} from "../src/types.js";

const CONTENT_CATEGORIES: ContentCategory[] = [
  "texto_general",
  "codigo_software",
  "imagen",
  "video",
  "musica",
  "resumen_documentos",
  "transcripcion_audio",
  "investigacion_profunda",
];

function isContentCategory(value: unknown): value is ContentCategory {
  return typeof value === "string" && (CONTENT_CATEGORIES as string[]).includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNecessaryDecisionArray(value: unknown): value is NecessaryDecision[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as NecessaryDecision).question === "string" &&
        typeof (item as NecessaryDecision).why_necessary === "string"
    )
  );
}

function isImportantPendingDecisionArray(value: unknown): value is ImportantPendingDecision[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as ImportantPendingDecision).topic === "string" &&
        typeof (item as ImportantPendingDecision).provisional_approach === "string" &&
        typeof (item as ImportantPendingDecision).why_important === "string" &&
        typeof (item as ImportantPendingDecision).what_could_change === "string"
    )
  );
}

function isDeferrableDecisionArray(value: unknown): value is DeferrableDecision[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as DeferrableDecision).topic === "string" &&
        typeof (item as DeferrableDecision).note === "string"
    )
  );
}

function isRecommendationArray(value: unknown): value is Recommendation[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Recommendation).topic === "string" &&
        typeof (item as Recommendation).recommendation === "string" &&
        typeof (item as Recommendation).reason === "string"
    )
  );
}

function isDetectedTaskArray(value: unknown): value is DetectedTask[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as DetectedTask).task === "string" &&
        isStringArray((item as DetectedTask).required_capabilities)
    )
  );
}

function isAiToolPick(value: unknown, validToolIds: Set<string>): value is AiToolPick {
  if (typeof value !== "object" || value === null) return false;
  const v = value as AiToolPick;
  return (
    typeof v.tool_id === "string" &&
    validToolIds.has(v.tool_id) &&
    typeof v.purpose === "string" &&
    typeof v.reason === "string"
  );
}

function isAiToolPickArray(value: unknown, validToolIds: Set<string>): value is AiToolPick[] {
  return Array.isArray(value) && value.every((item) => isAiToolPick(item, validToolIds));
}

function isAiToolAlternativeArray(value: unknown, validToolIds: Set<string>): value is AiToolAlternative[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as AiToolAlternative).tool_id === "string" &&
        validToolIds.has((item as AiToolAlternative).tool_id) &&
        typeof (item as AiToolAlternative).difference === "string"
    )
  );
}

function isAiToolRecommendationResult(value: unknown, validToolIds: Set<string>): value is AiToolRecommendationResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as AiToolRecommendationResult;
  return (
    isDetectedTaskArray(v.task_breakdown) &&
    isAiToolPick(v.primary, validToolIds) &&
    isAiToolPickArray(v.complementary, validToolIds) &&
    isAiToolAlternativeArray(v.alternatives, validToolIds)
  );
}

function isProfessionalRole(value: unknown): value is ProfessionalRole {
  if (typeof value !== "object" || value === null) return false;
  const v = value as ProfessionalRole;
  return typeof v.role === "string" && v.role.trim() !== "" && isStringArray(v.behaviors) && v.behaviors.length > 0;
}

function isClaudeCodeSection(value: unknown): value is ClaudeCodeSection {
  if (typeof value !== "object" || value === null) return false;
  const v = value as ClaudeCodeSection;
  return (
    typeof v.what_to_build === "string" &&
    typeof v.how_to_analyze_project === "string" &&
    isStringArray(v.decisions_to_make) &&
    isStringArray(v.decisions_to_consult) &&
    isStringArray(v.documentation_to_create) &&
    isStringArray(v.persistent_instructions) &&
    typeof v.how_to_verify === "string" &&
    typeof v.how_to_update_documentation === "string"
  );
}

export class SchemaValidationError extends Error {}

export function validateStructuredPrompt(value: unknown, validToolIds: Set<string>): StructuredPrompt {
  if (typeof value !== "object" || value === null) {
    throw new SchemaValidationError("La respuesta de la IA no es un objeto JSON.");
  }
  const v = value as Record<string, unknown>;

  if (typeof v.is_software_request !== "boolean") {
    throw new SchemaValidationError("Falta el campo 'is_software_request' (boolean).");
  }
  if (!isContentCategory(v.content_category)) {
    throw new SchemaValidationError("El campo 'content_category' tiene un valor inválido o falta.");
  }
  if (v.role !== null && !isProfessionalRole(v.role)) {
    throw new SchemaValidationError("El campo 'role' debe ser null o un objeto {role, behaviors[]} válido.");
  }
  if (typeof v.objective !== "string" || v.objective.trim() === "") {
    throw new SchemaValidationError("Falta el campo 'objective' (string no vacío).");
  }
  if (v.context !== null && typeof v.context !== "string") {
    throw new SchemaValidationError("El campo 'context' debe ser string o null.");
  }
  if (!isStringArray(v.confirmed_requirements)) {
    throw new SchemaValidationError("El campo 'confirmed_requirements' debe ser un array de strings.");
  }
  if (!isStringArray(v.constraints)) {
    throw new SchemaValidationError("El campo 'constraints' debe ser un array de strings.");
  }
  if (!isNecessaryDecisionArray(v.necessary_decisions)) {
    throw new SchemaValidationError("El campo 'necessary_decisions' tiene un formato inválido.");
  }
  if (!isImportantPendingDecisionArray(v.important_pending_decisions)) {
    throw new SchemaValidationError("El campo 'important_pending_decisions' tiene un formato inválido.");
  }
  if (!isDeferrableDecisionArray(v.deferrable_decisions)) {
    throw new SchemaValidationError("El campo 'deferrable_decisions' tiene un formato inválido.");
  }
  if (!isRecommendationArray(v.recommendations)) {
    throw new SchemaValidationError("El campo 'recommendations' tiene un formato inválido.");
  }
  if (v.ai_tool_recommendation !== null && !isAiToolRecommendationResult(v.ai_tool_recommendation, validToolIds)) {
    throw new SchemaValidationError(
      "El campo 'ai_tool_recommendation' tiene un formato inválido o referencia un tool_id que no existe en el catálogo."
    );
  }
  if (!isStringArray(v.verification_criteria)) {
    throw new SchemaValidationError("El campo 'verification_criteria' debe ser un array de strings.");
  }
  if (typeof v.expected_result !== "string" || v.expected_result.trim() === "") {
    throw new SchemaValidationError("Falta el campo 'expected_result' (string no vacío).");
  }
  if (typeof v.final_prompt !== "string" || v.final_prompt.trim() === "") {
    throw new SchemaValidationError("Falta el campo 'final_prompt' (string no vacío).");
  }
  if (v.claude_code !== null && !isClaudeCodeSection(v.claude_code)) {
    throw new SchemaValidationError("El campo 'claude_code' tiene un formato inválido.");
  }
  if (v.is_software_request === true && v.claude_code === null) {
    throw new SchemaValidationError("'claude_code' no puede ser null cuando 'is_software_request' es true.");
  }

  return v as unknown as StructuredPrompt;
}
