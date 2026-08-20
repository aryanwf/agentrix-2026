"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type Mode = "login" | "signup";
const copy: Record<Mode, {
    eyebrow: string;
    title: React.ReactNode;
    lede: string;
    cta: string;
    switchLead: string;
    switchCta: string;
    switchHref: string;
}> = {
    login: {
        eyebrow: "Welcome back",
        title: (<>
        Pick up where <em>you left off.</em>
      </>),
        lede: "Your conversations and journal pages are waiting exactly where you left them.",
        cta: "Log in",
        switchLead: "New to Cura?",
        switchCta: "Create an account",
        switchHref: "/signup",
    },
    signup: {
        eyebrow: "Make space for yourself",
        title: (<>
        Start feeling more like <em>yourself.</em>
      </>),
        lede: "Create an account to keep your history with you — across every device, private by default.",
        cta: "Create account",
        switchLead: "Already have an account?",
        switchCta: "Log in",
        switchHref: "/login",
    },
};
export default function AuthForm({ mode }: {
    mode: Mode;
}) {
    const router = useRouter();
    const t = copy[mode];
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [reveal, setReveal] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError("");
        setNotice("");
        try {
            const supabase = createClient();
            const result = mode === "login"
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });
            if (result.error)
                throw result.error;
            if (mode === "signup" && !result.data.session) {
                setNotice("Account created. Check your email to confirm it, then log in.");
                return;
            }
            router.push("/");
            router.refresh();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Something went wrong.");
        }
        finally {
            setLoading(false);
        }
    }
    return (<main className="au">
      
      <aside className="au-aside" aria-hidden="true">
        <span className="au-ring two"/>
        <span className="au-ring"/>
        <span className="au-disc"/>

        <div className="au-aside-inner">
          <span className="au-wave">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>

          <figure className="au-quote">
            <blockquote>&ldquo;Take your time. I&rsquo;m here.&rdquo;</blockquote>
            <figcaption>A calm, therapy-informed presence — whenever the day needs one.</figcaption>
          </figure>

          <ul className="au-points">
            <li>Talk out loud, or type instead</li>
            <li>Your history, kept across devices</li>
            <li>Private by default — always</li>
          </ul>
        </div>
      </aside>

      
      <section className="au-panel">
        <Link href="/" className="au-brand" aria-label="Cura home">
          <span className="logo-mark sm" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            cura<span className="brand-dot">.</span>
          </span>
        </Link>

        <div className="au-body">
          <p className="au-eyebrow">{t.eyebrow}</p>
          <h1 className="au-title">{t.title}</h1>
          <p className="au-lede">{t.lede}</p>

          <form onSubmit={submit} className="au-form" noValidate={false}>
            <label className="au-field">
              <span>Email</span>
              <div className="au-input">
                <Mail size={16} strokeWidth={1.75} aria-hidden="true"/>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required autoComplete="email" autoFocus/>
              </div>
            </label>

            <label className="au-field">
              <span>
                Password
                {mode === "signup" && <small>6 characters minimum</small>}
              </span>
              <div className="au-input">
                <Lock size={16} strokeWidth={1.75} aria-hidden="true"/>
                <input type={reveal ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "Choose a password" : "Your password"} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"}/>
                <button type="button" className="au-reveal" onClick={() => setReveal((value) => !value)} aria-label={reveal ? "Hide password" : "Show password"}>
                  {reveal ? <EyeOff size={16} strokeWidth={1.75}/> : <Eye size={16} strokeWidth={1.75}/>}
                </button>
              </div>
            </label>

            {error && (<p className="au-alert error" role="alert">
                {error}
              </p>)}
            {notice && (<p className="au-alert ok" role="status">
                <Check size={15} strokeWidth={2} aria-hidden="true"/>
                {notice}
              </p>)}

            <button type="submit" className="au-submit" disabled={loading}>
              {loading ? (<>
                  <Loader2 size={17} strokeWidth={2} className="au-spin" aria-hidden="true"/>
                  Please wait
                </>) : (<>
                  {t.cta}
                  <b aria-hidden="true">↗</b>
                </>)}
            </button>
          </form>

          <p className="au-switch">
            {t.switchLead} <Link href={t.switchHref}>{t.switchCta}</Link>
          </p>
        </div>

        <p className="au-privacy">
          <ShieldCheck size={14} strokeWidth={1.75} aria-hidden="true"/>
          Private by default. Your sessions are yours alone.
        </p>
      </section>
    </main>);
}
