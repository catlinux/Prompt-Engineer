import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AiRecommendationsData, AiToolCatalogEntry } from "../src/types.js";

const DATA_PATH = fileURLToPath(new URL("../config/ai_recommendations.json", import.meta.url));

let cached: AiRecommendationsData | null = null;

function loadData(): AiRecommendationsData {
  if (cached) return cached;
  const raw = readFileSync(DATA_PATH, "utf-8");
  cached = JSON.parse(raw) as AiRecommendationsData;
  return cached;
}

export function getCatalog(): AiToolCatalogEntry[] {
  return loadData().tools;
}

export function getValidToolIds(): Set<string> {
  return new Set(loadData().tools.map((t) => t.id));
}

export function getCatalogAsRecord(): Record<string, AiToolCatalogEntry> {
  const record: Record<string, AiToolCatalogEntry> = {};
  for (const tool of loadData().tools) {
    record[tool.id] = tool;
  }
  return record;
}

/**
 * Bloque de texto compacto con el catálogo, pensado para incluirse en el
 * prompt que recibe DeepSeek. Solo lleva los campos relevantes para decidir
 * (no repite todo el JSON) — precios/límites detallados se resuelven en la
 * interfaz a partir del tool_id, no los reescribe la IA.
 */
export function formatCatalogForPrompt(): string {
  const data = loadData();
  const lines = data.tools.map((t) => {
    const agentic = t.is_agentic ? "SÍ (agente autónomo)" : "no (herramienta de un solo uso/chat)";
    return `- id: "${t.id}" | nombre: ${t.name} | categorías: ${t.categories.join(", ")} | ¿es agéntica?: ${agentic} | puntos fuertes: ${t.strengths.join("; ")} | ¿tiene versión gratuita?: ${t.has_free_tier ? "sí" : "no"}`;
  });
  return `Catálogo de herramientas de IA disponibles (actualizado: ${data.updated_at}):\n${lines.join("\n")}`;
}

export function getRecommendationsUpdatedAt(): string {
  return loadData().updated_at;
}
