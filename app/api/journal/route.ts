import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type JournalPayload = {
  deviceId?: string;
  mood?: string;
  morningNote?: string;
  prompt?: string;
  entry?: string;
};

export async function GET(request: NextRequest) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data ?? null });
}

export async function POST(request: NextRequest) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  const payload = (await request.json()) as JournalPayload;
  if (!payload.deviceId) {
    return NextResponse.json({ error: "deviceId is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      device_id: payload.deviceId,
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
