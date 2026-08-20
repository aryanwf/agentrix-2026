import type { AvatarDescriptor, Mood, TalkingHead, TalkingHeadOptions, } from "@met4citizen/talkinghead";
export type { Mood, TalkingHead };
export const AVATAR_URL = "/avatars/cura.glb";
export const MOODS: Mood[] = ["neutral", "happy", "sad", "love", "fear", "angry"];
export const DEFAULT_OPTIONS: TalkingHeadOptions = {
    ttsEndpoint: "",
    ttsLang: "en-US",
    lipsyncModules: ["en"],
    lipsyncLang: "en",
    cameraView: "upper",
    cameraRotateEnable: false,
    modelFPS: 30,
    modelPixelRatio: 1,
    avatarMood: "neutral",
    avatarIdleEyeContact: 0.3,
    avatarSpeakingEyeContact: 0.6,
    lightAmbientIntensity: 2,
    lightDirectIntensity: 30,
};
export const DEFAULT_AVATAR: AvatarDescriptor = {
    url: AVATAR_URL,
    body: "F",
    avatarMood: "neutral",
    lipsyncLang: "en",
};
export type LoadOptions = {
    options?: TalkingHeadOptions;
    avatar?: Partial<AvatarDescriptor>;
    onProgress?: (fraction: number) => void;
};
export async function loadTalkingHead(node: HTMLElement, { options, avatar, onProgress }: LoadOptions = {}): Promise<TalkingHead> {
    const { TalkingHead: TalkingHeadClass } = (await import("../vendor/talkinghead/talkinghead.mjs")) as unknown as {
        TalkingHead: new (node: HTMLElement, opt?: TalkingHeadOptions) => TalkingHead;
    };
    const head = new TalkingHeadClass(node, { ...DEFAULT_OPTIONS, ...options });
    await head.showAvatar({ ...DEFAULT_AVATAR, ...avatar }, (e: ProgressEvent) => {
        if (onProgress && e.lengthComputable && e.total > 0) {
            onProgress(e.loaded / e.total);
        }
    });
    return head;
}
export const GESTURES = ["handup", "ok", "thumbup", "index", "side", "shrug", "namaste"] as const;
export type Gesture = (typeof GESTURES)[number];
