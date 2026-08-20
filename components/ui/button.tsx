import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "icon" | "sm";
};

const variants = {
  default: "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 disabled:bg-zinc-300",
  ghost: "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
  outline: "border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50",
};

const sizes = {
  default: "h-10 px-4 py-2",
  icon: "h-9 w-9",
  sm: "h-8 px-3 text-xs",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
