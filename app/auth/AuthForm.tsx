"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setError("Account created. Check your email to confirm your account.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand"><span className="logo-mark sm"><i /><i /><i /></span>cura<span className="brand-dot">.</span></Link>
      <section className="auth-card">
        <span className="auth-eyebrow">Your private space</span>
        <h1>{mode === "login" ? "Welcome back." : "Make space for yourself."}</h1>
        <p>{mode === "login" ? "Return to your conversations and reflections." : "Create an account to keep your Cura history with you."}</p>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}<span>↗</span></button>
        </form>
        <p className="auth-switch">{mode === "login" ? "New to Cura?" : "Already have an account?"} <Link href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Sign up" : "Log in"}</Link></p>
      </section>
    </main>
  );
}
