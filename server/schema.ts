import type { AssumedProposal, ClaudeCodeSection, OpenQuestion, StructuredPrompt } from "../src/types.js";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOpenQuestionArray(value: unknown): value is OpenQuestion[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as OpenQuestion).question === "string" &&
        typeof (item as OpenQuestion).reason === "string"
    )
  );
}

function isAssumedProposalArray(value: unknown): value is AssumedProposal[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as AssumedProposal).topic === "string" &&
        typeof (item as AssumedProposal).proposal === "string" &&
        typeof (item as AssumedProposal).reason === "string"
    )
  );
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

export function validateStructuredPrompt(value: unknown): StructuredPrompt {
  if (typeof value !== "object" || value === null) {
    throw new SchemaValidationError("La respuesta de la IA no es un objeto JSON.");
  }
  const v = value as Record<string, unknown>;

  if (typeof v.is_software_request !== "boolean") {
    throw new SchemaValidationError("Falta el campo 'is_software_request' (boolean).");
  }
  if (typeof v.objective !== "string" || v.objective.trim() === "") {
    throw new SchemaValidationError("Falta el campo 'objective' (string no vacío).");
  }
  if (v.context !== null && typeof v.context !== "string") {
    throw new SchemaValidationError("El campo 'context' debe ser string o null.");
  }
  if (!isStringArray(v.requirements)) {
    throw new SchemaValidationError("El campo 'requirements' debe ser un array de strings.");
  }
  if (!isStringArray(v.constraints)) {
    throw new SchemaValidationError("El campo 'constraints' debe ser un array de strings.");
  }
  if (!isStringArray(v.missing_information)) {
    throw new SchemaValidationError("El campo 'missing_information' debe ser un array de strings.");
  }
  if (!isOpenQuestionArray(v.open_questions)) {
    throw new SchemaValidationError("El campo 'open_questions' tiene un formato inválido.");
  }
  if (!isAssumedProposalArray(v.assumed_proposals)) {
    throw new SchemaValidationError("El campo 'assumed_proposals' tiene un formato inválido.");
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
