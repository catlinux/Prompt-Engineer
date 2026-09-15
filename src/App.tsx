import { useState } from "react";
import { RequestInput } from "./components/RequestInput";
import { StructuredPromptView } from "./components/StructuredPromptView";
import { ClaudeCodeTriagePrompt } from "./components/ClaudeCodeTriagePrompt";
import {
  APP_VERSION,
  APP_VERSION_DATE,
  type ApiErrorResponse,
  type GeneratePromptResponse,
  type QuestionAnswer,
  type TriageResponse,
  type TriageResult,
} from "./types";

export default function App() {
  const [userRequest, setUserRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<GeneratePromptResponse | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);

  function resetForNewRequest() {
    setError(null);
    setResponse(null);
    setTriage(null);
  }

  async function generateFull(excludeClaudeCode: boolean, answers?: QuestionAnswer[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRequest, answers, excludeClaudeCode }),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error || "Error desconocido generando el prompt.");
      }
      const body = (await res.json()) as GeneratePromptResponse;
      setResponse(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  async function startRequest() {
    if (userRequest.trim().length === 0 || loading) return;
    resetForNewRequest();
    setLoading(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRequest }),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error || "Error desconocido analizando la petición.");
      }
      const body = (await res.json()) as TriageResponse;
      setLoading(false);
      if (body.triage.claude_code_recommended) {
        setTriage(body.triage);
        return;
      }
      await generateFull(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
      setLoading(false);
    }
  }

  function handleRegenerate(answers: QuestionAnswer[]) {
    const excludeClaudeCode = response?.result.ai_tool_recommendation?.primary.tool_id !== "claude_code";
    generateFull(excludeClaudeCode, answers);
  }

  return (
    <>
      <div className="app-header">
        <h1>Prompt Engineer</h1>
        <span className="app-version">
          v{APP_VERSION} · {APP_VERSION_DATE}
        </span>
      </div>
      <p className="subtitle">
        Escribe tu petición en lenguaje natural y genera un prompt profesional y estructurado.
      </p>

      <RequestInput value={userRequest} onChange={setUserRequest} onSubmit={startRequest} loading={loading} />

      {error && <div className="error-banner">{error}</div>}

      {triage && !response && (
        <ClaudeCodeTriagePrompt
          offerMessage={triage.offer_message ?? ""}
          loading={loading}
          onYes={() => generateFull(false)}
          onNo={() => generateFull(true)}
        />
      )}

      {response && (
        <StructuredPromptView
          userRequest={userRequest}
          result={response.result}
          model={response.model}
          toolCatalog={response.toolCatalog}
          recommendationsUpdatedAt={response.recommendationsUpdatedAt}
          loading={loading}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
}
