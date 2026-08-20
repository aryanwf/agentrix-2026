"use client";

import { type FormEvent, type KeyboardEvent, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
    <main className="flex h-dvh flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground">
            C
          </div>
          <span className="text-xs font-medium">CURA</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {isStreaming ? "Responding" : "Ready"}
        </span>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
          {messages.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              How are you feeling today?
            </p>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <article
                className={cn("flex items-start gap-2", isUser && "justify-end")}
                key={message.id}
              >
                {!isUser ? (
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-[9px] font-semibold text-primary-foreground">
                    C
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[85%] text-sm leading-6",
                    isUser
                      ? "rounded-lg bg-secondary px-3 py-1.5 text-secondary-foreground"
                      : "text-foreground",
                  )}
                >
                  {messageText(message)}
                </div>
              </article>
            );
          })}

          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error.message}
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t px-3 py-3 sm:px-4">
        <form
          className="mx-auto flex w-full max-w-2xl items-center gap-2"
          onSubmit={submit}
        >
          <Textarea
            aria-label="Message CURA"
            className="min-h-9 max-h-24 flex-1"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message CURA"
            rows={1}
            value={input}
          />
          {isStreaming ? (
            <Button
              aria-label="Stop"
              className="shrink-0"
              onClick={stop}
              size="icon"
              type="button"
              variant="secondary"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              aria-label="Send"
              className="shrink-0"
              disabled={!input.trim()}
              size="icon"
              type="submit"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </form>
        <p className="mx-auto mt-2 w-full max-w-2xl text-center text-[10px] text-muted-foreground">
          CURA offers support and coping skills, not professional care.
        </p>
      </div>
    </main>
  );
}
