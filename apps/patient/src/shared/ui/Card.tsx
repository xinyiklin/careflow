import { forwardRef } from "react";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export type CardTone = "default" | "accent" | "muted";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padded?: boolean;
  tone?: CardTone;
  children?: ReactNode;
};

const TONE_CLASS: Record<CardTone, string> = {
  default: "bg-surface border-border",
  accent: "bg-accent-soft border-accent/20",
  muted: "bg-surface-soft border-border",
};

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  {
    as: Component = "section",
    padded = true,
    tone = "default",
    className,
    children,
    ...rest
  },
  ref
) {
  return (
    <Component
      ref={ref}
      className={cn(
        "rounded-lg border shadow-[var(--shadow-sm)]",
        TONE_CLASS[tone],
        padded && "p-5 sm:p-6",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});
