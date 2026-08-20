import { gateUserTurn } from "@/lib/chat/gate";
import { allow, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import { MAX_MESSAGES, MAX_MESSAGE_CHARS, type ChatEvent, type ChatRequest, } from "@/lib/chat/types";
import { OpenRouterError, streamChat, type ChatMessage, type StreamSink } from "@/lib/openrouter";
import { COMPANION_SYSTEM_PROMPT, SignalExtractor, sanitizeForSpeech } from "@/lib/prompts";
import { FALLBACK_REPLY } from "@/lib/resources";
import { SentenceSplitter } from "@/lib/sentences";
import { log, quote, since } from "@/lib/log";
export const runtime = "nodejs";
export const maxDuration = 30;
const encoder = new TextEncoder();
export async function POST(req: Request) {
    if (!allow(req, { scope: "chat", limit: 20 })) {
        return Response.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 });
    }
    let body: ChatRequest;
    try {
        body = await req.json();
    }
    catch {
        return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const messages = normalizeMessages(body.messages);
    if (!messages.length) {
        return Response.json({ error: "Missing messages." }, { status: 400 });
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) {
        return Response.json({ error: "The last turn must be from the user." }, { status: 400 });
    }
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let closed = false;
            const send = (event: ChatEvent) => {
                if (closed)
                    return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                }
                catch {
                    closed = true;
                }
            };
            try {
                await run({ messages, userText: lastUser.content, signal: req.signal, send });
            }
            catch (err) {
                send({ type: "error", message: (err as Error).message });
            }
            finally {
                closed = true;
                try {
                    controller.close();
                }
                catch {
                }
            }
        },
    });
    return new Response(stream, {
        headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-store, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
        },
    });
}
type RunContext = {
    messages: ChatMessage[];
    userText: string;
    signal: AbortSignal;
    send: (event: ChatEvent) => void;
};
async function run({ messages, userText, signal, send }: RunContext): Promise<void> {
    const started = performance.now();
    log("turn", quote(userText), `${messages.length} turns in context`);
    const gate = gateUserTurn(userText);
    send({ type: "risk", tier: gate.tier, source: "lexicon" });
    log("chat", `risk ${gate.tier}`, `gate ${gate.kind}`, since(started));
    if (gate.kind !== "model") {
        if (gate.kind === "crisis")
            send({ type: "mood", value: "neutral" });
        gate.texts.forEach((text, index) => send({ type: "sentence", index, text }));
        send({ type: "done" });
        log("chat", `answered from ${gate.kind} script`, `${gate.texts.length} sentences`, since(started));
        return;
    }
    const extractor = new SignalExtractor();
    const splitter = new SentenceSplitter();
    const sink: StreamSink = {};
    let index = 0;
    let sentMood = false;
    let sentSuggest = false;
    const emitSentences = (texts: string[]) => {
        for (const raw of texts) {
            const text = sanitizeForSpeech(raw);
            if (text) {
                // The first sentence is the number that matters on stage: it is when the user
                // starts *hearing* an answer, not when the model finishes writing one.
                log("say", `#${index}`, quote(text), index === 0 ? `first sentence ${since(started)}` : since(started));
                send({ type: "sentence", index: index++, text });
            }
        }
    };
    const emitSignals = () => {
        const { mood, suggest } = extractor.signals;
        if (mood && !sentMood) {
            sentMood = true;
            send({ type: "mood", value: mood });
            log("chat", `mood ${mood}`);
        }
        if (suggest && !sentSuggest) {
            sentSuggest = true;
            send({ type: "suggest", action: suggest });
            log("chat", `suggest ${suggest}`);
        }
    };
    try {
        const upstream = streamChat({
            messages: [{ role: "system", content: COMPANION_SYSTEM_PROMPT }, ...messages],
            signal,
            maxTokens: 300,
        }, sink);
        for await (const chunk of upstream) {
            emitSentences(splitter.push(extractor.push(chunk)));
            emitSignals();
        }
        emitSentences(splitter.push(extractor.flush()));
        emitSentences(splitter.flush());
        emitSignals();
    }
    catch (err) {
        if (signal.aborted) {
            log("warn", "client aborted the turn", `${index} sentences delivered`, since(started));
            return;
        }
        const message = err instanceof OpenRouterError ? err.message : ((err as Error).message ?? "chat failed");
        send({ type: "error", message });
        log("warn", message, index === 0 ? "using fallback reply" : "mid-stream");
        if (index === 0)
            emitSentences(FALLBACK_REPLY);
    }
    send({ type: "done", usage: sink.usage, model: sink.model });
    log("chat", "done", `${index} sentences`, sink.model, sink.usage ? `${sink.usage.total_tokens} tok` : null, since(started));
}
function normalizeMessages(input: ChatRequest["messages"]): ChatMessage[] {
    if (!Array.isArray(input))
        return [];
    return input
        .filter((m): m is {
        role: "user" | "assistant";
        content: string;
    } => !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0)
        .slice(-MAX_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }));
}
