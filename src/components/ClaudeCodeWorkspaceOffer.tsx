import { useState } from "react";
import type {
  ApiErrorResponse,
  ClaudeCodeWorkspace,
  ClaudeCodeWorkspaceOfferInfo,
  GenerateWorkspaceResponse,
  StructuredPrompt,
} from "../types";
import { CopyButton } from "./CopyButton";
import { ElapsedTimer } from "./ElapsedTimer";

export type WorkspaceChoice = "pending" | "yes" | "no";

interface ClaudeCodeWorkspaceOfferProps {
  offerInfo: ClaudeCodeWorkspaceOfferInfo;
  userRequest: string;
  result: StructuredPrompt;
  choice: WorkspaceChoice;
  onChoice: (choice: WorkspaceChoice) => void;
}

export function ClaudeCodeWorkspaceOffer({
  offerInfo,
  userRequest,
  result,
  choice,
  onChoice,
}: ClaudeCodeWorkspaceOfferProps) {
  const [content, setContent] = useState<ClaudeCodeWorkspace | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleYes() {
    onChoice("yes");
    setLoadingContent(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRequest, result }),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error || "Error desconocido preparando el entorno de trabajo.");
      }
      const body = (await res.json()) as GenerateWorkspaceResponse;
      setContent(body.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoadingContent(false);
    }
  }

  if (choice === "pending") {
    return (
      <section className="section claude-code-offer">
        <h3>¿Preparamos el entorno de trabajo?</h3>
        <p>{offerInfo.offer_message}</p>
        <div className="claude-code-offer__actions">
          <button type="button" onClick={handleYes}>
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

      {loadingContent && (
        <p className="open-questions-form__hint">
          Generando CLAUDE.md y TODO.md para tu proyecto… <ElapsedTimer active={loadingContent} />
        </p>
      )}

      {error && <div className="error-banner">{error}</div>}

      {content && (
        <>
          <p className="open-questions-form__hint">
            Crea una carpeta llamada <code>{offerInfo.suggested_folder_name}</code> (o el nombre que prefieras) y
            añade estos archivos antes de abrir Claude Code ahí.
          </p>

          <div className="workspace-file">
            <div className="workspace-file__header">
              <h4>CLAUDE.md</h4>
              <CopyButton text={content.claude_md_content} label="Copiar CLAUDE.md" />
            </div>
            <pre>{content.claude_md_content}</pre>
          </div>

          <div className="workspace-file">
            <div className="workspace-file__header">
              <h4>TODO.md</h4>
              <CopyButton text={content.todo_md_content} label="Copiar TODO.md" />
            </div>
            <pre>{content.todo_md_content}</pre>
          </div>
        </>
      )}
    </section>
  );
}
