export type SpeechQueueOptions = {
    speak: (text: string, index: number, onPlayed: () => void) => Promise<void>;
    onError?: (error: Error, text: string) => void;
    onIdle?: () => void;
};
export class SpeechQueue {
    private pending: string[] = [];
    private inFlight: string[] = [];
    private running = false;
    private closed = false;
    private paused = false;
    private generation = 0;
    private index = 0;
    constructor(private readonly opts: SpeechQueueOptions) { }
    get size(): number {
        return this.pending.length;
    }
    get busy(): boolean {
        return this.running || this.pending.length > 0;
    }
    get isPaused(): boolean {
        return this.paused;
    }
    get undelivered(): string {
        return [...this.inFlight, ...this.pending].join(" ");
    }
    push(text: string): void {
        const trimmed = text.trim();
        if (!trimmed || this.closed)
            return;
        this.pending.push(trimmed);
        void this.drain();
    }
    end(): void {
        if (this.closed)
            return;
        this.closed = true;
        if (!this.running && !this.paused && this.pending.length === 0)
            this.opts.onIdle?.();
    }
    pause(): void {
        if (this.paused)
            return;
        this.paused = true;
        this.pending = [...this.inFlight, ...this.pending];
        this.inFlight = [];
    }
    resume(): void {
        if (!this.paused)
            return;
        this.paused = false;
        if (this.pending.length)
            void this.drain();
        else if (this.closed && !this.running)
            this.opts.onIdle?.();
    }
    private notePlayed(text: string): void {
        const at = this.inFlight.indexOf(text);
        if (at !== -1)
            this.inFlight.splice(at, 1);
    }
    cancel(): void {
        this.generation++;
        this.pending = [];
        this.inFlight = [];
        this.running = false;
        this.closed = false;
        this.paused = false;
        this.index = 0;
    }
    private async drain(): Promise<void> {
        if (this.running || this.paused)
            return;
        this.running = true;
        const generation = this.generation;
        try {
            while (this.pending.length && !this.paused) {
                const text = this.pending.shift()!;
                this.inFlight.push(text);
                try {
                    await this.opts.speak(text, this.index++, () => {
                        if (generation === this.generation)
                            this.notePlayed(text);
                    });
                }
                catch (err) {
                    if (generation !== this.generation)
                        return;
                    this.notePlayed(text);
                    this.opts.onError?.(err as Error, text);
                }
                if (generation !== this.generation)
                    return;
            }
        }
        finally {
            if (generation === this.generation) {
                this.running = false;
                if (this.closed && !this.paused && this.pending.length === 0)
                    this.opts.onIdle?.();
            }
        }
    }
}
