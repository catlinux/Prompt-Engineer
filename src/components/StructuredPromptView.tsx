import type { AiToolCatalogEntry, QuestionAnswer, StructuredPrompt } from "../types";
import { ClaudeCodeWorkspaceOffer } from "./ClaudeCodeWorkspaceOffer";
import { CopyButton } from "./CopyButton";
import { ImportantPendingDecisions } from "./ImportantPendingDecisions";
import { OpenQuestionsForm } from "./OpenQuestionsForm";
import { SuggestedToolCard } from "./SuggestedToolCard";

interface StructuredPromptViewProps {
  result: StructuredPrompt;
  model: string;
  toolCatalog: Record<string, AiToolCatalogEntry>;
  recommendationsUpdatedAt: string | null;
  loading: boolean;
  onRegenerate: (answers: QuestionAnswer[]) => void;
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="section">
      <h3>{title}</h3>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function StructuredPromptView({
  result,
  model,
  toolCatalog,
  recommendationsUpdatedAt,
  loading,
  onRegenerate,
}: StructuredPromptViewProps) {
  return (
    <div className="structured-prompt">
      <div className="structured-prompt__meta">
        Generado con <code>{model}</code>
        {result.is_software_request && <span className="badge">Petición de software · incluye sección Claude Code</span>}
      </div>

      {result.ai_tool_recommendation && (
        <SuggestedToolCard
          recommendation={result.ai_tool_recommendation}
          catalog={toolCatalog}
          updatedAt={recommendationsUpdatedAt}
        />
      )}

      {result.claude_code_workspace && <ClaudeCodeWorkspaceOffer workspace={result.claude_code_workspace} />}

      {result.role && (
        <section className="section role-section">
          <h3>Rol / perspectiva profesional</h3>
          <p>
            <strong>{result.role.role}</strong>
          </p>
          <ul>
            {result.role.behaviors.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <h3>Objetivo</h3>
        <p>{result.objective}</p>
      </section>

      {result.context && (
        <section className="section">
          <h3>Contexto</h3>
          <p>{result.context}</p>
        </section>
      )}

      <ListSection title="Requisitos confirmados" items={result.confirmed_requirements} />
      <ListSection title="Restricciones" items={result.constraints} />

      {result.necessary_decisions.length > 0 && (
        <OpenQuestionsForm questions={result.necessary_decisions} loading={loading} onRegenerate={onRegenerate} />
      )}

      {result.important_pending_decisions.length > 0 && (
        <ImportantPendingDecisions decisions={result.important_pending_decisions} />
      )}

      {result.recommendations.length > 0 && (
        <section className="section recommendations-section">
          <h3>Recomendaciones de la IA</h3>
          <p className="open-questions-form__hint">No son obligaciones: son sugerencias, tú decides si aplicarlas.</p>
          <ul>
            {result.recommendations.map((r, i) => (
              <li key={i}>
                <strong>{r.topic}:</strong> Recomendación: {r.recommendation}
                <div className="reason">{r.reason}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.deferrable_decisions.length > 0 && (
        <section className="section deferrable-section">
          <h3>Decisiones que se pueden aplazar</h3>
          <p className="open-questions-form__hint">No bloquean el trabajo: se pueden resolver más adelante.</p>
          <ul>
            {result.deferrable_decisions.map((d, i) => (
              <li key={i}>
                <strong>{d.topic}:</strong> {d.note}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ListSection title="Criterios de verificación" items={result.verification_criteria} />

      <section className="section">
        <h3>Resultado esperado</h3>
        <p>{result.expected_result}</p>
      </section>

      {result.claude_code && (
        <section className="section claude-code-section">
          <h3>Sección específica para Claude Code</h3>
          <p>
            <strong>Qué debe construir:</strong> {result.claude_code.what_to_build}
          </p>
          <p>
            <strong>Cómo debe analizar el proyecto:</strong> {result.claude_code.how_to_analyze_project}
          </p>
          {result.claude_code.decision_references.length > 0 && (
            <div className="section">
              <h4>Decisiones relevantes para esta tarea</h4>
              <p className="open-questions-form__hint">
                Ver el detalle y la fase de cada una más arriba, en sus secciones correspondientes.
              </p>
              <ul>
                {result.claude_code.decision_references.map((topic, i) => (
                  <li key={i}>{topic}</li>
                ))}
              </ul>
            </div>
          )}
          <ListSection title="Documentación a crear" items={result.claude_code.documentation_to_create} />
          <ListSection title="Instrucciones persistentes a mantener" items={result.claude_code.persistent_instructions} />
          <p>
            <strong>Cómo debe verificar:</strong> {result.claude_code.how_to_verify}
          </p>
          <p>
            <strong>Cómo debe actualizar la documentación:</strong> {result.claude_code.how_to_update_documentation}
          </p>
        </section>
      )}

      <section className="section final-prompt">
        <div className="final-prompt__header">
          <h3>Prompt final (listo para copiar)</h3>
          <CopyButton text={result.final_prompt} />
        </div>
        <pre>{result.final_prompt}</pre>
      </section>
    </div>
  );
}
