"use client";

import { FormEvent, KeyboardEvent, startTransition, useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

type Message = {
  role: Role;
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const STORAGE_KEY = "agentrix-conversations";
const models = [
  { value: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna", note: "OpenRouter" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini", note: "Fast and affordable" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", note: "Great for writing" },
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", note: "Quick reasoning" },
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function SparkleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><path d="m21.7 3.3-6.9 17.2a1 1 0 0 1-1.9-.1l-2.1-6.4-6.4-2.1a1 1 0 0 1-.1-1.9l17.2-6.9a.9.9 0 0 1 1.2 1.2ZM12.6 12l5.3-5.3-9.1 3.6 3.8 1.7Zm1.4 1.4-1.7 3.8 3.6-9.1-5.3 5.3 3.4 1.1Z" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4"><path d="M5 7h14M10 11v6m4-6v6M9 7V5h6v2m-9 0 1 13h10l1-13" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [input, setInput] = useState("");
  const [model, setModel] = useState(models[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) as Conversation[] : [];
      startTransition(() => {
        setConversations(Array.isArray(parsed) ? parsed : []);
        setActiveId(Array.isArray(parsed) ? parsed[0]?.id || "" : "");
        setIsHydrated(true);
      });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      startTransition(() => setIsHydrated(true));
    }
  }, []);

  useEffect(() => {
    if (isHydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, isHydrated]);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const messages = activeConversation?.messages || [];
  const selectedModel = models.find((item) => item.value === model) ?? models[0];

  function startNewChat() {
    setActiveId("");
    setInput("");
    setError("");
    textareaRef.current?.focus();
  }

  function deleteConversation(id: string) {
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    if (activeId === id) setActiveId("");
  }

  function updateConversation(id: string, update: (conversation: Conversation) => Conversation) {
    setConversations((current) => current.map((conversation) => conversation.id === id ? update(conversation) : conversation));
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    const userMessage: Message = { role: "user", content };
    const conversationId = activeId || newId();
    const currentMessages = activeConversation?.messages || [];
    const nextMessages = [...currentMessages, userMessage];
    const conversation: Conversation = {
      id: conversationId,
      title: activeConversation?.title || content.slice(0, 42),
      messages: nextMessages,
      updatedAt: Number(conversationId.split("-")[0]),
    };

    setConversations((current) => activeId ? current.map((item) => item.id === activeId ? conversation : item) : [conversation, ...current]);
    setActiveId(conversationId);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chats-backend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, model }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The assistant could not respond.");

      const assistantContent = data.choices?.[0]?.message?.content;
      if (typeof assistantContent !== "string" || !assistantContent) throw new Error("The assistant returned an empty response.");

      updateConversation(conversationId, (item) => ({
        ...item,
        messages: [...item.messages, { role: "assistant", content: assistantContent }],
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#182230]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] border-x border-[#e5e9f0] bg-white shadow-[0_24px_80px_rgba(25,45,75,0.08)]">
        <aside className="hidden w-[260px] shrink-0 flex-col bg-[#182538] px-4 py-5 text-white md:flex">
          <div className="flex items-center gap-2 px-2 text-[17px] font-semibold tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-[#8fe0c4] text-[#122b32]"><SparkleIcon /></span>agentrix</div>
          <button onClick={startNewChat} className="mt-10 flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10"><PlusIcon /> New conversation</button>
          <p className="mb-3 mt-9 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Chat history</p>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto text-sm text-white/60">
            {conversations.length === 0 && <p className="px-2 py-2 text-xs leading-5 text-white/35">Your conversations will show up here.</p>}
            {conversations.map((conversation) => (
              <div key={conversation.id} className={`group flex items-center rounded-lg ${conversation.id === activeId ? "bg-white/10 text-white" : "hover:bg-white/10"}`}>
                <button onClick={() => { setActiveId(conversation.id); setError(""); }} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left">{conversation.title}</button>
                <button onClick={() => deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`} className="mr-1 rounded p-1.5 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"><TrashIcon /></button>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-[#21334a] p-3.5 text-xs text-white/55"><div className="mb-2 flex items-center gap-2 text-white/85"><span className="size-2 rounded-full bg-[#8fe0c4]" /> API connected</div>Chats are saved in this browser only.</div>
        </aside>

        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="flex min-h-[76px] items-center justify-between border-b border-[#e9edf3] px-5 sm:px-8">
            <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-[#eaf8f3] text-[#258f78] md:hidden"><SparkleIcon /></div><div><p className="text-sm font-semibold">{activeConversation?.title || "New conversation"}</p><p className="text-xs text-[#8b98a9]">{activeConversation ? `${messages.length} message${messages.length === 1 ? "" : "s"}` : "Private workspace"}</p></div></div>
            <div className="flex items-center gap-2 sm:gap-3"><label htmlFor="model" className="hidden text-xs text-[#8b98a9] sm:block">Model</label><select id="model" value={model} onChange={(event) => setModel(event.target.value)} className="max-w-[145px] rounded-lg border border-[#e1e6ed] bg-white px-2.5 py-2 text-xs font-medium outline-none transition focus:border-[#54b99e] sm:max-w-none">{models.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button onClick={startNewChat} className="rounded-lg border border-[#e1e6ed] px-3 py-2 text-xs font-medium text-[#536173] transition hover:border-[#54b99e] hover:text-[#258f78]">New</button></div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-5 py-8 sm:px-8 sm:py-12">
              {!activeConversation && !isLoading ? <div className="my-auto py-10 text-center"><div className="mx-auto mb-5 grid size-16 place-items-center rounded-[22px] bg-[#eaf8f3] text-[#258f78]"><SparkleIcon /></div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#54b99e]">Your AI workspace</p><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#182230] sm:text-4xl">What can I help you make?</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#7d8999]">Ask a question, brainstorm an idea, or drop in a task. Your conversation will appear here.</p><div className="mx-auto mt-8 grid max-w-lg gap-2 text-left sm:grid-cols-2">{["Draft a project brief", "Explain a complex topic", "Brainstorm product names", "Review my writing"].map((prompt) => <button key={prompt} onClick={() => { setInput(prompt); textareaRef.current?.focus(); }} className="rounded-xl border border-[#e5e9f0] px-3.5 py-3 text-sm text-[#536173] transition hover:border-[#8dd8c3] hover:bg-[#f5fcf9] hover:text-[#258f78]">{prompt}</button>)}</div></div> : <div className="space-y-8">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex gap-3"}>{message.role === "assistant" && <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#eaf8f3] text-[#258f78]"><SparkleIcon /></div>}<div className={message.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-md bg-[#182538] px-4 py-3 text-sm leading-6 text-white" : "max-w-[85%] pt-1 text-sm leading-7 text-[#465366]"}>{message.content}</div></div>)}{isLoading && <div className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#eaf8f3] text-[#258f78]"><SparkleIcon /></div><div className="flex items-center gap-1 pt-3"><span className="size-1.5 animate-bounce rounded-full bg-[#54b99e]" /><span className="size-1.5 animate-bounce rounded-full bg-[#54b99e] [animation-delay:120ms]" /><span className="size-1.5 animate-bounce rounded-full bg-[#54b99e] [animation-delay:240ms]" /></div></div>}</div>}
            </div>
            <div className="mx-auto w-full max-w-3xl px-5 pb-5 sm:px-8 sm:pb-8">{error && <div className="mb-3 rounded-xl border border-[#f2c8c8] bg-[#fff7f7] px-3.5 py-3 text-xs leading-5 text-[#b65353]">{error}</div>}<form onSubmit={sendMessage} className="rounded-2xl border border-[#dce3eb] bg-white p-2 shadow-[0_10px_30px_rgba(37,61,92,0.08)] focus-within:border-[#8dd8c3] focus-within:ring-4 focus-within:ring-[#dff5ed]"><textarea ref={textareaRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} disabled={isLoading} rows={2} placeholder="Message your assistant..." className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-[#182230] outline-none placeholder:text-[#a5afbc] disabled:opacity-60" /><div className="flex items-center justify-between px-2 pb-1"><p className="text-[11px] text-[#a5afbc]">{selectedModel.note} · Enter to send</p><button type="submit" disabled={!input.trim() || isLoading} aria-label="Send message" className="grid size-9 place-items-center rounded-xl bg-[#258f78] text-white transition hover:bg-[#1e7965] disabled:cursor-not-allowed disabled:bg-[#dce8e4]"><SendIcon /></button></div></form><p className="mt-3 text-center text-[10px] text-[#a5afbc]">AI can make mistakes. Check important information.</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
