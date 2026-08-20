import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createClient as createAuthClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await createAuthClient();
    const { data: authData } = await auth.auth.getUser();
    const supabase = getSupabase();
    if (!authData.user || !supabase) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const { data, error } = await supabase.from("conversations").select("id,title,messages,created_at,updated_at").eq("id", id).eq("user_id", authData.user.id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ conversation: data });
  } catch {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await createAuthClient();
    const { data: authData } = await auth.auth.getUser();
    const supabase = getSupabase();
    if (!authData.user || !supabase) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    const body = (await request.json()) as { messages?: unknown[] | { messages?: unknown[] }; title?: string };
    const externalMessages = Array.isArray(body.messages) ? body.messages : body.messages?.messages ?? [];
    const firstUserMessage = externalMessages.map((item) => {
      if (item && typeof item === "object" && "message" in item) return item.message;
      return item;
    }).find((message) => typeof message === "object" && message !== null && "role" in message && message.role === "user") as { parts?: { type?: string; text?: string }[] } | undefined;
    const title = body.title ?? (firstUserMessage?.parts?.filter((part) => part.type === "text").map((part) => part.text).join(" ").slice(0, 70) || "Cura conversation");
    const { data, error } = await supabase.from("conversations").update({ messages: body.messages ?? [], title, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", authData.user.id).select("id,title,created_at,updated_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ conversation: data });
  } catch {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
}
