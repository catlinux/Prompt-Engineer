export interface OpenQuestion {
  question: string;
  reason: string;
}

export interface AssumedProposal {
  topic: string;
  proposal: string;
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
  objective: string;
  context: string | null;
  requirements: string[];
  constraints: string[];
  missing_information: string[];
  open_questions: OpenQuestion[];
  assumed_proposals: AssumedProposal[];
  verification_criteria: string[];
  expected_result: string;
  final_prompt: string;
  claude_code: ClaudeCodeSection | null;
}

export interface GeneratePromptRequest {
  userRequest: string;
}

export interface GeneratePromptResponse {
  result: StructuredPrompt;
  model: string;
}

export interface ApiErrorResponse {
  error: string;
}
