"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Message = {
  author: "cura" | "you";
  text: string;
};

const starterMessages: Message[] = [
  {
    author: "cura",
    text: "Hi, I'm Cura. This is a private space for you to slow down and talk things through.",
  },
  {
    author: "cura",
    text: "What’s been taking up the most space in your mind today?",
  },
];

const quickPrompts = [
  "I feel overwhelmed",
  "Help me calm down",
  "I can’t sleep",
];

function Waveform() {
  return (
    <span className="waveform" aria-hidden="true">
      {Array.from({ length: 17 }, (_, index) => (
        <i key={index} style={{ height: `${12 + ((index * 17) % 25)}px` }} />
      ))}
    </span>
  );
}

function SparkIcon() {
  return <span className="spark-icon" aria-hidden="true">✦</span>;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [draft, setDraft] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showResources, setShowResources] = useState(false);

  function sendMessage(text: string) {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    setMessages((current) => [
      ...current,
      { author: "you", text: trimmedText },
      {
        author: "cura",
        text: "Thank you for sharing that. Let’s take it one small step at a time. What would feel most helpful right now?",
      },
    ]);
    setDraft("");
    setSessionStarted(true);
    setIsListening(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  return (
    <main className="cura-app">
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="Cura home">
          <span className="brand-mark"><SparkIcon /></span>
          <span>Cura</span>
        </a>
        <div className="topbar-actions">
          <span className="privacy-note"><span className="status-dot" /> Private session</span>
          <button className="icon-button" type="button" aria-label="Open settings">
            <span className="menu-lines" aria-hidden="true"><i /><i /><i /></span>
          </button>
        </div>
      </header>

      <div className="layout" id="main-content">
        <section className="conversation-column" aria-label="Cura conversation">
          <div className="intro-block">
            <p className="eyebrow">A quiet place to begin</p>
            <h1>How are you feeling <em>today?</em></h1>
            <p className="intro-copy">Cura listens without judgment and helps you find your next small step.</p>
          </div>

          <div className="mobile-avatar-card">
            <AvatarStage isListening={isListening} />
          </div>

          <div className="conversation-card">
            <div className="conversation-header">
              <div>
                <span className="section-label">Your conversation</span>
                <span className="session-state"><span className="status-dot" /> {sessionStarted ? "Session active" : "Ready when you are"}</span>
              </div>
              <button className="text-button" type="button" onClick={() => setMessages(starterMessages)}>New session <span aria-hidden="true">↗</span></button>
            </div>

            <div className="messages" aria-live="polite">
              {messages.map((message, index) => (
                <div className={`message ${message.author}`} key={`${message.author}-${index}`}>
                  {message.author === "cura" && <span className="message-avatar"><SparkIcon /></span>}
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <div className="quick-prompts">
              <span className="prompt-label">Try saying</span>
              {quickPrompts.map((prompt) => (
                <button type="button" key={prompt} onClick={() => sendMessage(prompt)}>{prompt}</button>
              ))}
            </div>

            <form className="composer" onSubmit={handleSubmit}>
              <input
                aria-label="Write a message to Cura"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write what's on your mind..."
              />
              <button className={`mic-button ${isListening ? "active" : ""}`} type="button" onClick={() => { setIsListening((value) => !value); setSessionStarted(true); }} aria-label={isListening ? "Stop listening" : "Start listening"}>
                <span className="mic-glyph" aria-hidden="true" />
              </button>
              <button className="send-button" type="submit" aria-label="Send message">↑</button>
            </form>
            <p className="composer-note">Cura is a supportive companion, not a replacement for professional care.</p>
          </div>
        </section>

        <aside className="avatar-column" aria-label="Cura avatar">
          <AvatarStage isListening={isListening} />
          <div className="avatar-caption">
            <div>
              <span className="section-label">Cura is here</span>
              <p>{isListening ? "Listening to you..." : "Take your time. I'm listening."}</p>
            </div>
            <button className="sound-button" type="button" aria-label="Mute Cura"><span className="sound-glyph" /></button>
          </div>
          <div className="activity-card">
            <div className="activity-icon"><span aria-hidden="true">◒</span></div>
            <div>
              <span className="section-label">Need a reset?</span>
              <p>Try a 60-second breathing exercise.</p>
            </div>
            <button type="button" className="round-arrow" aria-label="Start breathing exercise">↗</button>
          </div>
        </aside>
      </div>

      <footer className="footer-bar">
        <p><span className="footer-spark">✦</span> Small steps count.</p>
        <button type="button" onClick={() => setShowResources((value) => !value)}>Need immediate help? <span>View resources</span> <b>↗</b></button>
      </footer>

      {showResources && (
        <div className="resource-panel" role="dialog" aria-labelledby="resource-title">
          <button className="close-resource" type="button" onClick={() => setShowResources(false)} aria-label="Close resources">×</button>
          <p className="eyebrow">You don’t have to face this alone</p>
          <h2 id="resource-title">Immediate support</h2>
          <p>If you may hurt yourself or someone else, contact your local emergency service now.</p>
          <div className="resource-links">
            <a href="tel:988"><span>988 Suicide &amp; Crisis Lifeline</span><b>↗</b></a>
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer"><span>Find a helpline near you</span><b>↗</b></a>
          </div>
        </div>
      )}
    </main>
  );
}

function AvatarStage({ isListening }: { isListening: boolean }) {
  return (
    <div className={`avatar-stage ${isListening ? "listening" : ""}`}>
      <div className="stage-glow" />
      <div className="avatar-placeholder" aria-label="Cura 3D avatar loading area">
        <div className="avatar-halo" />
        <div className="avatar-head">
          <div className="hair" />
          <div className="face">
            <span className="ear left" /><span className="ear right" />
            <div className="brow left" /><div className="brow right" />
            <div className="eye left" /><div className="eye right" />
            <div className="nose" /><div className="mouth" />
          </div>
          <div className="neck" />
        </div>
        <div className="avatar-shoulders" />
      </div>
      <div className="stage-badge"><span className="status-dot" /> {isListening ? "Listening" : "Cura"}</div>
      <div className="stage-wave"><Waveform /></div>
    </div>
  );
}
