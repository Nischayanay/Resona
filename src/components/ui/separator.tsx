import * as React from "react";
import { cn } from "@/lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(orientation === "vertical" ? "h-full w-px" : "h-px w-full", "bg-[var(--vy-line)]", className)}
      {...props}
    />
  );
}

export { Separator };
