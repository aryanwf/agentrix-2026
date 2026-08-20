import type { Metadata } from "next";
import Link from "next/link";
import "./journal.css";

export const metadata: Metadata = {
  title: "Cura Journal | Your quiet notebook",
  description: "A warm journal space for daily reflection, prompts, and private notes.",
};

const prompts = [
  "What did today ask of me?",
  "Where did I feel most like myself?",
  "What can I leave on this page?",
];

function Logo() {
  return <span className="notebook-logo" aria-hidden="true">c.</span>;
}

export default function JournalPage() {
  return (
    <main className="journal-desk">
      <header className="desk-header">
        <Link className="desk-brand" href="/" aria-label="Back to Cura home"><Logo /><span>Cura Journal</span></Link>
        <div className="desk-date"><span>Private notebook</span><strong>Aug 20</strong></div>
      </header>

      <section className="journal-board" aria-label="Journal notebook landing page">
        <aside className="left-notes">
          <div className="paper-clip" aria-hidden="true" />
          <p className="side-label">Today&apos;s page</p>
          <h1>A quiet place to write what you could not say out loud.</h1>
          <p className="side-copy">Cura Journal feels like opening a real notebook: soft paper, small prompts, and enough room to be honest without turning your thoughts into tasks.</p>
          <a className="start-writing" href="#entry">Start today&apos;s entry <span>↘</span></a>
        </aside>

        <div className="open-journal">
          <div className="journal-spine" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>

          <article className="journal-page-sheet page-left">
            <div className="page-tab">Mood</div>
            <div className="page-header"><span>Morning notes</span><span>01</span></div>
            <h2>Before the day gets too loud...</h2>
            <div className="mood-stamps" aria-label="Mood options"><span>calm</span><span>heavy</span><span className="selected">steady</span><span>hopeful</span></div>
            <div className="lined-note"><p>I want to move through today with more patience than pressure.</p></div>
            <div className="tiny-note">A sentence is enough.</div>
          </article>

          <article className="journal-page-sheet page-right" id="entry">
            <div className="page-tab tab-coral">Write</div>
            <div className="page-header"><span>Daily reflection</span><span>02</span></div>
            <p className="prompt-label">Prompt</p>
            <h2>What can I leave on this page?</h2>
            <div className="entry-area" aria-label="Journal entry preview">
              <p>Today I noticed...</p>
              <span /><span /><span /><span />
            </div>
            <button className="save-entry" type="button">Save this page <span>✓</span></button>
          </article>
        </div>

        <aside className="prompt-stack" aria-label="Journal prompts">
          <p className="side-label">Prompt cards</p>
          {prompts.map((prompt, index) => (
            <div className="prompt-card" key={prompt}><span>{String(index + 1).padStart(2, "0")}</span><p>{prompt}</p></div>
          ))}
        </aside>
      </section>
    </main>
  );
}
