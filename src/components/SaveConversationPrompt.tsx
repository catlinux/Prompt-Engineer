interface SaveConversationPromptProps {
  onSave: () => void;
  onDiscard: () => void;
}

export function SaveConversationPrompt({ onSave, onDiscard }: SaveConversationPromptProps) {
  return (
    <div className="save-prompt-overlay">
      <div className="save-prompt">
        <p>¿Quieres guardar esta consulta en el historial para poder retomarla más adelante?</p>
        <div className="save-prompt__actions">
          <button type="button" onClick={onSave}>
            Guardar
          </button>
          <button type="button" className="save-prompt__discard" onClick={onDiscard}>
            No, descartar
          </button>
        </div>
      </div>
    </div>
  );
}
