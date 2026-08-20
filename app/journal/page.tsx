import type { Metadata } from "next";
import JournalClient from "./JournalClient";
import "./journal.css";
export const metadata: Metadata = {
    title: "Cura Journal | Your quiet notebook",
    description: "A warm journal space for daily reflection, prompts, and private notes.",
};
export default function JournalPage() {
    return <JournalClient />;
}
