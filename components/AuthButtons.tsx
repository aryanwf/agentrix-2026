"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthButtons() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user?.email ?? null));
      return () => listener.subscription.unsubscribe();
    } catch {
      return undefined;
    }
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEmail(null);
  }

  if (email) return <div className="auth-actions"><Link href="/history" className="auth-user">{email}</Link><button type="button" onClick={logout} className="auth-login">Log out</button></div>;
  return <div className="auth-actions"><Link href="/login" className="auth-login">Log in</Link><Link href="/signup" className="auth-signup">Sign up <span>↗</span></Link></div>;
}
