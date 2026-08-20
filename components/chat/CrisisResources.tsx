"use client";

import type { CrisisResource } from "@/lib/types";

interface CrisisResourcesProps {
  resources: CrisisResource[];
  onClose: () => void;
}

export default function CrisisResources({
  resources,
  onClose,
}: CrisisResourcesProps) {
  if (resources.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Support is available
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              You do not have to go through this alone. Please reach out.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.name}
              className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
            >
              <p className="font-semibold text-red-700 dark:text-red-300">
                {resource.name}
              </p>
              <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
                {resource.number}
              </p>
              <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
                {resource.description}
              </p>
              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-red-600 underline dark:text-red-400"
                >
                  Visit website
                </a>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          I understand
        </button>
      </div>
    </div>
  );
}
