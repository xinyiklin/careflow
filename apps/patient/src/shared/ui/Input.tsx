import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "./cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm text-text",
        "placeholder:text-text-subtle",
        "transition-colors",
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
});
