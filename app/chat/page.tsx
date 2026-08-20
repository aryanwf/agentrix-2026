"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

// `/api/chat` is the session avatar's SSE endpoint; this page talks to the plain
// AI SDK UI-message stream at `/api/chat/simple` instead.
export default function ChatPage() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat/simple" }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-dvh flex-col bg-background text-foreground">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          <span className="logo-mark sm" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="text-sm font-bold leading-none tracking-[-0.07em]">
            cura<span className="brand-dot">.</span>
          </span>
        </header>

        <main className="min-h-0 flex-1">
          <Thread />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}
