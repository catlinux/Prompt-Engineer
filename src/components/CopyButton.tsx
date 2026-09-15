import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  onCopied?: () => void;
}

export function CopyButton({ text, label = "Copiar prompt", onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="copy-button" onClick={handleCopy} type="button">
      {copied ? "Copiado ✓" : label}
    </button>
  );
}
