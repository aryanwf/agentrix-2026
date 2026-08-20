import type {
  Message,
  ChatResponse,
  CrisisResource,
  GuidedActivity,
} from "./types";

export type { GuidedActivity } from "./types";

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    number: "988",
    description: "24/7 free, confidential support",
    url: "https://988lifeline.org",
  },
  {
    name: "Crisis Text Line",
    number: "Text HOME to 741741",
    description: "Free 24/7 crisis counseling via text",
  },
  {
    name: "SAMHSA Helpline",
    number: "1-800-662-4357",
    description: "Free mental health referrals and information",
  },
];

export const GUIDED_ACTIVITIES: GuidedActivity[] = [
  {
    id: "breathing",
    label: "Breathing Exercise",
    description: "A calm breathing routine to help you settle",
    icon: "🫁",
    prompt:
      "Guide me through a 4-7-8 breathing exercise. Give me step-by-step instructions and tell me when to inhale, hold, and exhale.",
  },
  {
    id: "grounding",
    label: "Grounding (5-4-3-2-1)",
    description: "Reconnect with the present using your senses",
    icon: "🌿",
    prompt:
      "Guide me through the 5-4-3-2-1 grounding exercise. Walk me through each step slowly.",
  },
  {
    id: "mood-checkin",
    label: "Mood Check-in",
    description: "A quick reflective check on how you are feeling",
    icon: "💭",
    prompt:
      "Help me check in with my mood. Ask me how I am feeling, what emotions are present, and offer some gentle reflection.",
  },
  {
    id: "journaling",
    label: "Journal Prompt",
    description: "A writing prompt to explore your thoughts",
    icon: "📝",
    prompt:
      "Give me a gentle journaling prompt to help me reflect on something positive from today.",
  },
];

const DEFAULT_RESPONSES = [
  "I hear you. Thank you for sharing that with me. Would you like to explore that feeling a bit more?",
  "That sounds like a lot to carry. You are not alone in this. I am here to listen.",
  "It takes courage to talk about what you are going through. Let us take this one step at a time.",
  "I appreciate you opening up. Sometimes just saying things out loud can help lighten the weight.",
];

const KEYWORD_RESPONSES: Record<string, string> = {
  stressed:
    "It sounds like you are under a lot of pressure right now. Stress can feel overwhelming, but there are small things we can do to help. Would you like to try a quick breathing exercise?",
  sad: "I am sorry you are feeling this way. Sadness is a natural emotion, and it is okay to sit with it. Would you like to talk more about what is on your mind?",
  anxious: "Anxiety can be really uncomfortable. Let us try to ground ourselves. Can you name three things you can see around you right now?",
  crisis:
    "I want you to know that help is available right now. You do not have to go through this alone. Please reach out to one of these resources — they are free, confidential, and available 24/7.",
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectRisk(text: string): "none" | "low" | "medium" | "high" {
  const lower = text.toLowerCase();
  const crisisKeywords = [
    "kill myself",
    "suicide",
    "end my life",
    "want to die",
    "no reason to live",
    "self-harm",
    "hurt myself",
  ];
  const highKeywords = ["hopeless", "no way out", "can't go on", "give up on life"];
  const mediumKeywords = [
    "depressed",
    "can't cope",
    "falling apart",
    "breaking down",
    "worthless",
  ];

  if (crisisKeywords.some((k) => lower.includes(k))) return "high";
  if (highKeywords.some((k) => lower.includes(k))) return "high";
  if (mediumKeywords.some((k) => lower.includes(k))) return "medium";
  if (
    lower.includes("sad") ||
    lower.includes("anxious") ||
    lower.includes("stressed") ||
    lower.includes("worried")
  )
    return "low";
  return "none";
}

function generateResponse(userMessage: string): ChatResponse {
  const riskLevel = detectRisk(userMessage);
  const lower = userMessage.toLowerCase();

  let content: string;
  if (riskLevel === "high") {
    content = KEYWORD_RESPONSES.crisis;
  } else if (lower.includes("stress")) {
    content = KEYWORD_RESPONSES.stressed;
  } else if (lower.includes("sad") || lower.includes("unhappy")) {
    content = KEYWORD_RESPONSES.sad;
  } else if (lower.includes("anxious") || lower.includes("anxiety") || lower.includes("worry")) {
    content = KEYWORD_RESPONSES.anxious;
  } else {
    content = pickRandom(DEFAULT_RESPONSES);
  }

  return {
    content,
    riskLevel,
    crisisResources: riskLevel === "high" ? CRISIS_RESOURCES : undefined,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendMessage(
  messages: Message[],
  onChunk: (chunk: string) => void,
): Promise<ChatResponse> {
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  const userText = lastUserMessage?.content ?? "";

  await delay(600 + Math.random() * 800);

  const response = generateResponse(userText);
  const words = response.content.split(" ");
  let accumulated = "";

  for (let i = 0; i < words.length; i++) {
    accumulated += (i === 0 ? "" : " ") + words[i];
    onChunk(accumulated);
    await delay(30 + Math.random() * 50);
  }

  return response;
}
