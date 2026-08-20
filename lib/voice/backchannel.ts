export type BargeVerdict = "backchannel" | "interrupt" | "unclear";
const BACKCHANNEL = new Set([
    "mm", "mmm", "mhm", "mmhm", "mmhmm", "hmm", "hm", "uhhuh", "uhuh", "ah", "aah", "oh", "ooh",
    "yeah", "yea", "yep", "yup", "yes", "ya", "yah", "ok", "okay", "kay", "k",
    "right", "sure", "true", "exactly", "totally", "definitely", "absolutely", "agreed",
    "i", "see", "got", "it", "makes", "sense", "understood", "understand",
    "go", "on", "continue", "keep", "going", "listening", "am", "im",
    "wow", "nice", "cool", "great", "good", "fair", "alright", "gotcha", "word",
    "and", "so", "then", "well", "hey", "yeahyeah",
]);
const FLOOR_TAKING = [
    "stop", "wait", "hold", "no", "nope", "nah", "actually", "but", "however",
    "sorry", "instead", "rather", "change", "different", "another", "skip", "forget",
    "what", "why", "how", "when", "where", "who", "which", "whats", "hows", "whys",
    "can", "could", "would", "should", "does", "did", "is", "are", "do", "dont", "doesnt",
    "explain", "repeat", "again", "mean", "means", "meant", "tell", "help", "let",
];
const MAX_BACKCHANNEL_WORDS = 3;
const MAX_UNCLEAR_WORDS = 12;
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z\s']/g, " ")
        .replace(/'/g, "")
        .split(/\s+/)
        .filter(Boolean);
}
export function classifyBargeIn(transcript: string): BargeVerdict {
    const raw = transcript.trim();
    if (!raw)
        return "backchannel";
    if (raw.includes("?"))
        return "interrupt";
    const words = tokenize(raw);
    if (words.length === 0)
        return "backchannel";
    if (words.some((word) => FLOOR_TAKING.includes(word)))
        return "interrupt";
    const allFiller = words.every((word) => BACKCHANNEL.has(word));
    if (allFiller && words.length <= MAX_BACKCHANNEL_WORDS)
        return "backchannel";
    if (allFiller && new Set(words).size <= 2)
        return "backchannel";
    if (words.length > MAX_UNCLEAR_WORDS)
        return "interrupt";
    return "unclear";
}
export async function adjudicateBargeIn(input: {
    interrupted: string;
    remaining: string;
    utterance: string;
}, signal?: AbortSignal): Promise<Exclude<BargeVerdict, "unclear">> {
    try {
        const res = await fetch("/api/barge", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
            signal,
        });
        if (!res.ok)
            return "interrupt";
        const data = (await res.json()) as {
            decision?: string;
        };
        return data.decision === "continue" ? "backchannel" : "interrupt";
    }
    catch {
        return "interrupt";
    }
}
