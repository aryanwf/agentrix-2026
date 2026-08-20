import type { ChatEvent, ChatRequest } from "./types";

export class ChatError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ChatError";
  }
}

/**
 * Consumes the /api/chat SSE stream.
 *
 * Uses `fetch` rather than `EventSource` because the endpoint is a POST with a JSON body, and
 * because we need an `AbortController` to cancel a turn the moment the user starts a new one.
 */
export async function streamChat(
  body: ChatRequest,
  opts: { onEvent: (event: ChatEvent) => void; signal?: AbortSignal },
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    throw new ChatError(detail?.error ?? `Chat failed (${res.status})`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);

        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data:")) continue;

        try {
          opts.onEvent(JSON.parse(line.slice(5).trim()) as ChatEvent);
        } catch {
          /* a truncated frame is not worth killing the turn over */
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
