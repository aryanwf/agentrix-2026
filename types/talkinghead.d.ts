declare module "*/vendor/talkinghead/talkinghead.mjs" {
  export * from "@met4citizen/talkinghead";
}

declare module "@met4citizen/talkinghead" {
  export type Mood = "neutral" | "happy" | "angry" | "sad" | "fear" | "disgust" | "love" | "sleep";

  export interface TalkingHeadOptions {
    ttsEndpoint?: string | null;
    ttsApikey?: string | null;
    ttsLang?: string;
    ttsVoice?: string;
    ttsRate?: number;
    ttsPitch?: number;
    ttsVolume?: number;
    ttsTrimStart?: number;
    ttsTrimEnd?: number;
    lipsyncLang?: string;
    lipsyncModules?: string[];
    modelRoot?: string;
    modelPixelRatio?: number;
    modelFPS?: number;
    modelMovementFactor?: number;
    cameraView?: "full" | "mid" | "upper" | "head";
    cameraDistance?: number;
    cameraX?: number;
    cameraY?: number;
    cameraRotateEnable?: boolean;
    cameraPanEnable?: boolean;
    cameraZoomEnable?: boolean;
    lightAmbientIntensity?: number;
    lightDirectIntensity?: number;
    avatarMood?: Mood;
    avatarMute?: boolean;
    avatarIdleEyeContact?: number;
    avatarIdleHeadMove?: number;
    avatarSpeakingEyeContact?: number;
    avatarSpeakingHeadMove?: number;
    avatarIgnoreCamera?: boolean;
    dracoEnabled?: boolean;
    [key: string]: unknown;
  }

  export interface AvatarDescriptor {
    url: string;
    body?: "F" | "M";
    avatarMood?: Mood;
    lipsyncLang?: string;
    ttsLang?: string;
    ttsVoice?: string;
    [key: string]: unknown;
  }

  export interface SpeakOptions {
    avatarMute?: boolean;
    lipsyncLang?: string;
    ttsLang?: string;
    ttsVoice?: string;
    avatarMood?: Mood;
    [key: string]: unknown;
  }

  export interface Subtitle {
    word: string;
    [key: string]: unknown;
  }

  export class TalkingHead {
    constructor(node: HTMLElement, opt?: TalkingHeadOptions);
    audioCtx: AudioContext;
    lipsync: Record<string, unknown>;
    isSpeaking: boolean;
    showAvatar(
      avatar: AvatarDescriptor,
      onprogress?: (e: ProgressEvent) => void,
    ): Promise<void>;
    speakText(
      s: string,
      opt?: SpeakOptions,
      onsubtitles?: (word: string) => void,
      excludes?: [number, number][],
    ): void;
    speakAudio(
      r: {
        audio?: AudioBuffer;
        words?: string[];
        wtimes?: number[];
        wdurations?: number[];
        visemes?: string[];
        vtimes?: number[];
        vdurations?: number[];
      },
      opt?: SpeakOptions,
      onsubtitles?: (word: string) => void,
    ): void;
    speakBreak(ms: number): void;
    speakMarker(onmarker: () => void): void;
    pauseSpeaking(): void;
    stopSpeaking(): void;
    setMood(mood: Mood): void;
    getMood(): Mood;
    getMoodNames(): Mood[];
    playGesture(name: string, dur?: number, mirror?: boolean, ms?: number): void;
    stopGesture(ms?: number): void;
    playAnimation?(url: string, onprogress?: unknown, dur?: number): Promise<void>;
    lookAtCamera(t: number): void;
    lookAhead(t: number): void;
    makeEyeContact(t: number): void;
    setView(view: string, opt?: Record<string, unknown>): void;
    start(): void;
    stop(): void;
    dispose(): void;
  }
}
