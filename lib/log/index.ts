const ENABLED = process.env.CURA_LOG !== "0";
const COLOR = process.stdout?.isTTY === true && process.env.NO_COLOR === undefined;
const paint = (code: string, text: string) => COLOR ? `\u001b[${code}m${text}\u001b[0m` : text;
const dim = (t: string) => paint("2", t);
const bold = (t: string) => paint("1", t);
const STAGES = {
    turn: "35",
    stt: "36",
    chat: "32",
    say: "34",
    tts: "33",
    barge: "35",
    warn: "31",
} as const;
export type Stage = keyof typeof STAGES;
const WIDTH = Math.max(...Object.keys(STAGES).map((s) => s.length));
function clock(): string {
    return new Date().toISOString().slice(11, 23);
}
export function log(stage: Stage, message: string, ...details: (string | number | null | undefined)[]): void {
    if (!ENABLED)
        return;
    const parts = [message, ...details.filter((d) => d !== null && d !== undefined && d !== "")];
    process.stdout.write(`${dim(clock())} ${dim("cura")} ${paint(STAGES[stage], bold(stage.padEnd(WIDTH)))} ` +
        `${parts.join(dim(" · "))}\n`);
}
export function since(start: number): string {
    const ms = Math.round(performance.now() - start);
    return dim(ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
}
export function quote(text: string, max = 72): string {
    const flat = text.replace(/\s+/g, " ").trim();
    return `"${flat.length > max ? `${flat.slice(0, max - 1)}…` : flat}"`;
}
