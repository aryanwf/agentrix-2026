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
 *
 * That same pipelining is what makes barge-in tricky, and is why this class tracks `inFlight`
 * separately from `pending`. At any moment two or three sentences have been handed to TalkingHead
 * but not yet heard. If the user interrupts, those are *not* delivered content — they have to come
 * back and be spoken later. `notePlayed` (driven by a per-sentence marker) is what moves a sentence
 * from "handed over" to "actually heard", and `pause` puts everything still unheard back at the
 * front of `pending`, in order, ready to replay.
 */

export type SpeechQueueOptions = {
  /**
   * Resolves once the utterance is enqueued on the avatar, not once it has finished playing.
   * Must wire `onPlayed` through to the avatar so the queue learns when it was really heard.
   */
  speak: (text: string, index: number, onPlayed: () => void) => Promise<void>;
  onError?: (error: Error, text: string) => void;
  /** Every queued sentence has been handed to the avatar and the queue was closed. */
  onIdle?: () => void;
};

export class SpeechQueue {
  /** Not yet handed to the avatar. */
  private pending: string[] = [];
  /** Handed to the avatar but not yet confirmed *heard*. Replayed if the user barges in. */
  private inFlight: string[] = [];
  private running = false;
  private closed = false;
  private paused = false;
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

  /** True while a barge-in is holding the response back. */
  get isPaused(): boolean {
    return this.paused;
  }

  /** Response text that has been generated but not yet heard by the user. */
  get undelivered(): string {
    return [...this.inFlight, ...this.pending].join(" ");
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
    if (!this.running && !this.paused && this.pending.length === 0) this.opts.onIdle?.();
  }

  /**
   * Barge-in. Stops handing sentences over and rewinds everything still unheard back onto
   * `pending`, interrupted sentence first. The caller is responsible for clearing the avatar's own
   * buffer (`AvatarHandle.stop()`) — after that this queue is the only copy of the undelivered
   * response, which is exactly what makes it replayable.
   *
   * The interrupted sentence restarts from its beginning rather than mid-word: Web Audio cannot
   * rewind a stopped buffer. Cheap in practice because /api/tts is disk-cached by text hash, so the
   * replay is a cache hit rather than a fresh synthesis.
   */
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.pending = [...this.inFlight, ...this.pending];
    this.inFlight = [];
  }

  /** Undo `pause()` and start speaking the held-back response again, in order. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.pending.length) void this.drain();
    else if (this.closed && !this.running) this.opts.onIdle?.();
  }

  /** A sentence finished playing for real. Anything still in `inFlight` is still owed to the user. */
  private notePlayed(text: string): void {
    const at = this.inFlight.indexOf(text);
    if (at !== -1) this.inFlight.splice(at, 1);
  }

  /** Drop everything queued and disown anything in flight. The queue is reusable afterwards. */
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
    if (this.running || this.paused) return;
    this.running = true;
    const generation = this.generation;

    try {
      while (this.pending.length && !this.paused) {
        const text = this.pending.shift()!;
        this.inFlight.push(text);
        try {
          await this.opts.speak(text, this.index++, () => {
            if (generation === this.generation) this.notePlayed(text);
          });
        } catch (err) {
          if (generation !== this.generation) return;
          // It never reached the avatar, so it is not owed to the user as unheard content.
          this.notePlayed(text);
          this.opts.onError?.(err as Error, text);
        }
        // A cancel landed while we were awaiting: stop without touching shared state, which the
        // newer generation now owns.
        if (generation !== this.generation) return;
      }
    } finally {
      if (generation === this.generation) {
        this.running = false;
        if (this.closed && !this.paused && this.pending.length === 0) this.opts.onIdle?.();
      }
    }
  }
}
