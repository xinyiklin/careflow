import type { HTMLAttributes } from "react";

import { cn } from "./cn";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Render as N stacked rectangles (text-line style). When omitted, the
   * Skeleton fills its container as a single block.
   */
  lines?: number;
};

export function Skeleton({ className, lines, ...rest }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={cn("flex flex-col gap-2", className)} {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3 rounded-md bg-surface-soft",
              i === lines - 1 ? "w-2/3" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={cn("h-full w-full rounded-md bg-surface-soft", className)}
      {...rest}
    />
  );
}
