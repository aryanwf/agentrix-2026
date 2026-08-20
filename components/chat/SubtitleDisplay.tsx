"use client";

export default function SubtitleDisplay({
  text,
  visible,
}: {
  text: string;
  visible: boolean;
}) {
  if (!visible || !text) return null;

  return (
    <div className="w-full border-b border-zinc-200 bg-gradient-to-b from-teal-50 to-white px-6 py-4 dark:border-zinc-800 dark:from-teal-950/30 dark:to-transparent">
      <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-zinc-700 dark:text-zinc-200">
        {text}
      </p>
    </div>
  );
}
