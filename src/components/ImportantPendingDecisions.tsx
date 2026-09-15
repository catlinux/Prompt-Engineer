import type { DecidedBy, ImportantPendingDecision } from "../types";

interface ImportantPendingDecisionsProps {
  decisions: ImportantPendingDecision[];
}

const DECIDED_BY_LABEL: Record<DecidedBy, string> = {
  user: "Decide el usuario",
  agent: "Puede decidirlo el agente",
  agent_after_investigation: "El agente lo decide tras investigar el proyecto",
};

export function ImportantPendingDecisions({ decisions }: ImportantPendingDecisionsProps) {
  return (
    <section className="section important-pending-section">
      <h3>Decisiones importantes pendientes</h3>
      <p className="open-questions-form__hint">
        No bloquean el trabajo: se avanza con una hipótesis razonable, que puedes ajustar más adelante.
      </p>
      <ul>
        {decisions.map((d, i) => (
          <li key={i}>
            <strong>{d.topic}:</strong> {d.provisional_approach}
            <div className="reason">{d.why_important}</div>
            <div className="important-pending__change">Si decides otra cosa, cambiaría: {d.what_could_change}</div>
            <div className="important-pending__meta">
              <span className="badge badge--muted">{DECIDED_BY_LABEL[d.decided_by]}</span>
              {d.confirmation_trigger && (
                <span className="badge badge--warn">{d.confirmation_trigger}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
