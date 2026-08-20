"use client";

import { type FormEvent, type KeyboardEvent, useState } from "react";
import { ArrowUp, Square, SquarePen } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const history = ["Sleep worries", "Grounding practice", "Anxiety check-in"];

// `/api/chat` is the session avatar's SSE endpoint; this page talks to the plain
// AI SDK stream instead.
const transport = new DefaultChatTransport({ api: "/api/chat/simple" });

function messageText(message: ReturnType<typeof useChat>["messages"][number]) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop, error } = useChat({ transport });
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
    <div className="flex h-dvh bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-white md:flex">
        <div className="p-3">
          <Button
            className="h-10 w-full justify-start gap-2 rounded-lg text-sm"
            onClick={() => window.location.reload()}
            type="button"
            variant="outline"
          >
            <SquarePen className="h-4 w-4" />
            New chat
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-foreground">
            History
          </p>
          <div className="space-y-1">
            {history.map((item) => (
              <button
                className="w-full truncate rounded-md px-3 py-2 text-left text-sm text-foreground/80 hover:bg-accent"
                key={item}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <span className="logo-mark sm" aria-hidden="true">
              <i /><i /><i />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">CURA</p>
              <p className="truncate text-[11px] text-muted-foreground">
                Therapist companion
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div aria-hidden="true" className="chat-backdrop pointer-events-none absolute inset-0" />
        <header className="relative flex h-12 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
          <div className="flex items-center gap-1.5">
            <span className="logo-mark sm" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span className="text-sm font-bold leading-none tracking-[-0.07em]">
              cura<span className="brand-dot">.</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="New chat"
              className="md:hidden"
              onClick={() => window.location.reload()}
              size="icon"
              type="button"
              variant="ghost"
            >
              <SquarePen className="h-4 w-4" />
            </Button>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isStreaming ? "bg-zinc-400 animate-pulse" : "bg-zinc-300",
                )}
              />
              {isStreaming ? "Responding" : "Ready"}
            </span>
          </div>
        </header>

        <ScrollArea className="relative min-h-0 flex-1">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 md:px-8">
            {!hasMessages ? (
              <div className="flex flex-col items-center gap-2 pt-10 text-center">
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary border border-border text-primary-foreground">
                  C
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  How are you feeling today?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Share what&rsquo;s on your mind. CURA will listen and help you
                  take a small step.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <article
                      className={cn(
                        "flex gap-3",
                        isUser ? "justify-end" : "justify-start",
                      )}
                      key={message.id}
                    >
                      {!isUser ? (
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary border border-border text-[10px] font-semibold text-primary-foreground">
                          C
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-7",
                          isUser
                            ? "bg-accent text-foreground"
                            : "bg-transparent text-foreground/90",
                        )}
                      >
                        {messageText(message)}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {error ? (
              <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error.message}
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <div className="relative shrink-0 px-3 pb-4 md:px-8">
          <form className="mx-auto max-w-4xl" onSubmit={submit}>
            <div className="flex items-end gap-2 rounded-3xl border border-input bg-white px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
              <Textarea
                aria-label="Message CURA"
                className="min-h-12 max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-base leading-7 shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message CURA"
                rows={1}
                value={input}
              />
              {isStreaming ? (
                <Button
                  aria-label="Stop"
                  className="h-10 w-10 shrink-0 rounded-full border border-input"
                  onClick={stop}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  aria-label="Send"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full bg-foreground text-background transition-opacity hover:bg-foreground/90",
                    !input.trim() && "pointer-events-none opacity-40",
                  )}
                  size="icon"
                  type="submit"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              CURA offers support and coping skills, not professional care.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}