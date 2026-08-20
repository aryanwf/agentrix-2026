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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white md:flex">
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
          <p className="px-2 pb-1.5 text-[11px] font-medium text-muted-foreground">
            History
          </p>
          <div className="space-y-0.5">
            {history.map((item) => (
              <button
                className="w-full truncate rounded-md px-2 py-1.5 text-left text-[13px] text-foreground/80 hover:bg-accent"
                key={item}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-2">
          <div className="flex items-center gap-2 rounded-md bg-secondary px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary border border-border text-primary-foreground">
              C
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">CURA</p>
              <p className="text-[10px] text-muted-foreground">
                Therapist companion
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary border border-border text-primary-foreground">
              C
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">CURA</h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Your AI therapist
              </p>
            </div>
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

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-6 md:px-6">
            {!hasMessages ? (
              <div className="flex flex-1 flex-col items-center justify-start gap-2 pt-8 text-center">
                <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary border border-border text-primary-foreground">
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
              <div className="flex flex-col gap-4">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <article
                      className={cn("flex gap-3", isUser && "justify-start")}
                      key={message.id}
                    >
                      {!isUser ? (
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary border border-border text-primary-foreground">
                          C
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[85%] text-sm leading-6",
                          isUser ? "text-foreground" : "text-foreground/90",
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

        <div className="shrink-0 px-3 pb-4 md:px-6">
          <form className="mx-auto max-w-2xl" onSubmit={submit}>
            <div className="flex items-end gap-2">
              <Textarea
                aria-label="Message CURA"
                className="min-h-12 max-h-32 flex-1 rounded-[28px] bg-white px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message CURA"
                rows={1}
                value={input}
              />
              {isStreaming ? (
                <Button
                  aria-label="Stop"
                  className="h-12 w-12 shrink-0 rounded-full border border-input"
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
                    "h-12 w-12 shrink-0 rounded-full border border-input transition-opacity",
                    !input.trim() && "pointer-events-none opacity-0",
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