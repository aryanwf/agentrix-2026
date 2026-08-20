/**
 * Ordered speech queue.
 *
 * Sentences arrive from /api/chat faster than they can be spoken, and each one needs a network
 * round-trip to /api/tts before it can be handed over. This serialises that: exactly one
 * synthesis in flight, strict FIFO order, no interleaving.
 *
 * Why serial is not slow here: `speak` resolves once the audio has been *handed to* TalkingHead,
 * not once it has finished playing (`speakAudio` pushes onto `speechQueue` and returns). So while
 * sentence 1 is playing, sentence 2 is already being synthesised, and TalkingHead's own queue
 * guarantees gapless in-order playback. That pipelining is what puts first audio inside the 2.5s
 * budget without ever risking sentence 2 arriving before sentence 1.
 */

export type SpeechQueueOptions = {
  /** Resolves once the utterance is enqueued on the avatar, not once it has finished playing. */
  speak: (text: string, index: number) => Promise<void>;
  onError?: (error: Error, text: string) => void;
  /** Every queued sentence has been handed to the avatar and the queue was closed. */
  onIdle?: () => void;
};

export class SpeechQueue {
  private pending: string[] = [];
  private running = false;
  private closed = false;
  /** Bumped by `cancel()` so an in-flight synthesis knows it has been superseded. */
  private generation = 0;
  private index = 0;

  constructor(private readonly opts: SpeechQueueOptions) {}

  get size(): number {
    return this.pending.length;
  }

  get busy(): boolean {
    return this.running || this.pending.length > 0;
  }

  push(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || this.closed) return;
    this.pending.push(trimmed);
    void this.drain();
  }

  /** No more sentences are coming. `onIdle` fires once the backlog has been handed over. */
  end(): void {
    if (this.closed) return;
    this.closed = true;
    if (!this.running && this.pending.length === 0) this.opts.onIdle?.();
  }

  /** Drop everything queued and disown anything in flight. The queue is reusable afterwards. */
  cancel(): void {
    this.generation++;
    this.pending = [];
    this.running = false;
    this.closed = false;
    this.index = 0;
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const generation = this.generation;

    try {
      while (this.pending.length) {
        const text = this.pending.shift()!;
        try {
          await this.opts.speak(text, this.index++);
        } catch (err) {
          if (generation !== this.generation) return;
          this.opts.onError?.(err as Error, text);
        }
        // A cancel landed while we were awaiting: stop without touching shared state, which the
        // newer generation now owns.
        if (generation !== this.generation) return;
      }
    } finally {
      if (generation === this.generation) {
        this.running = false;
        if (this.closed) this.opts.onIdle?.();
      }
    }
  }
}
