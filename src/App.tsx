import { useEffect, useState } from "react";
import { RequestInput } from "./components/RequestInput";
import { StructuredPromptView } from "./components/StructuredPromptView";
import { ClaudeCodeTriagePrompt } from "./components/ClaudeCodeTriagePrompt";
import { Sidebar } from "./components/Sidebar";
import { SaveConversationPrompt } from "./components/SaveConversationPrompt";
import { UsagePanel } from "./components/UsagePanel";
import {
  APP_VERSION,
  APP_VERSION_DATE,
  type ApiErrorResponse,
  type BalanceResponse,
  type ConversationDetail,
  type ConversationSummary,
  type CreateConversationResponse,
  type GeneratePromptResponse,
  type QuestionAnswer,
  type StructuredPrompt,
  type ThreadHistoryEntry,
  type TokenUsage,
  type TriageResponse,
  type TriageResult,
} from "./types";

interface ThreadMessage {
  userRequest: string;
  triage: TriageResult | null;
  response: GeneratePromptResponse;
}

function deriveTitle(userRequest: string): string {
  const trimmed = userRequest.trim().replace(/\s+/g, " ");
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}

export default function App() {
  const [userRequest, setUserRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);

  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [saveChoiceMade, setSaveChoiceMade] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceCurrency, setBalanceCurrency] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const [lastCostUsd, setLastCostUsd] = useState<number | null>(null);
  const [balanceBeforeRequest, setBalanceBeforeRequest] = useState<number | null>(null);

  useEffect(() => {
    void refreshConversations();
    void fetchBalance();
  }, []);

  async function refreshConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const body = (await res.json()) as { conversations: ConversationSummary[] };
      setConversations(body.conversations);
    } catch {
      // El historial es una comodidad secundaria: si falla, no bloquea el uso normal de la app.
    }
  }

  async function fetchBalance(): Promise<number | null> {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/balance");
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error || "No se pudo consultar el saldo.");
      }
      const body = (await res.json()) as BalanceResponse;
      setBalanceError(null);
      const primary = body.balances[0] ?? null;
      if (primary) {
        setBalance(primary.total_balance);
        setBalanceCurrency(primary.currency);
        return primary.total_balance;
      }
      setBalance(null);
      return null;
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Error desconocido consultando el saldo.");
      return null;
    } finally {
      setBalanceLoading(false);
    }
  }

  function resetForNewRequest() {
    setError(null);
    setTriage(null);
    setThread([]);
    setConversationId(null);
    setSaveChoiceMade(false);
    setShowSavePrompt(false);
  }

  function startNewConversation() {
    resetForNewRequest();
    setUserRequest("");
  }

  async function openConversation(id: number) {
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error || "No se pudo abrir la conversación.");
      }
      const body = (await res.json()) as { conversation: ConversationDetail };
      const loadedThread: ThreadMessage[] = body.conversation.messages.map((m) => ({
        userRequest: m.userRequest,
        triage: m.triage,
        response: {
          result: m.result,
          model: "",
          toolCatalog: {},
          recommendationsUpdatedAt: null,
          usage: null,
        },
      }));
      setThread(loadedThread);
      setConversationId(body.conversation.id);
      setSaveChoiceMade(true);
      setShowSavePrompt(false);
      setTriage(null);
      setUserRequest("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    }
  }

  async function renameConv(id: number, title: string) {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      await refreshConversations();
    } catch {
      // No crítico: si falla el renombrado, el usuario puede reintentarlo.
    }
  }

  async function deleteConv(id: number) {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (conversationId === id) {
        startNewConversation();
      }
      await refreshConversations();
    } catch {
      // No crítico: si falla el borrado, el usuario puede reintentarlo.
    }
  }

  function buildThreadHistory(): ThreadHistoryEntry[] {
    return thread.map((m) => ({ userRequest: m.userRequest, result: m.response.result }));
  }

  async function persistMessageInSavedConversation(
    newUserRequest: string,
    newTriage: TriageResult | null,
    result: StructuredPrompt
  ) {
    if (!saveChoiceMade || conversationId === null) return;
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRequest: newUserRequest, triage: newTriage, result }),
      });
      await refreshConversations();
    } catch {
      // El guardado es best-effort: un fallo aquí no debe impedir seguir usando la app.
    }
  }

  async function generateFull(excludeClaudeCode: boolean, usedTriage: TriageResult | null, answers?: QuestionAnswer[]) {
    const requestText = userRequest;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRequest: requestText,
          answers,
          excludeClaudeCode,
          threadHistory: buildThreadHistory(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error || "Error desconocido generando el prompt.");
      }
      const body = (await res.json()) as GeneratePromptResponse;
      setThread((prev) => [...prev, { userRequest: requestText, triage: usedTriage, response: body }]);
      setTriage(null);
      setUserRequest("");
      setLastUsage(body.usage);
      const balanceAfter = await fetchBalance();
      if (balanceBeforeRequest !== null && balanceAfter !== null) {
        setLastCostUsd(Math.max(0, balanceBeforeRequest - balanceAfter));
      }
      await persistMessageInSavedConversation(requestText, usedTriage, body.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  async function startRequest() {
    if (userRequest.trim().length === 0 || loading) return;
    setError(null);
    setLoading(true);
    const balanceNow = await fetchBalance();
    setBalanceBeforeRequest(balanceNow);
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
      await generateFull(false, body.triage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
      setLoading(false);
    }
  }

  function handleRegenerate(answers: QuestionAnswer[]) {
    const lastResult = thread[thread.length - 1]?.response.result;
    const excludeClaudeCode = lastResult?.ai_tool_recommendation?.primary.tool_id !== "claude_code";
    generateFull(excludeClaudeCode, null, answers);
  }

  function handleFinalPromptCopied() {
    if (!saveChoiceMade) {
      setShowSavePrompt(true);
    }
  }

  async function handleSave() {
    setSaveChoiceMade(true);
    setShowSavePrompt(false);
    try {
      const title = deriveTitle(thread[0]?.userRequest ?? "");
      const messages = thread.map((m) => ({ userRequest: m.userRequest, triage: m.triage, result: m.response.result }));
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, messages }),
      });
      if (res.ok) {
        const body = (await res.json()) as CreateConversationResponse;
        setConversationId(body.conversation.id);
        await refreshConversations();
      }
    } catch {
      // El guardado es best-effort: un fallo aquí no debe impedir seguir usando la app.
    }
  }

  function handleDiscard() {
    setSaveChoiceMade(true);
    setShowSavePrompt(false);
  }

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeConversationId={conversationId}
        onSelect={openConversation}
        onNew={startNewConversation}
        onRename={renameConv}
        onDelete={deleteConv}
      />

      <div className="app-main">
        <div className="app-header">
          <div className="app-header__title">
            <h1>Prompt Engineer</h1>
            <span className="app-version">
              v{APP_VERSION} · {APP_VERSION_DATE}
            </span>
          </div>
          <UsagePanel
            loading={balanceLoading}
            error={balanceError}
            currentBalance={balance}
            currency={balanceCurrency}
            lastCostUsd={lastCostUsd}
            lastUsage={lastUsage}
          />
        </div>
        <p className="subtitle">
          Escribe tu petición en lenguaje natural y genera un prompt profesional y estructurado.
        </p>

        {thread.map((message, i) => (
          <div className="thread-message" key={i}>
            <div className="thread-message__request">
              <span className="thread-message__label">Tú</span>
              <p>{message.userRequest}</p>
            </div>
            <StructuredPromptView
              userRequest={message.userRequest}
              result={message.response.result}
              model={message.response.model}
              toolCatalog={message.response.toolCatalog}
              recommendationsUpdatedAt={message.response.recommendationsUpdatedAt}
              loading={loading && i === thread.length - 1}
              onRegenerate={handleRegenerate}
              onFinalPromptCopied={i === thread.length - 1 ? handleFinalPromptCopied : undefined}
            />
          </div>
        ))}

        <RequestInput
          value={userRequest}
          onChange={setUserRequest}
          onSubmit={startRequest}
          loading={loading}
          onNewRequest={startNewConversation}
          showNewRequest={thread.length > 0 || userRequest.trim().length > 0}
        />

        {error && <div className="error-banner">{error}</div>}

        {triage && triage.claude_code_recommended && (
          <ClaudeCodeTriagePrompt
            offerMessage={triage.offer_message ?? ""}
            loading={loading}
            onYes={() => generateFull(false, triage)}
            onNo={() => generateFull(true, triage)}
          />
        )}
      </div>

      {showSavePrompt && <SaveConversationPrompt onSave={handleSave} onDiscard={handleDiscard} />}
    </div>
  );
}
