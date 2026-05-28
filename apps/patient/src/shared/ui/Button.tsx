import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-accent text-accent-contrast border border-accent",
    "hover:bg-accent-hover hover:border-accent-hover",
    "disabled:opacity-60 disabled:cursor-not-allowed"
  ),
  secondary: cn(
    "bg-surface text-text border border-border",
    "hover:bg-surface-soft hover:border-border-strong",
    "disabled:opacity-60 disabled:cursor-not-allowed"
  ),
  ghost: cn(
    "bg-transparent text-text-muted border border-transparent",
    "hover:bg-accent-soft hover:text-accent",
    "disabled:opacity-60 disabled:cursor-not-allowed"
  ),
  danger: cn(
    "bg-danger-soft text-danger border border-danger-soft",
    "hover:border-danger",
    "disabled:opacity-60 disabled:cursor-not-allowed"
  ),
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-md",
  lg: "h-12 px-5 text-base gap-2 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leadingIcon,
      trailingIcon,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cn(
          "inline-flex items-center justify-center font-medium tracking-tight whitespace-nowrap",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "active:translate-y-px",
          SIZE_CLASS[size],
          VARIANT_CLASS[variant],
          fullWidth && "w-full",
          className
        )}
        {...rest}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : leadingIcon ? (
          <span className="inline-flex shrink-0">{leadingIcon}</span>
        ) : null}
        {children ? <span>{children}</span> : null}
        {!isLoading && trailingIcon ? (
          <span className="inline-flex shrink-0">{trailingIcon}</span>
        ) : null}
      </button>
    );
  }
);
