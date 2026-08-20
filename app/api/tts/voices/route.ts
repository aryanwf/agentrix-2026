export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ voices: [] }, { status: 200, headers: { "cache-control": "no-store" } });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return Response.json({ voices: [], error: `voices lookup failed (${res.status})` }, { status: 200 });
    }
    const data = (await res.json()) as {
      voices?: { voice_id: string; name: string; labels?: Record<string, string> }[];
    };
    const voices = (data.voices ?? []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      description: [v.labels?.gender, v.labels?.accent, v.labels?.description]
        .filter(Boolean)
        .join(", "),
    }));
    return Response.json({ voices }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (err) {
    return Response.json({ voices: [], error: (err as Error).message }, { status: 200 });
  }
}
