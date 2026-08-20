"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AudioLines, MessageCircle, NotebookPen } from "lucide-react";
import AuthButtons from "@/components/AuthButtons";

type AppName = "talk" | "chat" | "journal";

const apps: {
  name: AppName;
  href: string;
  icon: typeof AudioLines;
  label: string;
  blurb: string;
}[] = [
  {
    name: "talk",
    href: "/session",
    icon: AudioLines,
    label: "Talk",
    blurb: "Speak out loud, hear her back",
  },
  {
    name: "chat",
    href: "/chat",
    icon: MessageCircle,
    label: "Chat",
    blurb: "Type it instead, same companion",
  },
  {
    name: "journal",
    href: "/journal",
    icon: NotebookPen,
    label: "Journal",
    blurb: "Keep what you want to remember",
  },
];

function Logo() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <main className="lp">
      <header className="lp-header">
        <Link className="brand" href="/" aria-label="Cura home">
          <Logo />
          <span>
            cura<span className="brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation"><AuthButtons /></nav>
      </header>

      <section className="lp-hero">
        <div className="lp-copy">
          <p className="lp-eyebrow">Voice-first companion</p>
          <h1>
            Feel more like <em>yourself.</em>
          </h1>
          <p className="lp-lede">
            Cura listens while you talk it through, then answers out loud — a calm,
            therapy-informed presence for the days that need one.
          </p>

          <div className="lp-actions">
            <button className="lp-cta" type="button" onClick={() => router.push("/session")}>
              <AudioLines size={18} strokeWidth={1.75} />
              Start talking
              <b>↗</b>
            </button>
            <button className="lp-ghost" type="button" onClick={() => router.push("/chat")}>
              or type instead
            </button>
          </div>
        </div>

        <div className="lp-stage">
          <span className="lp-ring two" aria-hidden="true" />
          <span className="lp-ring" aria-hidden="true" />
          <span className="lp-disc" aria-hidden="true" />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="lp-figure"
            src="/brand/cura.webp"
            alt="Cura, the companion avatar, mid-conversation"
            width={830}
            height={1450}
            fetchPriority="high"
          />

          <div className="lp-voice">
            <span className="lp-wave" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <div className="lp-voice-text">
              <strong>Listening</strong>
              <span>&ldquo;Take your time. I&rsquo;m here.&rdquo;</span>
            </div>
          </div>
        </div>
      </section>

      <nav className="lp-apps" aria-label="Ways in">
        {apps.map(({ name, href, icon: Icon, label, blurb }) => (
          <button className="lp-app" type="button" key={name} onClick={() => router.push(href)}>
            <span className="lp-app-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <span>
              <strong>{label}</strong>
              <small>{blurb}</small>
            </span>
            <b aria-hidden="true">↗</b>
          </button>
        ))}
      </nav>
    </main>
  );
}
