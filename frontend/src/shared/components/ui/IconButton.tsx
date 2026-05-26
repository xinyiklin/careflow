import type { MouseEvent, ReactNode } from "react";

type IconButtonProps = {
  icon: ReactNode;
  label: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: "sm" | "md";
  variant?: "default" | "ghost";
  disabled?: boolean;
  className?: string;
};

export default function IconButton({
  icon,
  label,
  onClick,
  size = "md",
  variant = "default",
  disabled = false,
  className = "",
}: IconButtonProps) {
  const sizeClass = size === "sm" ? "h-7 w-7 rounded-lg" : "h-8 w-8 rounded-xl";

  const variantClass =
    variant === "ghost"
      ? "text-cf-text-subtle hover:bg-cf-surface-muted hover:text-cf-text"
      : "border border-cf-border bg-cf-surface text-cf-text-subtle shadow-sm hover:bg-cf-surface-muted hover:text-cf-text";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        "inline-flex shrink-0 items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        sizeClass,
        variantClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon}
    </button>
  );
}
