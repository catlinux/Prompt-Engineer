import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AiRecommendationsData, AiToolRecommendation, StructuredPrompt } from "../src/types.js";

const DATA_PATH = fileURLToPath(new URL("../config/ai_recommendations.json", import.meta.url));

let cached: AiRecommendationsData | null = null;

function loadData(): AiRecommendationsData {
  if (cached) return cached;
  const raw = readFileSync(DATA_PATH, "utf-8");
  cached = JSON.parse(raw) as AiRecommendationsData;
  return cached;
}

/**
 * Selección determinista, sin IA: solo mira si la petición es de software
 * y si hay un rol profesional definido, para elegir la herramienta más
 * adecuada de la lista curada. No es una regla exhaustiva, es un punto
 * de partida razonable.
 */
export function pickRecommendedTool(result: StructuredPrompt): AiToolRecommendation | null {
  const data = loadData();
  if (data.tools.length === 0) return null;

  if (result.is_software_request) {
    const claudeTool = data.tools.find((t) => t.id === "claude");
    if (claudeTool) return claudeTool;
  }

  return data.tools.find((t) => t.id === "chatgpt") ?? data.tools[0];
}

export function getRecommendationsUpdatedAt(): string {
  return loadData().updated_at;
}
