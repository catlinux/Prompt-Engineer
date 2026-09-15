import type { ImportantPendingDecision } from "../types";

interface ImportantPendingDecisionsProps {
  decisions: ImportantPendingDecision[];
}

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
          </li>
        ))}
      </ul>
    </section>
  );
}
