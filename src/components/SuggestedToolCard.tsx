import type { AiToolRecommendation } from "../types";

interface SuggestedToolCardProps {
  tool: AiToolRecommendation;
  updatedAt: string | null;
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function SuggestedToolCard({ tool, updatedAt }: SuggestedToolCardProps) {
  const stale = updatedAt !== null && daysSince(updatedAt) > 7;

  return (
    <section className="section suggested-tool-section">
      <h3>IA recomendada para esta tarea</h3>
      <p className="open-questions-form__hint">
        Es solo una sugerencia orientativa, no una obligación: puedes usar cualquier IA para este prompt.
      </p>
      <p>
        <strong>{tool.name}</strong> — {tool.recommended_when}
      </p>
      <ul>
        <li>
          <strong>¿Tiene versión gratuita?</strong> {tool.has_free_tier ? "Sí" : "No"}. {tool.free_tier_summary}
        </li>
        {tool.free_tier_limitations && (
          <li>
            <strong>Limitaciones de la versión gratuita:</strong> {tool.free_tier_limitations}
          </li>
        )}
      </ul>
      {updatedAt && (
        <p className={stale ? "suggested-tool__stale-notice" : "suggested-tool__updated-notice"}>
          Datos de precios/cuotas actualizados el {updatedAt}
          {stale ? " — puede que ya no estén al día. Puedes pedirle a Claude que los actualice." : "."}
        </p>
      )}
    </section>
  );
}
