import type { StructuredPrompt } from "../types";
import { CopyButton } from "./CopyButton";

interface StructuredPromptViewProps {
  result: StructuredPrompt;
  model: string;
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

export function StructuredPromptView({ result, model }: StructuredPromptViewProps) {
  return (
    <div className="structured-prompt">
      <div className="structured-prompt__meta">
        Generado con <code>{model}</code>
        {result.is_software_request && <span className="badge">Petición de software · incluye sección Claude Code</span>}
      </div>

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

      <ListSection title="Requisitos" items={result.requirements} />
      <ListSection title="Restricciones" items={result.constraints} />
      <ListSection title="Información ausente" items={result.missing_information} />

      {result.open_questions.length > 0 && (
        <section className="section">
          <h3>Preguntas abiertas</h3>
          <ul>
            {result.open_questions.map((q, i) => (
              <li key={i}>
                <strong>{q.question}</strong>
                <div className="reason">{q.reason}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.assumed_proposals.length > 0 && (
        <section className="section">
          <h3>Propuestas asumidas</h3>
          <ul>
            {result.assumed_proposals.map((p, i) => (
              <li key={i}>
                <strong>{p.topic}:</strong> {p.proposal}
                <div className="reason">{p.reason}</div>
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
          <ListSection title="Decisiones que puede tomar" items={result.claude_code.decisions_to_make} />
          <ListSection title="Decisiones que debe consultar" items={result.claude_code.decisions_to_consult} />
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
