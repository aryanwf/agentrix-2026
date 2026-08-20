import { NextRequest, NextResponse } from "next/server";

type JournalPayload = {
  deviceId?: string;
  mood?: string;
  morningNote?: string;
  prompt?: string;
  entry?: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), key };
}

function supabaseHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required." }, { status: 400 });
  }

  const response = await fetch(`${config.url}/rest/v1/journal_entries?device_id=eq.${encodeURIComponent(deviceId)}&select=*&order=created_at.desc&limit=1`, {
    headers: supabaseHeaders(config.key),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status });
  }

  const entries = await response.json();
  return NextResponse.json({ entry: entries[0] ?? null });
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  const payload = (await request.json()) as JournalPayload;
  if (!payload.deviceId) {
    return NextResponse.json({ error: "deviceId is required." }, { status: 400 });
  }

  const response = await fetch(`${config.url}/rest/v1/journal_entries`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(config.key),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      device_id: payload.deviceId,
      mood: payload.mood ?? "steady",
      morning_note: payload.morningNote ?? "",
      prompt: payload.prompt ?? "",
      entry: payload.entry ?? "",
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status });
  }

  const entries = await response.json();
  return NextResponse.json({ entry: entries[0] ?? null });
}
