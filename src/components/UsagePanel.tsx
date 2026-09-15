import type { TokenUsage } from "../types";

interface UsagePanelProps {
  loading: boolean;
  error: string | null;
  currentBalance: number | null;
  currency: string | null;
  lastCostUsd: number | null;
  lastUsage: TokenUsage | null;
}

export function UsagePanel({ loading, error, currentBalance, currency, lastCostUsd, lastUsage }: UsagePanelProps) {
  return (
    <div className="usage-panel">
      <div className="usage-panel__row">
        <span className="usage-panel__label">Saldo</span>
        {loading && currentBalance === null ? (
          <span className="usage-panel__value usage-panel__value--muted">Consultando…</span>
        ) : error ? (
          <span className="usage-panel__value usage-panel__value--error" title={error}>
            No disponible
          </span>
        ) : currentBalance !== null ? (
          <span className="usage-panel__value">
            {currentBalance.toFixed(2)} {currency}
          </span>
        ) : (
          <span className="usage-panel__value usage-panel__value--muted">—</span>
        )}
      </div>

      {(lastUsage || lastCostUsd !== null) && (
        <div className="usage-panel__row">
          <span className="usage-panel__label">Última consulta</span>
          <span className="usage-panel__value usage-panel__value--muted">
            {lastUsage ? `${lastUsage.total_tokens.toLocaleString("es-ES")} tokens` : ""}
            {lastUsage && lastCostUsd !== null ? " · " : ""}
            {lastCostUsd !== null
              ? lastCostUsd > 0
                ? `~${lastCostUsd.toFixed(2)} ${currency ?? "USD"}`
                : `< 0.01 ${currency ?? "USD"}`
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}
