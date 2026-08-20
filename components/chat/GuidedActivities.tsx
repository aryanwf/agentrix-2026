"use client";

import { useState } from "react";
import { GUIDED_ACTIVITIES, type GuidedActivity } from "@/lib/chatApi";

interface GuidedActivitiesProps {
  onSelect: (activity: GuidedActivity) => void;
  disabled?: boolean;
}

export default function GuidedActivities({
  onSelect,
  disabled,
}: GuidedActivitiesProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <span>Guided Activities</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4">
          {GUIDED_ACTIVITIES.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => {
                onSelect(activity);
                setExpanded(false);
              }}
              disabled={disabled}
              className="flex flex-col items-center gap-1 rounded-xl border border-zinc-200 bg-white p-3 text-center transition-colors hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-teal-500 dark:hover:bg-teal-950/30"
            >
              <span className="text-xl">{activity.icon}</span>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                {activity.label}
              </span>
              <span className="text-[10px] leading-tight text-zinc-400 dark:text-zinc-500">
                {activity.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
