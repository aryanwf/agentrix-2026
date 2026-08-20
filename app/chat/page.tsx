"use client";

import Link from "next/link";
import { ArrowLeft, Menu, MessageSquare, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { createClient } from "@/lib/supabase/client";

// `/api/chat` is the session avatar's SSE endpoint; this page talks to the plain
// AI SDK UI-message stream at `/api/chat/simple` instead.
export default function ChatPage() {
  const conversationId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState("");

  async function ensureConversation() {
    if (conversationId.current) return conversationId.current;
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
    } catch {
      return null;
    }

    const id = crypto.randomUUID();
    conversationId.current = id;
    setActiveId(id);
    setConversations((items) => [{ id, title: "New chat", updated_at: new Date().toISOString() }, ...items]);
    return id;
  }

  const runtime = useChatRuntime({
    transport: useMemo(() => new AssistantChatTransport({
      api: "/api/chat/simple",
      prepareSendMessagesRequest: async ({ messages, ...options }) => ({
        ...options,
        body: { messages, conversationId: await ensureConversation() },
      }),
    }), []),
  });

  useEffect(() => {
    async function loadConversations() {
      const response = await fetch("/api/conversations");
      if (!response.ok) return;
      const result = (await response.json()) as { conversations?: { id: string; title: string; updated_at: string; messages?: unknown[] }[] };
      const items = result.conversations ?? [];
      setConversations(items.map((conversation) => ({ id: conversation.id, title: conversation.title, updated_at: conversation.updated_at })));
      const firstWithMessages = items.find((conversation) => getStoredMessageCount(conversation.messages) > 0);
      if (firstWithMessages) await openConversation(firstWithMessages.id);
      else if (items[0]) await openConversation(items[0].id);
      else conversationId.current = null;
    }
    void loadConversations();
  // The runtime is stable for the lifetime of this page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConversation(id: string) {
    setLoadingId(id);
    setHistoryError("");
    try {
      const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as { error?: string; conversation?: { id: string; messages?: unknown[] } };
      if (!response.ok || !result.conversation) throw new Error(result.error || "Could not load this conversation.");
      conversationId.current = id;
      setActiveId(id);
      const storedMessages = result.conversation.messages ?? [];
      const externalState = Array.isArray(storedMessages)
        ? { messages: storedMessages.map((message, index, all) => ({ parentId: index > 0 ? getMessageId(all[index - 1]) : null, message })) }
        : storedMessages;
      runtime.thread.importExternalState(externalState);
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "Could not load this conversation.");
    } finally {
      setLoadingId(null);
    }
  }

  async function newConversation() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    conversationId.current = null;
    setActiveId(null);
    runtime.thread.reset();
  }

  useEffect(() => {
    const unsubscribe = runtime.thread.subscribe(() => {
      const id = conversationId.current;
      if (!id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void fetch(`/api/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: runtime.thread.exportExternalState() }),
        }).then(async (response) => {
          if (!response.ok) return;
          const result = (await response.json()) as { conversation?: { id: string; title: string; updated_at: string } };
          if (!result.conversation) return;
          setConversations((items) => [result.conversation!, ...items.filter((item) => item.id !== id)]);
        });
      }, 600);
    });
    return () => {
      unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <div className="chat-backdrop" aria-hidden="true" />
        <header className="chat-header relative z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6">
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
          <span className="text-base font-bold leading-none tracking-[-0.07em]">
            cura<span className="brand-dot">.</span>
          </span>
          <button type="button" className="chat-sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle chat history">
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1">
          {sidebarOpen && <aside className="chat-sidebar"><div className="chat-sidebar-heading"><span>Past chats</span><button type="button" onClick={newConversation} aria-label="New chat"><Plus className="h-4 w-4" /></button></div>{historyError && <p className="chat-history-error" role="alert">{historyError}</p>}<div className="chat-history-list">{conversations.map((conversation) => <button type="button" disabled={loadingId !== null} className={`chat-history-item ${conversation.id === activeId ? "active" : ""}`} key={conversation.id} onClick={() => void openConversation(conversation.id)}><MessageSquare className="h-4 w-4" /><span>{loadingId === conversation.id ? "Loading..." : conversation.title}</span></button>)}</div>{conversations.length === 0 && <p className="chat-history-empty">Your saved chats will appear here.</p>}</aside>}
          <main className="relative min-h-0 min-w-0 flex-1">
          <Thread />
          </main>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

function getStoredMessageCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object" && "messages" in value && Array.isArray(value.messages)) return value.messages.length;
  return 0;
}

function getMessageId(value: unknown): string | null {
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}
