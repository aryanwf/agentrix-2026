"use client";

import { type FormEvent, type KeyboardEvent, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const starters = [
  "Help me plan a product roadmap",
  "Review this idea like a senior engineer",
  "Draft a clear answer for my team",
  "Debug a Next.js issue step by step",
];

function messageText(message: ReturnType<typeof useChat>["messages"][number]) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function ArrowUpIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 19V5m0 0-6 6m6-6 6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SquareIcon() {
  return <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-current" />;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error } = useChat();
  const isStreaming = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <main className="flex min-h-dvh bg-[#f7f7f5] text-zinc-950">
      <aside className="hidden w-72 shrink-0 border-r border-zinc-200/80 bg-[#f1f1ee] p-3 lg:flex lg:flex-col">
        <div className="mb-3 flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white">
            A
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Agentrix</p>
            <p className="mt-1 text-xs text-zinc-500">OpenRouter workspace</p>
          </div>
        </div>

        <Button
          className="mb-5 justify-start rounded-xl bg-white text-zinc-900 hover:bg-white"
          onClick={() => window.location.reload()}
          type="button"
          variant="outline"
        >
          New chat
        </Button>

        <div className="space-y-1 text-sm">
          <p className="px-3 pb-2 text-xs font-medium text-zinc-500">Today</p>
          {["Ideal chatbot build", "Avatar assistant notes", "Product polish pass"].map((item) => (
            <button
              className="w-full truncate rounded-xl px-3 py-2 text-left text-zinc-700 hover:bg-white"
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-auto rounded-2xl border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-500">
          Model and keys stay server-side. Set OPENROUTER_MODEL to switch providers.
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-[#f7f7f5]/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white lg:hidden">
              A
            </div>
            <div>
              <h1 className="text-sm font-semibold">Agentrix Chat</h1>
              <p className="text-xs text-zinc-500">AI SDK + OpenRouter</p>
            </div>
          </div>
          <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 shadow-sm">
            {isStreaming ? "Responding" : "Ready"}
          </div>
        </header>

        <ScrollArea className="flex-1 px-4">
          <div className="mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-3xl flex-col py-8 sm:py-12">
            {!hasMessages ? (
              <div className="m-auto w-full text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-xl font-semibold text-white shadow-sm">
                  A
                </div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  What are we building today?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
                  Ask for strategy, code, writing, debugging, or a second opinion.
                  Agentrix keeps answers practical and direct.
                </p>
                <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                  {starters.map((starter) => (
                    <button
                      className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
                      key={starter}
                      onClick={() => setInput(starter)}
                      type="button"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <article
                      className={cn("flex gap-4", isUser && "justify-end")}
                      key={message.id}
                    >
                      {!isUser ? (
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-xs font-semibold text-white">
                          A
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[86%] whitespace-pre-wrap text-[15px] leading-7 sm:max-w-[75%]",
                          isUser
                            ? "rounded-3xl bg-[#e9e9e4] px-5 py-3 text-zinc-900"
                            : "text-zinc-900",
                        )}
                      >
                        {messageText(message)}
                      </div>
                    </article>
                  );
                })}

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error.message}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 bg-gradient-to-t from-[#f7f7f5] via-[#f7f7f5] to-transparent px-4 pb-4 pt-8">
          <form className="mx-auto max-w-3xl" onSubmit={submit}>
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-2 shadow-[0_18px_50px_rgba(24,24,27,0.12)]">
              <Textarea
                aria-label="Message Agentrix"
                className="max-h-44 min-h-12"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message Agentrix"
                rows={1}
                value={input}
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1">
                <p className="text-xs text-zinc-400">Enter to send. Shift + Enter for a new line.</p>
                {isStreaming ? (
                  <Button aria-label="Stop response" onClick={stop} size="icon" type="button">
                    <SquareIcon />
                  </Button>
                ) : (
                  <Button aria-label="Send message" disabled={!input.trim()} size="icon" type="submit">
                    <ArrowUpIcon />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
