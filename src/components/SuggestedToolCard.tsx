import type { AiToolCatalogEntry, AiToolPick, AiToolRecommendationResult } from "../types";

interface SuggestedToolCardProps {
  recommendation: AiToolRecommendationResult;
  catalog: Record<string, AiToolCatalogEntry>;
  updatedAt: string | null;
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function ToolPickBlock({ pick, catalog, label }: { pick: AiToolPick; catalog: Record<string, AiToolCatalogEntry>; label: string }) {
  const tool = catalog[pick.tool_id];
  if (!tool) return null;

  return (
    <div className="tool-pick">
      <p className="tool-pick__label">{label}</p>
      <p>
        <strong>{tool.name}</strong>
        {tool.is_agentic && <span className="badge badge--agentic">agente autónomo</span>}
        {" — "}
        {pick.purpose}
      </p>
      <p className="reason">{pick.reason}</p>
      <ul>
        <li>
          <strong>¿Tiene versión gratuita?</strong> {tool.has_free_tier ? "Sí" : "No"}. {tool.free_tier_summary}
        </li>
        {tool.free_tier_limitations && (
          <li>
            <strong>Limitaciones:</strong> {tool.free_tier_limitations}
          </li>
        )}
        {tool.price_note && (
          <li>
            <strong>Precio:</strong> {tool.price_note}
          </li>
        )}
      </ul>
    </div>
  );
}

export function SuggestedToolCard({ recommendation, catalog, updatedAt }: SuggestedToolCardProps) {
  const stale = updatedAt !== null && daysSince(updatedAt) > 7;

  return (
    <section className="section suggested-tool-section">
      <h3>IA recomendada para esta tarea</h3>
      <p className="open-questions-form__hint">
        Es solo una sugerencia orientativa, no una obligación: puedes usar cualquier IA para este prompt.
      </p>

      {recommendation.task_breakdown.length > 1 && (
        <ul className="tool-task-breakdown">
          {recommendation.task_breakdown.map((t, i) => (
            <li key={i}>
              <strong>{t.task}</strong> — {t.required_capabilities.join(", ")}
            </li>
          ))}
        </ul>
      )}

      <ToolPickBlock pick={recommendation.primary} catalog={catalog} label="IA principal recomendada" />

      {recommendation.complementary.map((pick, i) => (
        <ToolPickBlock
          key={i}
          pick={pick}
          catalog={catalog}
          label="IA complementaria (se usa junto a la principal, para otra parte del trabajo)"
        />
      ))}

      {recommendation.alternatives.length > 0 && (
        <div className="tool-alternatives">
          <p className="tool-pick__label">Alternativas a la IA principal (en vez de ella, no además)</p>
          <ul>
            {recommendation.alternatives.map((alt, i) => {
              const tool = catalog[alt.tool_id];
              if (!tool) return null;
              return (
                <li key={i}>
                  <strong>{tool.name}</strong>: {alt.difference}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {updatedAt && (
        <p className={stale ? "suggested-tool__stale-notice" : "suggested-tool__updated-notice"}>
          Datos de precios/cuotas actualizados el {updatedAt}
          {stale ? " — puede que ya no estén al día. Puedes pedirle a Claude que los actualice." : "."}
        </p>
      )}
    </section>
  );
}
