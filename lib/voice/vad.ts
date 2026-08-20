import type { MicVAD, RealTimeVADOptions } from "@ricky0123/vad-web";
export type VadHandle = {
    start(): Promise<void>;
    pause(): Promise<void>;
    destroy(): Promise<void>;
    readonly listening: boolean;
};
export type VadCallbacks = {
    onSpeechStart?: () => void;
    onSpeechEnd: (audio: Float32Array) => void;
    onMisfire?: () => void;
    onFrame?: (probability: number) => void;
};
const TUNING = {
    redemptionMs: 1200,
    minSpeechMs: 300,
    preSpeechPadMs: 320,
    positiveSpeechThreshold: 0.6,
    negativeSpeechThreshold: 0.45,
} as const;
export async function createVad(callbacks: VadCallbacks): Promise<VadHandle> {
    const { MicVAD: Mic } = await import("@ricky0123/vad-web");
    const options: Partial<RealTimeVADOptions> = {
        model: "v5",
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        startOnLoad: false,
        submitUserSpeechOnPause: false,
        ...TUNING,
        getStream: () => navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        }),
        pauseStream: async (stream) => {
            for (const track of stream.getAudioTracks())
                track.enabled = false;
        },
        resumeStream: async (stream) => {
            for (const track of stream.getAudioTracks())
                track.enabled = true;
            return stream;
        },
        onSpeechStart: () => callbacks.onSpeechStart?.(),
        onSpeechEnd: (audio) => callbacks.onSpeechEnd(audio),
        onVADMisfire: () => callbacks.onMisfire?.(),
        onFrameProcessed: callbacks.onFrame
            ? (probs) => callbacks.onFrame?.(probs.isSpeech)
            : undefined,
    };
    let vad: MicVAD;
    try {
        vad = await Mic.new(options);
    }
    catch (err) {
        throw new VadError((err as Error).message);
    }
    return {
        start: () => vad.start(),
        pause: () => vad.pause(),
        destroy: () => vad.destroy(),
        get listening() {
            return vad.listening;
        },
    };
}
export class VadError extends Error {
    constructor(message: string) {
        super(/permission|denied|NotAllowed/i.test(message)
            ? "Microphone access was denied. Type instead, or allow the mic and reload."
            : `Microphone setup failed: ${message}`);
        this.name = "VadError";
    }
}
