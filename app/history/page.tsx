"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Conversation = { id: string; title: string; updated_at: string };
type JournalEntry = { id: string; entry: string; created_at: string; mood: string };

export default function HistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/conversations").then((response) => response.json()),
      fetch("/api/journal").then((response) => response.json()),
    ]).then(([chat, journal]) => {
      setConversations(chat.conversations ?? []);
      setEntries(journal.entries ?? []);
    });
  }, []);

  return <main className="history-page">
    <header className="history-header"><Link href="/" className="auth-brand"><span className="logo-mark sm"><i /><i /><i /></span>cura<span className="brand-dot">.</span></Link><Link href="/chat" className="auth-login">New chat</Link></header>
    <section className="history-content"><span className="auth-eyebrow">Your account</span><h1>What you have made space for.</h1><div className="history-grid"><section><h2>Conversations</h2>{conversations.length ? conversations.map((conversation) => <article className="history-item" key={conversation.id}><span>{new Date(conversation.updated_at).toLocaleDateString()}</span><strong>{conversation.title}</strong><Link href="/chat">Open chat ↗</Link></article>) : <p className="history-empty">Your conversations will appear here after you sign in and chat with Cura.</p>}</section><section><h2>Journal pages</h2>{entries.length ? entries.map((entry) => <article className="history-item" key={entry.id}><span>{new Date(entry.created_at).toLocaleDateString()} · {entry.mood}</span><strong>{entry.entry || "Untitled page"}</strong><Link href="/journal">Open journal ↗</Link></article>) : <p className="history-empty">Your saved journal pages will appear here.</p>}</section></div></section>
  </main>;
}
