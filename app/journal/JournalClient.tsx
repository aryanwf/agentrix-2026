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
    id?: string;
    created_at?: string;
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
    if (existing)
        return existing;
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
    const [entries, setEntries] = useState<SavedEntry[]>([]);
    const [ready, setReady] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<SavedEntry | null>(null);
    const [deletingId, setDeletingId] = useState("");
    useEffect(() => {
        async function loadEntry() {
            const id = getDeviceId();
            setDeviceId(id);
            setStatus("loading");
            try {
                const response = await fetch(`/api/journal?deviceId=${encodeURIComponent(id)}`);
                if (!response.ok)
                    throw new Error("Could not load journal entry.");
                const result = (await response.json()) as {
                    entry?: SavedEntry | null;
                    entries?: SavedEntry[];
                };
                setEntries(result.entries ?? []);
                setReady(true);
                setStatus("idle");
            }
            catch {
                setReady(true);
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
        const result = (await response.json()) as {
            entry?: SavedEntry;
        };
        if (result.entry)
            setEntries((current) => [result.entry!, ...current]);
        setMood("steady");
        setMorningNote("I want to move through today with more patience than pressure.");
        setPrompt(prompts[2]);
        setEntry("Today I noticed...");
        setStatus("idle");
    }
    function openEntry(savedEntry: SavedEntry) {
        setMood(savedEntry.mood || "steady");
        setMorningNote(savedEntry.morning_note || "");
        setPrompt(savedEntry.prompt || prompts[2]);
        setEntry(savedEntry.entry || "");
        setStatus("idle");
    }
    async function deleteEntry() {
        if (!deleteTarget?.id) return;
        setDeletingId(deleteTarget.id);
        const response = await fetch(`/api/journal?id=${encodeURIComponent(deleteTarget.id)}&deviceId=${encodeURIComponent(deviceId)}`, { method: "DELETE" });
        if (response.ok) {
            setEntries((current) => current.filter((savedEntry) => savedEntry.id !== deleteTarget.id));
            setDeleteTarget(null);
        }
        else setError("Could not delete this page. Please try again.");
        setDeletingId("");
    }
    return (<main className={`journal-desk ${handwriting.variable}`}>
      <header className="desk-header">
        <Link className="desk-brand" href="/" aria-label="Back to Cura home"><Logo /><span>Cura Journal</span></Link>
        <div className="desk-date"><span>{status === "loading" ? "Loading notebook" : "Private notebook"}</span><strong>Aug 20</strong></div>
      </header>

      <section className="journal-board" aria-label="Journal notebook workspace">
        <aside className="left-notes">
          <div className="paper-clip" aria-hidden="true"/>
          <p className="side-label">Today&apos;s page</p>
          <h1>A quiet place to write what you could not say out loud.</h1>
          <p className="side-copy">Choose a mood, pick a prompt, write freely, then save the page to your Supabase journal.</p>
           <button className="start-writing" type="button" onClick={saveEntry} disabled={!ready || status === "saving"}>{status === "saving" ? "Saving..." : "Save today's entry"} <span>↘</span></button>
          {error && <p className="save-error">{error}</p>}
        </aside>

        <div className="open-journal">
          <div className="journal-spine" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>

          <article className="journal-page-sheet page-left">
            <div className="page-tab">Mood</div>
            <div className="page-header"><span>Morning notes</span><span>01</span></div>
            <h2>Before the day gets too loud...</h2>
            <div className="mood-stamps" aria-label="Mood options">
              {moods.map((moodName) => <button className={mood === moodName ? "selected" : ""} type="button" key={moodName} onClick={() => { setMood(moodName); setStatus("idle"); }}>{moodName}</button>)}
            </div>
            <textarea className="lined-note editable-note" aria-label="Morning note" value={morningNote} onChange={(event) => { setMorningNote(event.target.value); setStatus("idle"); }}/>
            <div className="tiny-note">A sentence is enough.</div>
          </article>

          <article className="journal-page-sheet page-right" id="entry">
            <div className="page-tab tab-coral">Write</div>
            <div className="page-header"><span>Daily reflection</span><span>02</span></div>
            <p className="prompt-label">Prompt</p>
            <h2>{prompt}</h2>
            <textarea className="entry-area" aria-label="Journal entry" value={entry} onChange={(event) => { setEntry(event.target.value); setStatus("idle"); }}/>
            <button className="save-entry" type="button" onClick={saveEntry} disabled={!ready || status === "saving"}>{status === "saved" ? "Saved" : status === "saving" ? "Saving" : "Save this page"} <span>{status === "saved" ? "✓" : "↗"}</span></button>
          </article>
        </div>

        <aside className="prompt-stack" aria-label="Journal prompts">
           {entries.length > 0 && <><p className="side-label journal-history-label">Past pages</p>{entries.map((savedEntry) => <div className="prompt-card journal-history-card" key={savedEntry.id}><button className="journal-history-open" type="button" onClick={() => openEntry(savedEntry)}><span>{savedEntry.created_at ? new Date(savedEntry.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span><p className="journal-history-preview" title={savedEntry.entry || "Untitled page"}>{savedEntry.entry || "Untitled page"}</p></button><button className="journal-history-delete" type="button" onClick={() => setDeleteTarget(savedEntry)} aria-label="Delete journal page">×</button></div>)}</>}
           <p className="side-label">Prompt cards</p>
           {prompts.map((promptText, index) => (<button className={`prompt-card ${prompt === promptText ? "active" : ""}`} type="button" key={promptText} onClick={() => { setPrompt(promptText); setStatus("idle"); }}><span>{String(index + 1).padStart(2, "0")}</span><p>{promptText}</p></button>))}
        </aside>
      </section>
       {deleteTarget && <div className="journal-dialog-backdrop" role="presentation" onClick={() => setDeleteTarget(null)}><div className="journal-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-journal-title" onClick={(event) => event.stopPropagation()}><span className="side-label">Past page</span><h2 id="delete-journal-title">Delete this page?</h2><p>This reflection will be removed from your journal history.</p><div className="journal-dialog-actions"><button type="button" onClick={() => setDeleteTarget(null)} disabled={!!deletingId}>Keep page</button><button className="journal-dialog-confirm" type="button" onClick={() => void deleteEntry()} disabled={!!deletingId}>{deletingId ? "Deleting..." : "Delete page"}</button></div></div></div>}
     </main>);
}
