/**
 * Streaming sentence splitter.
 *
 * Tokens arrive a few characters at a time, so a sentence can only be closed once we have seen
 * what follows its terminator. The rules, in priority order:
 *
 *   1. `[.!?…]` (plus any run of them and trailing closing quotes/brackets) followed by
 *      whitespace — or by end-of-stream on `flush()`.
 *   2. Otherwise, once the buffer passes `softMax`, cut at the last clause boundary (`,` `;` `:`).
 *   3. Otherwise, once the buffer passes `hardMax`, cut at the last whitespace.
 *
 * `hardMax` is not cosmetic: /api/tts rejects anything over 400 characters, so the splitter is
 * the component that guarantees every chunk is synthesisable. The default leaves headroom.
 */

const TERMINATORS = new Set([".", "!", "?", "…"]);
const CLAUSE = new Set([",", ";", ":", "—"]);
const CLOSERS = new Set(['"', "'", ")", "]", "}", "»", "\u201d", "\u2019"]);

/**
 * Words that end in a period without ending a sentence. Deliberately conservative: entries that
 * routinely end real sentences ("am", "pm", "no", "est", "co") are excluded, because merging two
 * sentences is a much cheaper mistake than cutting one in half mid-thought.
 */
const ABBREVIATIONS = new Set([
  "dr", "mr", "mrs", "ms", "mx", "prof", "sr", "jr", "st", "mt",
  "rev", "hon", "capt", "sgt", "lt", "col", "gen",
  "vs", "etc", "approx", "dept", "fig", "vol", "al", "inc", "ltd", "corp",
]);

export type SentenceSplitterOptions = {
  /** Start looking for a clause boundary once the buffer is this long. */
  softMax?: number;
  /** Never emit a chunk longer than this. Must stay under the /api/tts 400-char cap. */
  hardMax?: number;
  /** Never produce a length-forced chunk shorter than this, to avoid stuttery fragments. */
  minChunk?: number;
};

export class SentenceSplitter {
  private buffer = "";
  private readonly softMax: number;
  private readonly hardMax: number;
  private readonly minChunk: number;

  constructor({ softMax = 160, hardMax = 280, minChunk = 40 }: SentenceSplitterOptions = {}) {
    this.softMax = softMax;
    this.hardMax = hardMax;
    this.minChunk = minChunk;
  }

  /** Feed a token/chunk. Returns every sentence that closed as a result. */
  push(chunk: string): string[] {
    if (!chunk) return [];
    this.buffer += chunk;
    return this.drain(false);
  }

  /** End of stream: emit whatever is left. */
  flush(): string[] {
    const out = this.drain(true);
    const rest = this.buffer.trim();
    this.buffer = "";
    if (rest) out.push(rest);
    return out;
  }

  /** Text buffered but not yet emitted — useful for live "still typing" display. */
  get pending(): string {
    return this.buffer;
  }

  reset(): void {
    this.buffer = "";
  }

  private drain(final: boolean): string[] {
    const out: string[] = [];

    for (;;) {
      let cut = this.terminatorCut(final);
      if (cut < 0) cut = this.lengthCut();
      if (cut <= 0) break;

      const piece = this.buffer.slice(0, cut).trim();
      this.buffer = this.buffer.slice(cut);
      if (piece) out.push(piece);
    }

    // Leading whitespace left by a cut would otherwise inflate the length checks.
    if (this.buffer && !this.buffer.trim()) this.buffer = "";
    else this.buffer = this.buffer.replace(/^\s+/, "");

    return out;
  }

  /** Index just past a sentence terminator, or -1. */
  private terminatorCut(final: boolean): number {
    const buf = this.buffer;

    for (let i = 0; i < buf.length; i++) {
      if (!TERMINATORS.has(buf[i])) continue;

      let j = i;
      while (j < buf.length && TERMINATORS.has(buf[j])) j++;
      const runLength = j - i;
      while (j < buf.length && CLOSERS.has(buf[j])) j++;

      // Terminator sits at the very end: more characters may still be coming, so we can only
      // commit at end-of-stream. This is also what keeps "3." from splitting before "5" arrives.
      if (j >= buf.length) return final ? j : -1;

      // "3.5", "example.com" — a terminator not followed by whitespace is not a terminator.
      if (!/\s/.test(buf[j])) {
        i = j - 1;
        continue;
      }

      if (buf[i] === "." && runLength === 1 && isAbbreviation(buf, i)) {
        i = j - 1;
        continue;
      }

      return j;
    }

    return -1;
  }

  /** Index of a length-forced cut, or -1 while the buffer is still comfortably short. */
  private lengthCut(): number {
    const buf = this.buffer;
    if (buf.length < this.softMax) return -1;

    const limit = Math.min(buf.length, this.hardMax);

    for (let i = limit - 1; i >= this.minChunk; i--) {
      if (CLAUSE.has(buf[i]) && (i + 1 >= buf.length || /\s/.test(buf[i + 1]))) return i + 1;
    }

    // No clause boundary anywhere: only break mid-clause once we actually have to.
    if (buf.length < this.hardMax) return -1;

    for (let i = limit - 1; i >= this.minChunk; i--) {
      if (/\s/.test(buf[i])) return i;
    }

    return limit;
  }
}

function isAbbreviation(buf: string, dotIndex: number): boolean {
  let k = dotIndex - 1;
  let word = "";
  while (k >= 0 && /[A-Za-z]/.test(buf[k])) {
    word = buf[k] + word;
    k--;
  }

  if (!word) return false;
  // A single letter is an initial ("J. Smith") or part of a dotted form ("e.g.", "U.S.").
  if (word.length === 1) return true;
  return ABBREVIATIONS.has(word.toLowerCase());
}

/** One-shot convenience wrapper for non-streaming text. */
export function splitSentences(text: string, opts?: SentenceSplitterOptions): string[] {
  const splitter = new SentenceSplitter(opts);
  const out = splitter.push(text);
  return [...out, ...splitter.flush()];
}
