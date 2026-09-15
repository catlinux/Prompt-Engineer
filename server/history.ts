import { db } from "./db.js";
import type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  StructuredPrompt,
  TriageResult,
} from "../src/types.js";

interface ConversationRow {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: number;
  conversation_id: number;
  user_request: string;
  triage_json: string | null;
  result_json: string;
  created_at: string;
}

function rowToMessage(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    userRequest: row.user_request,
    triage: row.triage_json ? (JSON.parse(row.triage_json) as TriageResult) : null,
    result: JSON.parse(row.result_json) as StructuredPrompt,
    createdAt: row.created_at,
  };
}

function rowToSummary(row: ConversationRow): ConversationSummary {
  return { id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function listConversations(): ConversationSummary[] {
  const rows = db.prepare("SELECT * FROM conversations ORDER BY updated_at DESC").all() as ConversationRow[];
  return rows.map(rowToSummary);
}

export function getConversation(id: number): ConversationDetail | null {
  const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as ConversationRow | undefined;
  if (!row) return null;
  const messageRows = db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC")
    .all(id) as MessageRow[];
  return { ...rowToSummary(row), messages: messageRows.map(rowToMessage) };
}

export function createConversation(
  title: string,
  messages: Array<{ userRequest: string; triage: TriageResult | null; result: StructuredPrompt }>
): ConversationDetail {
  const insertConversation = db.prepare("INSERT INTO conversations (title) VALUES (?)");
  const insertMessage = db.prepare(
    "INSERT INTO messages (conversation_id, user_request, triage_json, result_json) VALUES (?, ?, ?, ?)"
  );

  const conversationId = db.transaction(() => {
    const info = insertConversation.run(title);
    const id = Number(info.lastInsertRowid);
    for (const m of messages) {
      insertMessage.run(id, m.userRequest, m.triage ? JSON.stringify(m.triage) : null, JSON.stringify(m.result));
    }
    return id;
  })();

  const conversation = getConversation(conversationId);
  if (!conversation) {
    throw new Error("No se pudo crear la conversación.");
  }
  return conversation;
}

export function appendMessage(
  conversationId: number,
  userRequest: string,
  triage: TriageResult | null,
  result: StructuredPrompt
): ConversationMessage | null {
  const conversation = db.prepare("SELECT id FROM conversations WHERE id = ?").get(conversationId);
  if (!conversation) return null;

  const info = db
    .prepare("INSERT INTO messages (conversation_id, user_request, triage_json, result_json) VALUES (?, ?, ?, ?)")
    .run(conversationId, userRequest, triage ? JSON.stringify(triage) : null, JSON.stringify(result));

  db.prepare("UPDATE conversations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(
    conversationId
  );

  const row = db.prepare("SELECT * FROM messages WHERE id = ?").get(Number(info.lastInsertRowid)) as MessageRow;
  return rowToMessage(row);
}

export function renameConversation(id: number, title: string): ConversationSummary | null {
  const info = db
    .prepare("UPDATE conversations SET title = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?")
    .run(title, id);
  if (info.changes === 0) return null;
  const row = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as ConversationRow;
  return rowToSummary(row);
}

export function deleteConversation(id: number): boolean {
  const info = db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return info.changes > 0;
}
