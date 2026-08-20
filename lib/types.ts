export type MessageRole = "user" | "assistant";

export type RiskLevel = "none" | "low" | "medium" | "high";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  riskLevel?: RiskLevel;
}

export interface GuidedActivity {
  id: string;
  label: string;
  description: string;
  icon: string;
  prompt: string;
}

export interface CrisisResource {
  name: string;
  number: string;
  description: string;
  url?: string;
}

export interface ChatResponse {
  content: string;
  riskLevel: RiskLevel;
  crisisResources?: CrisisResource[];
}
