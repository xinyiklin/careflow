import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "./cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded-md border bg-surface pl-3 pr-9 py-2 text-sm text-text",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:border-accent",
            "disabled:cursor-not-allowed disabled:opacity-60",
            invalid
              ? "border-danger focus-visible:border-danger focus-visible:ring-danger/25"
              : "border-border-strong",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle"
        />
      </div>
    );
  }
);
