import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-11 w-full resize-none bg-transparent px-4 py-3 text-base leading-6 text-zinc-950 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
