import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

import { cn } from "./cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text",
          "placeholder:text-text-subtle",
          "transition-colors resize-y",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:border-accent",
          "disabled:cursor-not-allowed disabled:opacity-60",
          invalid
            ? "border-danger focus-visible:border-danger focus-visible:ring-danger/25"
            : "border-border-strong",
          className
        )}
        {...rest}
      />
    );
  }
);
