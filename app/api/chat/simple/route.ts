import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const maxDuration = 30;

const DEFAULT_MODEL = "openai/gpt-4o-mini";

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
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

  if (!Array.isArray(body.messages)) {
    return json({ error: "Missing messages." }, 400);
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
    system:
      "You are CURA, a warm, grounded therapy companion. You are not a licensed clinician and do not diagnose, but you help users reflect, name emotions, slow down, and choose small next steps. Use supportive, plain language; ask one gentle question at a time when helpful; suggest evidence-informed practices like breathing, journaling, grounding, reframing, and reaching out to trusted people. If the user mentions self-harm, suicide, abuse, immediate danger, or a medical emergency, encourage contacting local emergency services or a crisis hotline right away and staying with a trusted person.",
    messages: convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse();
}
