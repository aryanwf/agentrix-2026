import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 20_000;

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  return (
    (message.role === "system" ||
      message.role === "user" ||
      message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= MAX_CONTENT_LENGTH
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const messages = payload.messages;

  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES ||
    !messages.every(isChatMessage)
  ) {
    return NextResponse.json(
      {
        error: `messages must contain 1-${MAX_MESSAGES} valid messages with role and content.`,
      },
      { status: 400 },
    );
  }

  const model =
    typeof payload.model === "string" && payload.model.trim()
      ? payload.model.trim()
      : process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const temperature =
    typeof payload.temperature === "number" &&
    Number.isFinite(payload.temperature) &&
    payload.temperature >= 0 &&
    payload.temperature <= 2
      ? payload.temperature
      : undefined;

  try {
    const openRouterResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(process.env.OPENROUTER_SITE_URL
          ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }
          : {}),
        ...(process.env.OPENROUTER_SITE_NAME
          ? { "X-Title": process.env.OPENROUTER_SITE_NAME }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        ...(temperature === undefined ? {} : { temperature }),
        stream: false,
      }),
    });

    const responseBody = await openRouterResponse.json().catch(() => null);

    if (!openRouterResponse.ok) {
      const providerError =
        responseBody && typeof responseBody === "object"
          ? (responseBody as { error?: { message?: string } }).error?.message
          : undefined;

      return NextResponse.json(
        { error: providerError || "OpenRouter could not complete the request." },
        { status: openRouterResponse.status },
      );
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("OpenRouter request failed", error);
    return NextResponse.json(
      { error: "Unable to reach OpenRouter. Please try again." },
      { status: 502 },
    );
  }
}
