"use client";

import { type FormEvent, useState } from "react";
import { useChat } from "@ai-sdk/react";

function messageText(message: ReturnType<typeof useChat>["messages"][number]) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error } = useChat();
  const isStreaming = status === "submitted" || status === "streaming";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="min-h-dvh bg-[#0d1117] text-zinc-100">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 sm:p-7">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.35em] text-cyan-300">
            OpenRouter Chat
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                Agentrix
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                A focused AI SDK chatbot powered by OpenRouter. Bring questions,
                drafts, and implementation details.
              </p>
            </div>
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              {isStreaming ? "Thinking" : "Ready"}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/70 shadow-2xl shadow-black/50">
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {["Plan a feature", "Debug an error", "Write a concise brief"].map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                    onClick={() => setInput(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <article
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-5 py-4 text-sm leading-6 sm:max-w-[70%] sm:text-base ${
                      isUser
                        ? "bg-cyan-300 text-zinc-950"
                        : "border border-white/10 bg-white/[0.05] text-zinc-100"
                    }`}
                  >
                    {messageText(message)}
                  </div>
                </article>
              );
            })}

            {error ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
                {error.message}
              </div>
            ) : null}
          </div>

          <form className="border-t border-white/10 p-3 sm:p-4" onSubmit={submit}>
            <div className="flex gap-3 rounded-full border border-white/10 bg-white/[0.04] p-2">
              <input
                aria-label="Message"
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-zinc-500 sm:text-base"
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask Agentrix anything..."
                value={input}
              />
              {isStreaming ? (
                <button
                  className="rounded-full bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white"
                  onClick={stop}
                  type="button"
                >
                  Stop
                </button>
              ) : (
                <button
                  className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!input.trim()}
                  type="submit"
                >
                  Send
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
