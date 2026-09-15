import { ElapsedTimer } from "./ElapsedTimer";

interface RequestInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function RequestInput({ value, onChange, onSubmit, loading }: RequestInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      onSubmit();
    }
  }

  return (
    <div className="request-input">
      <label htmlFor="user-request">Describe qué quieres conseguir</label>
      <textarea
        id="user-request"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ej: Quiero hacer una aplicación móvil para controlar mis gastos."
        rows={6}
        maxLength={4000}
        disabled={loading}
      />
      <div className="request-input__footer">
        <span className="request-input__count">{value.length}/4000</span>
        <div className="request-input__submit">
          {loading && <ElapsedTimer active={loading} />}
          <button type="button" onClick={onSubmit} disabled={loading || value.trim().length === 0}>
            {loading ? "Generando…" : "Generar prompt"}
          </button>
        </div>
      </div>
      {loading && (
        <p className="request-input__loading-hint">
          Analizando la petición… si es un proyecto de software con Claude Code como opción clara, te lo
          preguntaremos antes de generar el análisis completo (que puede tardar 1-2 minutos).
        </p>
      )}
    </div>
  );
}
