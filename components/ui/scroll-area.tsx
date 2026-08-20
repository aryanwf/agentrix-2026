import * as React from "react";
import { cn } from "@/lib/utils";

export function ScrollArea({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("no-scrollbar overflow-y-auto", className)}
      {...props}
    />
  );
}
