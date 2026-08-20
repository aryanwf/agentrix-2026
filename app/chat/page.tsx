"use client";

import { type FormEvent, type KeyboardEvent, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const starters = [
  "I feel anxious and need to slow down",
  "Help me process a difficult conversation",
  "Guide me through a quick grounding exercise",
  "I want to journal about what I am feeling",
];

const recentChats = ["Anxiety check-in", "Grounding practice", "Sleep worries"];

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
    <main className="flex min-h-dvh bg-zinc-50 text-black dark:bg-black dark:text-zinc-50">
      <aside className="hidden w-72 shrink-0 border-r border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-black lg:flex lg:flex-col">
        <div className="mb-3 flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background">
            C
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">CURA</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Therapy companion</p>
          </div>
        </div>

        <Button
          className="mb-5 justify-start rounded-xl border-black/[.08] bg-white text-zinc-950 hover:bg-black/[.04] dark:border-white/[.145] dark:bg-black dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          onClick={() => window.location.reload()}
          type="button"
          variant="outline"
        >
          New check-in
        </Button>

        <div className="space-y-1 text-sm">
          <p className="px-3 pb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Today</p>
          {recentChats.map((item) => (
            <button
              className="w-full truncate rounded-xl px-3 py-2 text-left text-zinc-700 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-[#1a1a1a]"
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-auto rounded-2xl border border-black/[.08] bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 dark:border-white/[.145] dark:bg-[#1a1a1a] dark:text-zinc-400">
          CURA can support reflection and coping skills, but it is not a replacement for professional care.
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-black/[.08] bg-zinc-50/90 px-4 backdrop-blur dark:border-white/[.145] dark:bg-black/90 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background lg:hidden">
              C
            </div>
            <div>
              <h1 className="text-sm font-semibold">CURA</h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">A gentle space to check in</p>
            </div>
          </div>
          <div className="rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs text-zinc-600 shadow-sm dark:border-white/[.145] dark:bg-black dark:text-zinc-400">
            {isStreaming ? "Responding" : "Ready"}
          </div>
        </header>

        <ScrollArea className="flex-1 px-4">
          <div className="mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-3xl flex-col py-8 sm:py-12">
            {!hasMessages ? (
              <div className="m-auto w-full text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-xl font-semibold text-background shadow-sm">
                  C
                </div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  How are you feeling today?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
                  CURA helps you pause, reflect, and choose a small next step.
                  Share what is on your mind in your own words.
                </p>
                <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                  {starters.map((starter) => (
                    <button
                      className="rounded-2xl border border-black/[.08] bg-white p-4 text-sm text-zinc-700 shadow-sm transition hover:bg-black/[.04] dark:border-white/[.145] dark:bg-black dark:text-zinc-400 dark:hover:bg-[#1a1a1a]"
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
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-xs font-semibold text-background">
                          C
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[86%] whitespace-pre-wrap text-[15px] leading-7 sm:max-w-[75%]",
                          isUser
                            ? "rounded-3xl bg-black/[.04] px-5 py-3 text-black dark:bg-white/[.08] dark:text-zinc-50"
                            : "text-black dark:text-zinc-50",
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

        <div className="sticky bottom-0 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent px-4 pb-4 pt-8 dark:from-black dark:via-black">
          <form className="mx-auto max-w-3xl" onSubmit={submit}>
            <div className="rounded-[1.75rem] border border-black/[.08] bg-white p-2 shadow-[0_18px_50px_rgba(24,24,27,0.12)] dark:border-white/[.145] dark:bg-black">
              <Textarea
                aria-label="Message CURA"
                className="max-h-44 min-h-12 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message CURA"
                rows={1}
                value={input}
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  If you are in immediate danger, contact local emergency services now.
                </p>
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
