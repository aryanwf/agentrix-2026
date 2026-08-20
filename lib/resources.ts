export type Helpline = {
    name: string;
    number: string;
    detail: string;
};
export const HELPLINES: Helpline[] = [
    { name: "Tele-MANAS", number: "14416", detail: "Government of India, free, 24/7" },
    { name: "KIRAN", number: "1800-599-0019", detail: "Ministry of Social Justice, 24/7, 13 languages" },
    { name: "Vandrevala Foundation", number: "9999-666-555", detail: "Free counselling, 24/7" },
    { name: "AASRA", number: "+91-98204-66726", detail: "Mumbai-based, 24/7" },
    { name: "iCall", number: "9152987821", detail: "TISS, Mon-Sat 10am-8pm" },
    { name: "Emergency", number: "112", detail: "Immediate danger — police, fire, ambulance" },
];
export const CRISIS_SCRIPT = [
    "I'm really glad you told me.",
    "I'm not able to keep you safe on my own, and I want you to talk to someone who can, right now.",
    "Tele-MANAS is free and open 24 hours — 14416.",
    "If you're in immediate danger, call 112.",
    "Can you do that while I stay here with you?",
];
export const FALLBACK_REPLY = [
    "Sorry, I lost my train of thought for a second there.",
    "I'm still here with you — could you tell me that part again?",
];
