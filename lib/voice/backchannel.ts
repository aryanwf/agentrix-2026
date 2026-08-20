/**
 * Barge-in triage: when the user talks over Cura, was that "mm-hmm, go on" or "wait, no"?
 *
 * Tier 1, here, is a pure local heuristic — no network, no latency, no cost. It exists because the
 * overwhelming majority of interruptions are unambiguous at either end: a bare "yeah" is never a
 * new question, and "wait, what did you mean by that?" is never filler. Resuming a paused answer
 * has to feel instant, and a round trip would put dead air exactly where it is most obvious.
 *
 * Only the genuinely ambiguous middle is escalated to tier 2 (`/api/barge`), which asks a small
 * model whether the interrupted answer is still worth finishing.
 */

export type BargeVerdict =
  /** Filler/agreement. Keep going — the user is listening, not asking. */
  | "backchannel"
  /** A real turn. Abandon the rest of the answer and respond to this instead. */
  | "interrupt"
  /** Could be either. Escalate to the model. */
  | "unclear";

/**
 * Pure acknowledgement tokens. A turn made only of these carries no new information, so there is
 * nothing to respond to and the interrupted answer should simply continue.
 */
const BACKCHANNEL = new Set([
  "mm", "mmm", "mhm", "mmhm", "mmhmm", "hmm", "hm", "uhhuh", "uhuh", "ah", "aah", "oh", "ooh",
  "yeah", "yea", "yep", "yup", "yes", "ya", "yah", "ok", "okay", "kay", "k",
  "right", "sure", "true", "exactly", "totally", "definitely", "absolutely", "agreed",
  "i", "see", "got", "it", "makes", "sense", "understood", "understand",
  "go", "on", "continue", "keep", "going", "listening", "am", "im",
  "wow", "nice", "cool", "great", "good", "fair", "alright", "gotcha", "word",
  "and", "so", "then", "well", "hey", "yeahyeah",
]);

/**
 * Words that mean the user is taking the floor, not yielding it. Any of these and we stop, even in
 * a short utterance — "no", "wait" and "stop" are the whole point of being able to interrupt.
 */
const FLOOR_TAKING = [
  "stop", "wait", "hold", "no", "nope", "nah", "actually", "but", "however",
  "sorry", "instead", "rather", "change", "different", "another", "skip", "forget",
  "what", "why", "how", "when", "where", "who", "which", "whats", "hows", "whys",
  "can", "could", "would", "should", "does", "did", "is", "are", "do", "dont", "doesnt",
  "explain", "repeat", "again", "mean", "means", "meant", "tell", "help", "let",
];

/** Longer than this and it is a contribution, not an acknowledgement. */
const MAX_BACKCHANNEL_WORDS = 3;
/** Beyond this there is no point asking a model — nobody backchannels for two sentences. */
const MAX_UNCLEAR_WORDS = 12;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .replace(/'/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Tier 1 verdict. Never makes a network call.
 *
 * Note the asymmetry: a question mark or a floor-taking word wins immediately, even inside an
 * otherwise-backchannel-looking phrase. Wrongly continuing over a real question is a much worse
 * failure than wrongly responding to an "mm-hmm".
 */
export function classifyBargeIn(transcript: string): BargeVerdict {
  const raw = transcript.trim();
  if (!raw) return "backchannel"; // silence or noise — nothing was said, so nothing changed

  // An explicit question is always a real turn, however short.
  if (raw.includes("?")) return "interrupt";

  const words = tokenize(raw);
  if (words.length === 0) return "backchannel";

  if (words.some((word) => FLOOR_TAKING.includes(word))) return "interrupt";

  const allFiller = words.every((word) => BACKCHANNEL.has(word));
  if (allFiller && words.length <= MAX_BACKCHANNEL_WORDS) return "backchannel";
  // Repeated filler ("yeah yeah yeah", "okay okay") is still filler.
  if (allFiller && new Set(words).size <= 2) return "backchannel";

  if (words.length > MAX_UNCLEAR_WORDS) return "interrupt";

  return "unclear";
}

/**
 * Tier 2: ask the model whether the interrupted answer is still worth finishing. Only call this for
 * an `"unclear"` verdict — it costs a round trip, and the user is sitting in silence for it.
 *
 * Any failure resolves to `"interrupt"`, matching the route's own bias.
 */
export async function adjudicateBargeIn(
  input: { interrupted: string; remaining: string; utterance: string },
  signal?: AbortSignal,
): Promise<Exclude<BargeVerdict, "unclear">> {
  try {
    const res = await fetch("/api/barge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!res.ok) return "interrupt";
    const data = (await res.json()) as { decision?: string };
    return data.decision === "continue" ? "backchannel" : "interrupt";
  } catch {
    return "interrupt";
  }
}
