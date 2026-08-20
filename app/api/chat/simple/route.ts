/**
 * Text-chat backend for `/chat`. AI SDK v7 UI-message stream, no avatar, no signals.
 *
 * `/api/chat` is the other half: SSE with `<<mood:…>>` control lines and sentence splitting for
 * the avatar. The wire formats genuinely differ, so both routes stay — but everything that is
 * not wire format (rate limiting, safety gating, prompt, OpenRouter attribution) is shared via
 * `lib/`, because duplicated safety logic is how one copy quietly goes stale.
 *
 * On versions: `@ai-sdk/openai@4` alongside `ai@7` is correct, not a mismatch. The provider
 * packages version independently of the core; npm dist-tags confirm the pairing (`ai-v6` → 3.x,
 * `ai-v5` → 2.x, `latest`/v7 → 4.x). Same story for the transitive `@ai-sdk/react@4`.
 */

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { gateUserTurn } from "@/lib/chat/gate";
import { allow, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES } from "@/lib/chat/types";
import {
  API_BASE_URL,
  attributionHeaders,
  chatModels,
  OpenRouterError,
  requireKey,
} from "@/lib/openrouter";
import { TEXT_CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import { getSupabase } from "@/lib/supabase";
import { createClient as createAuthClient } from "@/lib/supabase/server";

export const maxDuration = 30;

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  if (!allow(req, { scope: "chat", limit: 20 })) {
    return json({ error: RATE_LIMITED_MESSAGE }, 429);
  }

  let apiKey: string;
  try {
    apiKey = requireKey();
  } catch (err) {
    const status = err instanceof OpenRouterError ? (err.status ?? 502) : 502;
    return json({ error: (err as Error).message }, status);
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json({ error: "Missing messages." }, 400);
  }

  const messages = normalizeMessages(body.messages);
  if (!messages.length) {
    return json({ error: "Messages must contain text." }, 400);
  }

  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUser) {
    return json({ error: "The last turn must be from the user." }, 400);
  }

  // Keep a private snapshot for signed-in users. Guests remain client-only.
  try {
    const auth = await createAuthClient();
    const { data: authData } = await auth.auth.getUser();
    const supabase = getSupabase();
    if (authData.user && supabase) {
      const firstText = messages.find((message) => message.role === "user");
      const title = firstText ? messageText(firstText).slice(0, 70) || "Cura conversation" : "Cura conversation";
      await supabase.from("conversations").upsert({
        user_id: authData.user.id,
        title,
        messages,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }
  } catch {
    // Chat should still work if account history has not been configured yet.
  }

  // Safety and scope screening lives in `lib/chat/gate.ts`, shared with the SSE route.
  const gate = gateUserTurn(messageText(lastUser));
  if (gate.kind !== "model") {
    return fixedTextResponse(messages, gate.texts);
  }

  const openrouter = createOpenAI({
    apiKey,
    baseURL: API_BASE_URL,
    headers: attributionHeaders(),
  });

  const result = streamText({
    // No fallback chain here: this route has no avatar waiting on first audio, so a plain
    // error is acceptable where `/api/chat` has to keep talking. Same primary model, though.
    model: openrouter(chatModels()[0]),
    system: TEXT_CHAT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

function fixedTextResponse(messages: UIMessage[], texts: string[]): Response {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute({ writer }) {
      const id = crypto.randomUUID();
      writer.write({ type: "text-start", id });
      for (const text of texts) {
        writer.write({ type: "text-delta", id, delta: `${text} ` });
      }
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

function normalizeMessages(input: UIMessage[]): UIMessage[] {
  return input
    .filter(
      (message) =>
        !!message &&
        (message.role === "user" || message.role === "assistant") &&
        Array.isArray(message.parts) &&
        message.parts.every(
          (part) =>
            !!part && part.type === "text" && typeof part.text === "string",
        ),
    )
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      ...message,
      parts: message.parts.filter(isTextPart).map((part) => ({
        ...part,
        text: part.text.slice(0, MAX_MESSAGE_CHARS),
      })),
    }));
}

function isTextPart(part: UIMessage["parts"][number]): part is Extract<UIMessage["parts"][number], { type: "text" }> {
  return !!part && part.type === "text" && typeof part.text === "string";
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");
}
