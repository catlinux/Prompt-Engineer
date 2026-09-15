import { useState } from "react";
import { RequestInput } from "./components/RequestInput";
import { StructuredPromptView } from "./components/StructuredPromptView";
import {
  APP_VERSION,
  APP_VERSION_DATE,
  type ApiErrorResponse,
  type GeneratePromptResponse,
  type QuestionAnswer,
} from "./types";

export default function App() {
  const [userRequest, setUserRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<GeneratePromptResponse | null>(null);

  async function generate(answers?: QuestionAnswer[]) {
    if (userRequest.trim().length === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRequest, answers }),
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

      <RequestInput value={userRequest} onChange={setUserRequest} onSubmit={() => generate()} loading={loading} />

      {error && <div className="error-banner">{error}</div>}

      {response && (
        <StructuredPromptView
          userRequest={userRequest}
          result={response.result}
          model={response.model}
          toolCatalog={response.toolCatalog}
          recommendationsUpdatedAt={response.recommendationsUpdatedAt}
          loading={loading}
          onRegenerate={(answers) => generate(answers)}
        />
      )}
    </>
  );
}
