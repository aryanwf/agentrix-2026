import type { Metadata } from "next";
import SessionClient from "@/components/SessionClient";

export const metadata: Metadata = {
  title: "Cura — session",
  description: "Talk to Cura, an AI companion that listens.",
};

export default function SessionPage() {
  return <SessionClient />;
}
