import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {}

function Badge({ className, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex min-h-7 items-center border border-[var(--vy-line)] bg-[rgba(255,252,242,0.55)] px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--vy-muted)]",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
