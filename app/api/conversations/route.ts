import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createClient as createAuthClient } from "@/lib/supabase/server";

async function currentUserId() {
  try {
    const auth = await createAuthClient();
    const { data } = await auth.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await currentUserId();
  const supabase = getSupabase();
  if (!userId || !supabase) return NextResponse.json({ conversations: [] });

  const { data, error } = await supabase.from("conversations").select("id,title,created_at,updated_at,messages").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const conversations = (data ?? []).filter((conversation) => {
    const messages = conversation.messages;
    return Array.isArray(messages) ? messages.length > 0 : !!messages && typeof messages === "object" && "messages" in messages && Array.isArray(messages.messages) && messages.messages.length > 0;
  });
  return NextResponse.json({ conversations });
}
