import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createClient as createAuthClient } from "@/lib/supabase/server";

type JournalPayload = {
  deviceId?: string;
  mood?: string;
  morningNote?: string;
  prompt?: string;
  entry?: string;
};

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  let userId: string | null = null;
  try {
    const auth = await createAuthClient();
    const { data } = await auth.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!userId && !deviceId) return NextResponse.json({ error: "deviceId is required." }, { status: 400 });

  let query = supabase
    .from("journal_entries")
    .select("*")
    .order("created_at", { ascending: false });
  query = userId ? query.eq("user_id", userId) : query.eq("device_id", deviceId!);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return userId ? NextResponse.json({ entries: data ?? [] }) : NextResponse.json({ entry: data?.[0] ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  const payload = (await request.json()) as JournalPayload;
  let userId: string | null = null;
  try {
    const auth = await createAuthClient();
    const { data } = await auth.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId && !payload.deviceId) {
    return NextResponse.json({ error: "deviceId is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      device_id: userId ? null : payload.deviceId,
      user_id: userId,
      mood: payload.mood ?? "steady",
      morning_note: payload.morningNote ?? "",
      prompt: payload.prompt ?? "",
      entry: payload.entry ?? "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data ?? null });
}
