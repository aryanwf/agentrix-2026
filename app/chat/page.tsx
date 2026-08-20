"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "@/components/chat/ChatMessage";
import SubtitleDisplay from "@/components/chat/SubtitleDisplay";
import ChatInput from "@/components/chat/ChatInput";
import GuidedActivities from "@/components/chat/GuidedActivities";
import CrisisResources from "@/components/chat/CrisisResources";
import { sendMessage, type GuidedActivity } from "@/lib/chatApi";
import type { Message, CrisisResource } from "@/lib/types";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello, I am Cura. I am here to listen and support you. Feel free to share what is on your mind, or choose a guided activity below.",
  timestamp: Date.now(),
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [subtitle, setSubtitle] = useState(WELCOME_MESSAGE.content);
  const [loading, setLoading] = useState(false);
  const [crisisResources, setCrisisResources] = useState<CrisisResource[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setSubtitle("");

      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        },
      ]);

      const response = await sendMessage(
        [...messages, userMessage],
        (chunk) => {
          setSubtitle(chunk);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: chunk } : m,
            ),
          );
        },
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, riskLevel: response.riskLevel }
            : m,
        ),
      );

      if (response.crisisResources) {
        setCrisisResources(response.crisisResources);
      }

      setLoading(false);
    },
    [messages],
  );

  const handleActivity = useCallback(
    (activity: GuidedActivity) => {
      handleSend(activity.prompt);
    },
    [handleSend],
  );

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
      <SubtitleDisplay text={subtitle} visible={!loading || subtitle !== ""} />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {loading && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <GuidedActivities onSelect={handleActivity} disabled={loading} />
      <ChatInput onSend={handleSend} disabled={loading} />

      <CrisisResources
        resources={crisisResources}
        onClose={() => setCrisisResources([])}
      />
    </div>
  );
}
