const TERMINATORS = new Set([".", "!", "?", "…"]);
const CLAUSE = new Set([",", ";", ":", "—"]);
const CLOSERS = new Set(['"', "'", ")", "]", "}", "»", "\u201d", "\u2019"]);
const ABBREVIATIONS = new Set([
    "dr", "mr", "mrs", "ms", "mx", "prof", "sr", "jr", "st", "mt",
    "rev", "hon", "capt", "sgt", "lt", "col", "gen",
    "vs", "etc", "approx", "dept", "fig", "vol", "al", "inc", "ltd", "corp",
]);
export type SentenceSplitterOptions = {
    softMax?: number;
    hardMax?: number;
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
    push(chunk: string): string[] {
        if (!chunk)
            return [];
        this.buffer += chunk;
        return this.drain(false);
    }
    flush(): string[] {
        const out = this.drain(true);
        const rest = this.buffer.trim();
        this.buffer = "";
        if (rest)
            out.push(rest);
        return out;
    }
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
            if (cut < 0)
                cut = this.lengthCut();
            if (cut <= 0)
                break;
            const piece = this.buffer.slice(0, cut).trim();
            this.buffer = this.buffer.slice(cut);
            if (piece)
                out.push(piece);
        }
        if (this.buffer && !this.buffer.trim())
            this.buffer = "";
        else
            this.buffer = this.buffer.replace(/^\s+/, "");
        return out;
    }
    private terminatorCut(final: boolean): number {
        const buf = this.buffer;
        for (let i = 0; i < buf.length; i++) {
            if (!TERMINATORS.has(buf[i]))
                continue;
            let j = i;
            while (j < buf.length && TERMINATORS.has(buf[j]))
                j++;
            const runLength = j - i;
            while (j < buf.length && CLOSERS.has(buf[j]))
                j++;
            if (j >= buf.length)
                return final ? j : -1;
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
    private lengthCut(): number {
        const buf = this.buffer;
        if (buf.length < this.softMax)
            return -1;
        const limit = Math.min(buf.length, this.hardMax);
        for (let i = limit - 1; i >= this.minChunk; i--) {
            if (CLAUSE.has(buf[i]) && (i + 1 >= buf.length || /\s/.test(buf[i + 1])))
                return i + 1;
        }
        if (buf.length < this.hardMax)
            return -1;
        for (let i = limit - 1; i >= this.minChunk; i--) {
            if (/\s/.test(buf[i]))
                return i;
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
    if (!word)
        return false;
    if (word.length === 1)
        return true;
    return ABBREVIATIONS.has(word.toLowerCase());
}
export function splitSentences(text: string, opts?: SentenceSplitterOptions): string[] {
    const splitter = new SentenceSplitter(opts);
    const out = splitter.push(text);
    return [...out, ...splitter.flush()];
}
