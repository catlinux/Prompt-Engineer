import pkg from "../package.json";

export const APP_VERSION = pkg.version;
export const APP_VERSION_DATE = "2026-09-15";
// Recuerda actualizar esta fecha cada vez que cambie la versión en package.json.

export interface ProfessionalRole {
  role: string;
  behaviors: string[];
}

export interface NecessaryDecision {
  question: string;
  why_necessary: string;
}

export interface DeferrableDecision {
  topic: string;
  note: string;
}

export interface Recommendation {
  topic: string;
  recommendation: string;
  reason: string;
}

export interface ClaudeCodeSection {
  what_to_build: string;
  how_to_analyze_project: string;
  decisions_to_make: string[];
  decisions_to_consult: string[];
  documentation_to_create: string[];
  persistent_instructions: string[];
  how_to_verify: string;
  how_to_update_documentation: string;
}

export interface StructuredPrompt {
  is_software_request: boolean;
  role: ProfessionalRole | null;
  objective: string;
  context: string | null;
  confirmed_requirements: string[];
  constraints: string[];
  necessary_decisions: NecessaryDecision[];
  deferrable_decisions: DeferrableDecision[];
  recommendations: Recommendation[];
  verification_criteria: string[];
  expected_result: string;
  final_prompt: string;
  claude_code: ClaudeCodeSection | null;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface GeneratePromptRequest {
  userRequest: string;
  answers?: QuestionAnswer[];
}

export interface AiToolRecommendation {
  id: string;
  name: string;
  has_free_tier: boolean;
  free_tier_summary: string;
  free_tier_limitations: string;
  best_for: string[];
  recommended_when: string;
}

export interface AiRecommendationsData {
  updated_at: string;
  tools: AiToolRecommendation[];
}

export interface GeneratePromptResponse {
  result: StructuredPrompt;
  model: string;
  suggestedTool: AiToolRecommendation | null;
  recommendationsUpdatedAt: string | null;
}

export interface ApiErrorResponse {
  error: string;
}
