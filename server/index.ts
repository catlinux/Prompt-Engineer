import "dotenv/config";
import express from "express";
import { generateStructuredPrompt, loadDeepSeekConfig, DeepSeekError } from "./deepseek.js";
import { pickRecommendedTool, getRecommendationsUpdatedAt } from "./aiRecommendations.js";
import type { GeneratePromptRequest, GeneratePromptResponse, ApiErrorResponse, QuestionAnswer } from "../src/types.js";

const app = express();
app.use(express.json({ limit: "100kb" }));

function parseAnswers(raw: unknown): QuestionAnswer[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const answers = raw.filter(
    (item): item is QuestionAnswer =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as QuestionAnswer).question === "string" &&
      typeof (item as QuestionAnswer).answer === "string" &&
      (item as QuestionAnswer).answer.trim().length > 0
  );
  return answers.length > 0 ? answers : undefined;
}

app.post("/api/generate-prompt", async (req, res) => {
  const body = req.body as Partial<GeneratePromptRequest>;
  const userRequest = body.userRequest;
  const answers = parseAnswers(body.answers);

  if (typeof userRequest !== "string" || userRequest.trim().length === 0) {
    const error: ApiErrorResponse = { error: "Debes escribir una petición antes de generar el prompt." };
    res.status(400).json(error);
    return;
  }
  if (userRequest.length > 4000) {
    const error: ApiErrorResponse = { error: "La petición es demasiado larga (máximo 4000 caracteres)." };
    res.status(400).json(error);
    return;
  }

  try {
    const config = loadDeepSeekConfig();
    const result = await generateStructuredPrompt(config, userRequest.trim(), answers);
    const response: GeneratePromptResponse = {
      result,
      model: config.model,
      suggestedTool: pickRecommendedTool(result),
      recommendationsUpdatedAt: getRecommendationsUpdatedAt(),
    };
    res.json(response);
  } catch (err) {
    if (err instanceof DeepSeekError) {
      const error: ApiErrorResponse = { error: err.message };
      res.status(502).json(error);
      return;
    }
    console.error("Error inesperado en /api/generate-prompt:", err);
    const error: ApiErrorResponse = { error: "Error interno del servidor." };
    res.status(500).json(error);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});
