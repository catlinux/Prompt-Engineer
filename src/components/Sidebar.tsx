import { useState } from "react";
import type { ConversationSummary } from "../types";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

export function Sidebar({ conversations, activeConversationId, onSelect, onNew, onRename, onDelete }: SidebarProps) {
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  function startRename(conv: ConversationSummary) {
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  }

  function commitRename() {
    if (renamingId !== null && renameValue.trim().length > 0) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }

  return (
    <nav className="sidebar">
      <button type="button" className="sidebar__new" onClick={onNew}>
        + Nueva consulta
      </button>

      <ul className="sidebar__list">
        {conversations.map((conv) => (
          <li key={conv.id} className={conv.id === activeConversationId ? "sidebar__item sidebar__item--active" : "sidebar__item"}>
            {renamingId === conv.id ? (
              <input
                className="sidebar__rename-input"
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
              />
            ) : (
              <button type="button" className="sidebar__item-title" onClick={() => onSelect(conv.id)}>
                {conv.title}
              </button>
            )}

            {confirmingDeleteId === conv.id ? (
              <div className="sidebar__confirm-delete">
                <span>¿Eliminar?</span>
                <button type="button" className="sidebar__confirm-yes" onClick={() => onDelete(conv.id)}>
                  Sí
                </button>
                <button type="button" className="sidebar__confirm-no" onClick={() => setConfirmingDeleteId(null)}>
                  No
                </button>
              </div>
            ) : (
              <div className="sidebar__item-actions">
                <button
                  type="button"
                  className="sidebar__icon-button"
                  title="Renombrar"
                  onClick={() => startRename(conv)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="sidebar__icon-button"
                  title="Eliminar"
                  onClick={() => setConfirmingDeleteId(conv.id)}
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        ))}
        {conversations.length === 0 && <li className="sidebar__empty">Todavía no hay conversaciones guardadas.</li>}
      </ul>
    </nav>
  );
}
