import { ElapsedTimer } from "./ElapsedTimer";

interface ClaudeCodeTriagePromptProps {
  offerMessage: string;
  loading: boolean;
  onYes: () => void;
  onNo: () => void;
}

export function ClaudeCodeTriagePrompt({ offerMessage, loading, onYes, onNo }: ClaudeCodeTriagePromptProps) {
  return (
    <section className="section claude-code-offer">
      <h3>¿Usamos Claude Code para esto?</h3>
      <p>{offerMessage}</p>
      <div className="claude-code-offer__actions">
        <button type="button" onClick={onYes} disabled={loading}>
          Sí, usar Claude Code
        </button>
        <button type="button" className="claude-code-offer__no" onClick={onNo} disabled={loading}>
          No, prueba con otra IA
        </button>
      </div>
      {loading && (
        <p className="request-input__loading-hint">
          Generando el análisis completo… <ElapsedTimer active={loading} />
        </p>
      )}
    </section>
  );
}
