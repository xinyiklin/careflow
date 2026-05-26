import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: ReactNode;
};

type SegmentedControlProps<TValue extends string> = {
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  size?: "xs" | "sm" | "md";
  variant?: "default" | "pill" | "loose";
  disabled?: boolean;
  className?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  size = "sm",
  variant = "default",
  disabled,
  className,
}: SegmentedControlProps<TValue>) {
  const groupRef = useRef<HTMLDivElement>(null);

  const sizeStyles = {
    xs: { height: "min-h-7", text: "text-[10px]", px: "px-2" },
    sm: { height: "min-h-9", text: "text-xs", px: "px-3" },
    md: { height: "min-h-10", text: "text-sm", px: "px-3" },
  }[size];

  const isPill = variant === "pill";
  const isLoose = variant === "loose";

  function handleKeyDown(event: KeyboardEvent) {
    const idx = options.findIndex((o) => o.value === value);
    let next = -1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (idx + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (idx - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = options.length - 1;
    }

    if (next >= 0) {
      event.preventDefault();
      onChange(options[next].value);
      const buttons =
        groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons?.[next]?.focus();
    }
  }

  return (
    <div
      ref={groupRef}
      className={joinClasses(
        "flex",
        isLoose ? "gap-1.5" : "overflow-hidden",
        isPill
          ? "rounded-full bg-cf-page-bg border border-cf-border p-0.5 gap-0.5"
          : isLoose
            ? ""
            : "rounded-xl bg-cf-surface-soft border border-cf-border/80",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
      role="radiogroup"
      onKeyDown={handleKeyDown}
    >
      {options.map(({ label, value: optionValue, icon }) => {
        const isActive = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={joinClasses(
              "flex items-center justify-center gap-1.5 whitespace-nowrap font-bold transition-all duration-150",
              !isLoose && "flex-1",
              sizeStyles.height,
              sizeStyles.text,
              sizeStyles.px,
              isPill || isLoose ? "rounded-full" : "rounded-none",
              isActive
                ? isLoose
                  ? "bg-cf-accent text-cf-page-bg shadow-sm"
                  : isPill
                    ? "bg-cf-text text-cf-page-bg shadow-sm"
                    : "bg-cf-surface text-cf-text font-extrabold"
                : isLoose
                  ? "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text"
                  : isPill
                    ? "text-cf-text-muted hover:text-cf-text hover:bg-cf-surface"
                    : "text-cf-text-subtle hover:text-cf-text hover:bg-cf-surface-muted/35"
            )}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
