export type Alignment = {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
};
export type WordTimings = {
    words: string[];
    wtimes: number[];
    wdurations: number[];
};
export function alignmentToWords(alignment: Alignment): WordTimings {
    const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
    const words: string[] = [];
    const wtimes: number[] = [];
    const wdurations: number[] = [];
    let current = "";
    let start = 0;
    let end = 0;
    const flush = () => {
        if (!current.trim()) {
            current = "";
            return;
        }
        words.push(current);
        wtimes.push(Math.round(start * 1000));
        wdurations.push(Math.max(1, Math.round((end - start) * 1000)));
        current = "";
    };
    for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        if (/\s/.test(char)) {
            flush();
            continue;
        }
        if (!current)
            start = starts[i] ?? end;
        current += char;
        end = ends[i] ?? start;
    }
    flush();
    return { words, wtimes, wdurations };
}
