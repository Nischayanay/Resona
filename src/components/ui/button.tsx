import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap border px-5 text-sm font-semibold transition-[background,border-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vy-coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--vy-paper)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "border-[var(--vy-ink)] bg-[var(--vy-ink)] text-[var(--vy-paper)] hover:bg-[var(--vy-charcoal)]",
        outline: "border-[var(--vy-line)] bg-transparent text-[var(--vy-ink)] hover:border-[var(--vy-ink)] hover:bg-[rgba(31,34,31,0.04)]",
        ghost: "border-transparent bg-transparent text-[var(--vy-ink)] hover:bg-[rgba(31,34,31,0.05)]"
      },
      size: {
        default: "px-5",
        sm: "min-h-9 px-4 text-xs",
        lg: "min-h-12 px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
