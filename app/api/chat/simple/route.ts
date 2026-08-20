import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { CRISIS_SCRIPT } from "@/lib/resources";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES } from "@/lib/chat/types";
import {
  isClearlyOffTopic,
  HUMAN_RESPONSE_INSTRUCTIONS,
  OFF_TOPIC_REPLY,
  THERAPIST_SCOPE_INSTRUCTIONS,
} from "@/lib/prompts";
import { classifyLexicon } from "@/lib/safety/lexicon";
import { isCrisis } from "@/lib/safety/types";

export const maxDuration = 30;

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const requests = new Map<string, { count: number; resetAt: number }>();

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  const now = Date.now();
  const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const previous = requests.get(client);
  const bucket = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + RATE_WINDOW_MS };
  bucket.count += 1;
  requests.set(client, bucket);
  if (bucket.count > RATE_LIMIT) {
    return json({ error: "Too many requests. Please try again shortly." }, 429);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: "OPENROUTER_API_KEY is not configured on the server." }, 501);
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

  if (isCrisis(classifyLexicon(messageText(lastUser)))) {
    return fixedTextResponse(messages, CRISIS_SCRIPT);
  }

  if (isClearlyOffTopic(messageText(lastUser))) {
    return fixedTextResponse(messages, [OFF_TOPIC_REPLY]);
  }

  const openrouter = createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "CURA",
    },
  });

  const result = streamText({
    model: openrouter(process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL),
    system: `You are CURA, a warm, grounded therapist-style mental health support companion.
${THERAPIST_SCOPE_INSTRUCTIONS}
${HUMAN_RESPONSE_INSTRUCTIONS}
Use supportive, plain language; ask one gentle question at a time when helpful; suggest evidence-informed practices like breathing, journaling, grounding, reframing, and reaching out to trusted people. If the user mentions self-harm, suicide, abuse, immediate danger, or a medical emergency, encourage contacting local emergency services or a crisis hotline right away and staying with a trusted person.`,
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
