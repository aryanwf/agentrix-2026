"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AppName = "chat" | "talk" | "journal";

const apps: Record<AppName, { label: string; title: string; text: string; prompt: string }> = {
  chat: {
    label: "Chat",
    title: "Say what is on your mind.",
    text: "A private space to untangle your thoughts and feel heard without judgment.",
    prompt: "What feels most present today?",
  },
  talk: {
    label: "Talk",
    title: "Find your next small step.",
    text: "Gentle guidance and practical exercises for the moments that need a reset.",
    prompt: "What would feel helpful right now?",
  },
  journal: {
    label: "Journal",
    title: "Notice what is changing.",
    text: "Simple prompts to make sense of your days and keep the good close.",
    prompt: "What do you want to remember from today?",
  },
};

function Logo() {
  return <span className="logo-mark" aria-hidden="true"><i /><i /><i /></span>;
}

function AppIcon({ type }: { type: AppName }) {
  return <span className={`app-icon ${type}-icon`} aria-hidden="true" />;
}

export default function Home() {
  const router = useRouter();
  const [activeApp, setActiveApp] = useState<AppName>("chat");
  const [journalEntry, setJournalEntry] = useState("");
  const [entrySaved, setEntrySaved] = useState(false);
  const active = apps[activeApp];

  function selectApp(appName: AppName) {
    if (appName === "journal") {
      router.push("/journal");
      return;
    }
    setActiveApp(appName);
    setEntrySaved(false);
  }

  return (
    <main className="static-page">
      <header className="static-header">
        <a className="brand" href="#home" aria-label="Cura home"><Logo /><span>cura<span className="brand-dot">.</span></span></a>
        <nav aria-label="Main navigation"><a href="#apps">Explore</a><a href="#about">About Cura</a><a className="header-button" href="#apps">Get started <span>↗</span></a></nav>
      </header>

      <section className="static-hero" id="home">
        <div className="hero-message">
          <h1>Feel more like <em>yourself.</em></h1>
          <p className="hero-copy">Cura is a calm companion for everyday wellbeing. Choose a way in, take your time, and begin wherever you are.</p>
          <a className="hero-link" href="#apps">Explore the ways in <span>↓</span></a>
        </div>

        <div className="companion-card" id="about">
          <div className="card-topline"><span><Logo /> Cura</span><span className="private-pill"><i /> private space</span></div>
          <div className="card-content" key={activeApp}>
            {activeApp === "journal" ? (
              <div className="journal-workspace">
                <div className="card-kicker">A page for today</div>
                <h2>Write it<br /><em>down.</em></h2>
                <p className="journal-prompt">{active.prompt}</p>
                <textarea aria-label="Journal entry" value={journalEntry} onChange={(event) => { setJournalEntry(event.target.value); setEntrySaved(false); }} placeholder="Start wherever feels easy..." />
                <button className="begin-button" type="button" onClick={() => setEntrySaved(true)}>{entrySaved ? "Entry saved" : "Save entry"} <span>{entrySaved ? "✓" : "↗"}</span></button>
              </div>
            ) : (
              <>
                <div className="card-kicker">{active.label} with Cura</div>
                <h2>{active.title}</h2>
                <p>{active.text}</p>
                <div className="prompt-box"><span>{active.prompt}</span><b>↗</b></div>
                <button className="begin-button" type="button">Begin with {active.label.toLowerCase()} <span>↗</span></button>
              </>
            )}
          </div>
          <div className="card-footer"><span>Small steps count.</span><span className="card-mark">✦</span></div>
        </div>
      </section>

      <section className="app-picker" id="apps" aria-label="Choose a Cura application">
        <div className="picker-heading"><span>Choose your way in</span><span>01 — 03</span></div>
        <div className="app-buttons">
          {(Object.keys(apps) as AppName[]).map((appName) => (
            <button className={`app-button ${activeApp === appName ? "selected" : ""}`} type="button" key={appName} onClick={() => selectApp(appName)} aria-pressed={activeApp === appName}>
              <AppIcon type={appName} /><span>{apps[appName].label}</span><b>↗</b>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
