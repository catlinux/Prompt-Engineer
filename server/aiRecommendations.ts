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
 * Selección determinista, sin IA: busca en el catálogo curado la primera
 * herramienta que cubra la categoría de contenido detectada por DeepSeek.
 * No es una regla exhaustiva, es un punto de partida razonable.
 */
export function pickRecommendedTool(result: StructuredPrompt): AiToolRecommendation | null {
  const data = loadData();
  if (data.tools.length === 0) return null;

  const match = data.tools.find((t) => t.categories.includes(result.content_category));
  if (match) return match;

  return data.tools.find((t) => t.categories.includes("texto_general")) ?? data.tools[0];
}

export function getRecommendationsUpdatedAt(): string {
  return loadData().updated_at;
}
