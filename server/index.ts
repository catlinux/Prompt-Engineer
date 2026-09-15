import "dotenv/config";
import express from "express";
import {
  generateStructuredPrompt,
  generateClaudeCodeWorkspace,
  triageRequest,
  loadDeepSeekConfig,
  DeepSeekError,
} from "./deepseek.js";
import { getCatalogAsRecord, getRecommendationsUpdatedAt } from "./aiRecommendations.js";
import {
  listConversations,
  getConversation,
  createConversation,
  appendMessage,
  renameConversation,
  deleteConversation,
} from "./history.js";
import type {
  GeneratePromptRequest,
  GeneratePromptResponse,
  GenerateWorkspaceRequest,
  GenerateWorkspaceResponse,
  TriageRequest,
  TriageResponse,
  ApiErrorResponse,
  QuestionAnswer,
  CreateConversationRequest,
  CreateConversationResponse,
  AppendMessageRequest,
  AppendMessageResponse,
  RenameConversationRequest,
} from "../src/types.js";

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

app.post("/api/triage", async (req, res) => {
  const body = req.body as Partial<TriageRequest>;
  const userRequest = body.userRequest;

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
    const triage = await triageRequest(config, userRequest.trim());
    const response: TriageResponse = { triage };
    res.json(response);
  } catch (err) {
    if (err instanceof DeepSeekError) {
      const error: ApiErrorResponse = { error: err.message };
      res.status(502).json(error);
      return;
    }
    console.error("Error inesperado en /api/triage:", err);
    const error: ApiErrorResponse = { error: "Error interno del servidor." };
    res.status(500).json(error);
  }
});

app.post("/api/generate-prompt", async (req, res) => {
  const body = req.body as Partial<GeneratePromptRequest>;
  const userRequest = body.userRequest;
  const answers = parseAnswers(body.answers);
  const excludeClaudeCode = body.excludeClaudeCode === true;
  const threadHistory = Array.isArray(body.threadHistory) ? body.threadHistory : undefined;

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
    const result = await generateStructuredPrompt(config, userRequest.trim(), answers, excludeClaudeCode, threadHistory);
    const response: GeneratePromptResponse = {
      result,
      model: config.model,
      toolCatalog: getCatalogAsRecord(),
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

app.post("/api/generate-workspace", async (req, res) => {
  const body = req.body as Partial<GenerateWorkspaceRequest>;
  const userRequest = body.userRequest;
  const result = body.result;

  if (typeof userRequest !== "string" || userRequest.trim().length === 0) {
    const error: ApiErrorResponse = { error: "Falta la petición original." };
    res.status(400).json(error);
    return;
  }
  if (typeof result !== "object" || result === null || typeof result.objective !== "string") {
    const error: ApiErrorResponse = { error: "Falta el análisis (result) sobre el que generar el entorno de trabajo." };
    res.status(400).json(error);
    return;
  }

  try {
    const config = loadDeepSeekConfig();
    const workspace = await generateClaudeCodeWorkspace(config, result);
    const response: GenerateWorkspaceResponse = { workspace };
    res.json(response);
  } catch (err) {
    if (err instanceof DeepSeekError) {
      const error: ApiErrorResponse = { error: err.message };
      res.status(502).json(error);
      return;
    }
    console.error("Error inesperado en /api/generate-workspace:", err);
    const error: ApiErrorResponse = { error: "Error interno del servidor." };
    res.status(500).json(error);
  }
});

app.get("/api/conversations", (_req, res) => {
  res.json({ conversations: listConversations() });
});

app.get("/api/conversations/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    const error: ApiErrorResponse = { error: "Identificador de conversación inválido." };
    res.status(400).json(error);
    return;
  }
  const conversation = getConversation(id);
  if (!conversation) {
    const error: ApiErrorResponse = { error: "Conversación no encontrada." };
    res.status(404).json(error);
    return;
  }
  res.json({ conversation });
});

app.post("/api/conversations", (req, res) => {
  const body = req.body as Partial<CreateConversationRequest>;
  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    const error: ApiErrorResponse = { error: "Falta el título de la conversación." };
    res.status(400).json(error);
    return;
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    const error: ApiErrorResponse = { error: "La conversación necesita al menos un mensaje." };
    res.status(400).json(error);
    return;
  }
  const conversation = createConversation(body.title.trim(), body.messages);
  const response: CreateConversationResponse = { conversation };
  res.status(201).json(response);
});

app.post("/api/conversations/:id/messages", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Partial<AppendMessageRequest>;
  if (!Number.isInteger(id)) {
    const error: ApiErrorResponse = { error: "Identificador de conversación inválido." };
    res.status(400).json(error);
    return;
  }
  if (typeof body.userRequest !== "string" || typeof body.result !== "object" || body.result === null) {
    const error: ApiErrorResponse = { error: "Falta la petición o el resultado del mensaje." };
    res.status(400).json(error);
    return;
  }
  const message = appendMessage(id, body.userRequest, body.triage ?? null, body.result);
  if (!message) {
    const error: ApiErrorResponse = { error: "Conversación no encontrada." };
    res.status(404).json(error);
    return;
  }
  const response: AppendMessageResponse = { message };
  res.status(201).json(response);
});

app.patch("/api/conversations/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Partial<RenameConversationRequest>;
  if (!Number.isInteger(id)) {
    const error: ApiErrorResponse = { error: "Identificador de conversación inválido." };
    res.status(400).json(error);
    return;
  }
  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    const error: ApiErrorResponse = { error: "Falta el nuevo título." };
    res.status(400).json(error);
    return;
  }
  const conversation = renameConversation(id, body.title.trim());
  if (!conversation) {
    const error: ApiErrorResponse = { error: "Conversación no encontrada." };
    res.status(404).json(error);
    return;
  }
  res.json({ conversation });
});

app.delete("/api/conversations/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    const error: ApiErrorResponse = { error: "Identificador de conversación inválido." };
    res.status(400).json(error);
    return;
  }
  const deleted = deleteConversation(id);
  if (!deleted) {
    const error: ApiErrorResponse = { error: "Conversación no encontrada." };
    res.status(404).json(error);
    return;
  }
  res.status(204).end();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
});
