"use client";

import Link from "next/link";
import { Caveat } from "next/font/google";
import { useEffect, useState } from "react";

const handwriting = Caveat({
  subsets: ["latin"],
  variable: "--font-handwriting",
});

const prompts = [
  "What did today ask of me?",
  "Where did I feel most like myself?",
  "What can I leave on this page?",
];

const moods = ["calm", "heavy", "steady", "hopeful"];

type SavedEntry = {
  mood?: string;
  morning_note?: string;
  prompt?: string;
  entry?: string;
};

function Logo() {
  return <span className="notebook-logo" aria-hidden="true">c.</span>;
}

function getDeviceId() {
  const storageKey = "cura-journal-device-id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);
  return created;
}

export default function JournalClient() {
  const [deviceId, setDeviceId] = useState("");
  const [mood, setMood] = useState("steady");
  const [morningNote, setMorningNote] = useState("I want to move through today with more patience than pressure.");
  const [prompt, setPrompt] = useState(prompts[2]);
  const [entry, setEntry] = useState("Today I noticed...");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEntry() {
      const id = getDeviceId();
      setDeviceId(id);
      setStatus("loading");

      try {
        const response = await fetch(`/api/journal?deviceId=${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error("Could not load journal entry.");
        const { entry: savedEntry } = (await response.json()) as { entry: SavedEntry | null };

        if (savedEntry) {
          setMood(savedEntry.mood || "steady");
          setMorningNote(savedEntry.morning_note || "");
          setPrompt(savedEntry.prompt || prompts[2]);
          setEntry(savedEntry.entry || "");
        }
        setStatus("idle");
      } catch {
        setStatus("idle");
      }
    }

    void loadEntry();
  }, []);

  async function saveEntry() {
    setStatus("saving");
    setError("");

    const response = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, mood, morningNote, prompt, entry }),
    });

    if (!response.ok) {
      setStatus("error");
      setError("Could not save this page. Check Supabase settings and try again.");
      return;
    }

    setStatus("saved");
  }

  return (
    <main className={`journal-desk ${handwriting.variable}`}>
      <header className="desk-header">
        <Link className="desk-brand" href="/" aria-label="Back to Cura home"><Logo /><span>Cura Journal</span></Link>
        <div className="desk-date"><span>{status === "loading" ? "Loading notebook" : "Private notebook"}</span><strong>Aug 20</strong></div>
      </header>

      <section className="journal-board" aria-label="Journal notebook workspace">
        <aside className="left-notes">
          <div className="paper-clip" aria-hidden="true" />
          <p className="side-label">Today&apos;s page</p>
          <h1>A quiet place to write what you could not say out loud.</h1>
          <p className="side-copy">Choose a mood, pick a prompt, write freely, then save the page to your Supabase journal.</p>
          <button className="start-writing" type="button" onClick={saveEntry} disabled={!deviceId || status === "saving"}>{status === "saving" ? "Saving..." : "Save today's entry"} <span>↘</span></button>
          {error && <p className="save-error">{error}</p>}
        </aside>

        <div className="open-journal">
          <div className="journal-spine" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>

          <article className="journal-page-sheet page-left">
            <div className="page-tab">Mood</div>
            <div className="page-header"><span>Morning notes</span><span>01</span></div>
            <h2>Before the day gets too loud...</h2>
            <div className="mood-stamps" aria-label="Mood options">
              {moods.map((moodName) => <button className={mood === moodName ? "selected" : ""} type="button" key={moodName} onClick={() => setMood(moodName)}>{moodName}</button>)}
            </div>
            <textarea className="lined-note editable-note" aria-label="Morning note" value={morningNote} onChange={(event) => setMorningNote(event.target.value)} />
            <div className="tiny-note">A sentence is enough.</div>
          </article>

          <article className="journal-page-sheet page-right" id="entry">
            <div className="page-tab tab-coral">Write</div>
            <div className="page-header"><span>Daily reflection</span><span>02</span></div>
            <p className="prompt-label">Prompt</p>
            <h2>{prompt}</h2>
            <textarea className="entry-area" aria-label="Journal entry" value={entry} onChange={(event) => setEntry(event.target.value)} />
            <button className="save-entry" type="button" onClick={saveEntry} disabled={!deviceId || status === "saving"}>{status === "saved" ? "Saved" : status === "saving" ? "Saving" : "Save this page"} <span>{status === "saved" ? "✓" : "↗"}</span></button>
          </article>
        </div>

        <aside className="prompt-stack" aria-label="Journal prompts">
          <p className="side-label">Prompt cards</p>
          {prompts.map((promptText, index) => (
            <button className={`prompt-card ${prompt === promptText ? "active" : ""}`} type="button" key={promptText} onClick={() => setPrompt(promptText)}><span>{String(index + 1).padStart(2, "0")}</span><p>{promptText}</p></button>
          ))}
        </aside>
      </section>
    </main>
  );
}
