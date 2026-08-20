export const API_BASE_URL = "https://openrouter.ai/api/v1";
const API_URL = `${API_BASE_URL}/chat/completions`;
export const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";
export const DEFAULT_FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct";
export const DEFAULT_GUARD_MODEL = "google/gemini-2.5-flash-lite";
export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};
export type Usage = {
    prompt: number;
    completion: number;
};
export class OpenRouterError extends Error {
    constructor(message: string, readonly status?: number, readonly detail?: string) {
        super(message);
        this.name = "OpenRouterError";
    }
}
export function chatModels(): string[] {
    const chain = [
        process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        process.env.OPENROUTER_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL,
    ];
    return [...new Set(chain.filter(Boolean))];
}
export function guardModel(): string {
    return process.env.OPENROUTER_GUARD_MODEL || DEFAULT_GUARD_MODEL;
}
export function attributionHeaders(): Record<string, string> {
    const h: Record<string, string> = { "x-title": process.env.OPENROUTER_SITE_NAME || "Cura" };
    const referer = process.env.OPENROUTER_SITE_URL;
    if (referer)
        h["http-referer"] = referer;
    return h;
}
function headers(apiKey: string): HeadersInit {
    return {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...attributionHeaders(),
    };
}
export function requireKey(): string {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key)
        throw new OpenRouterError("OPENROUTER_API_KEY is not configured on the server.", 501);
    return key;
}
export type StreamOptions = {
    messages: ChatMessage[];
    models?: string[];
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
    firstTokenTimeoutMs?: number;
    totalTimeoutMs?: number;
    onAttempt?: (model: string, index: number) => void;
};
export type StreamSink = {
    usage?: Usage;
    model?: string;
};
export async function* streamChat(opts: StreamOptions, sink: StreamSink = {}): AsyncGenerator<string, void, void> {
    const apiKey = requireKey();
    const models = opts.models?.length ? opts.models : chatModels();
    let lastError: unknown;
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        let emitted = false;
        opts.onAttempt?.(model, i);
        try {
            for await (const chunk of streamOne(apiKey, model, opts, sink)) {
                emitted = true;
                yield chunk;
            }
            sink.model = model;
            return;
        }
        catch (err) {
            if (emitted)
                throw err;
            if (opts.signal?.aborted)
                throw err;
            lastError = err;
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new OpenRouterError("All chat models failed.", 502);
}
async function* streamOne(apiKey: string, model: string, opts: StreamOptions, sink: StreamSink): AsyncGenerator<string, void, void> {
    const { messages, maxTokens = 300, temperature = 0.8, firstTokenTimeoutMs = 8000, totalTimeoutMs = 25000, } = opts;
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    opts.signal?.addEventListener("abort", onExternalAbort, { once: true });
    let timedOut: "first-token" | "total" | null = null;
    const totalTimer = setTimeout(() => {
        timedOut = "total";
        controller.abort();
    }, totalTimeoutMs);
    let firstTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        timedOut = "first-token";
        controller.abort();
    }, firstTokenTimeoutMs);
    const clearFirstTimer = () => {
        if (firstTimer) {
            clearTimeout(firstTimer);
            firstTimer = null;
        }
    };
    try {
        let res: Response;
        try {
            res = await fetch(API_URL, {
                method: "POST",
                headers: headers(apiKey),
                body: JSON.stringify({
                    model,
                    messages,
                    stream: true,
                    max_tokens: maxTokens,
                    temperature,
                    reasoning: { enabled: false },
                    usage: { include: true },
                }),
                signal: controller.signal,
            });
        }
        catch (err) {
            throw wrapAbort(err, model, timedOut);
        }
        if (!res.ok || !res.body) {
            const detail = await res.text().catch(() => "");
            throw new OpenRouterError(`${model} returned ${res.status}`, res.status, detail.slice(0, 500));
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            for (;;) {
                let read: ReadableStreamReadResult<Uint8Array>;
                try {
                    read = await reader.read();
                }
                catch (err) {
                    throw wrapAbort(err, model, timedOut);
                }
                if (read.done)
                    break;
                buffer += decoder.decode(read.value, { stream: true });
                let nl: number;
                while ((nl = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, nl).trim();
                    buffer = buffer.slice(nl + 1);
                    if (!line || line.startsWith(":"))
                        continue;
                    if (!line.startsWith("data:"))
                        continue;
                    const payload = line.slice(5).trim();
                    if (payload === "[DONE]")
                        return;
                    let event: OpenRouterChunk;
                    try {
                        event = JSON.parse(payload);
                    }
                    catch {
                        continue;
                    }
                    if (event.error) {
                        throw new OpenRouterError(event.error.message || `${model} streamed an error`, event.error.code);
                    }
                    if (event.usage) {
                        sink.usage = {
                            prompt: event.usage.prompt_tokens ?? 0,
                            completion: event.usage.completion_tokens ?? 0,
                        };
                    }
                    const content = event.choices?.[0]?.delta?.content;
                    if (content) {
                        clearFirstTimer();
                        yield content;
                    }
                }
            }
        }
        finally {
            await reader.cancel().catch(() => { });
        }
    }
    finally {
        clearFirstTimer();
        clearTimeout(totalTimer);
        opts.signal?.removeEventListener("abort", onExternalAbort);
    }
}
function wrapAbort(err: unknown, model: string, timedOut: "first-token" | "total" | null): unknown {
    if (timedOut === "first-token") {
        return new OpenRouterError(`${model} produced no content within the first-token budget.`, 504);
    }
    if (timedOut === "total") {
        return new OpenRouterError(`${model} exceeded the total response budget.`, 504);
    }
    return err;
}
export async function complete(opts: {
    messages: ChatMessage[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
}): Promise<string> {
    const apiKey = requireKey();
    const { messages, model = guardModel(), maxTokens = 120, temperature = 0, timeoutMs = 6000 } = opts;
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    opts.signal?.addEventListener("abort", onExternalAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: headers(apiKey),
            body: JSON.stringify({
                model,
                messages,
                max_tokens: maxTokens,
                temperature,
                reasoning: { enabled: false },
            }),
            signal: controller.signal,
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            throw new OpenRouterError(`${model} returned ${res.status}`, res.status, detail.slice(0, 500));
        }
        const data = (await res.json()) as OpenRouterChunk;
        return data.choices?.[0]?.message?.content ?? "";
    }
    finally {
        clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onExternalAbort);
    }
}
type OpenRouterChunk = {
    choices?: {
        delta?: {
            content?: string | null;
            reasoning?: string | null;
        };
        message?: {
            content?: string | null;
        };
    }[];
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
    };
    error?: {
        message?: string;
        code?: number;
    };
};
