import type { ClaudeCodeWorkspace } from "../types";
import { CopyButton } from "./CopyButton";

export type WorkspaceChoice = "pending" | "yes" | "no";

interface ClaudeCodeWorkspaceOfferProps {
  workspace: ClaudeCodeWorkspace;
  choice: WorkspaceChoice;
  onChoice: (choice: WorkspaceChoice) => void;
}

export function ClaudeCodeWorkspaceOffer({ workspace, choice, onChoice }: ClaudeCodeWorkspaceOfferProps) {
  if (choice === "pending") {
    return (
      <section className="section claude-code-offer">
        <h3>¿Preparamos el entorno de trabajo?</h3>
        <p>{workspace.offer_message}</p>
        <div className="claude-code-offer__actions">
          <button type="button" onClick={() => onChoice("yes")}>
            Sí, prepáralo
          </button>
          <button type="button" className="claude-code-offer__no" onClick={() => onChoice("no")}>
            No, solo el prompt
          </button>
        </div>
      </section>
    );
  }

  if (choice === "no") {
    return null;
  }

  return (
    <section className="section claude-code-offer claude-code-offer--expanded">
      <h3>Entorno de trabajo para Claude Code</h3>
      <p className="open-questions-form__hint">
        Crea una carpeta llamada <code>{workspace.suggested_folder_name}</code> (o el nombre que prefieras) y añade
        estos archivos antes de abrir Claude Code ahí.
      </p>

      <div className="workspace-file">
        <div className="workspace-file__header">
          <h4>CLAUDE.md</h4>
          <CopyButton text={workspace.claude_md_content} label="Copiar CLAUDE.md" />
        </div>
        <pre>{workspace.claude_md_content}</pre>
      </div>

      <div className="workspace-file">
        <div className="workspace-file__header">
          <h4>TODO.md</h4>
          <CopyButton text={workspace.todo_md_content} label="Copiar TODO.md" />
        </div>
        <pre>{workspace.todo_md_content}</pre>
      </div>
    </section>
  );
}
