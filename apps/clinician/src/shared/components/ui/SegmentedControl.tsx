import { useLayoutEffect, useRef, useState } from "react";
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

type ThumbStyle = {
  left: number;
  top: number;
  width: number;
  height: number;
  ready: boolean;
};

const HIDDEN_THUMB: ThumbStyle = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  ready: false,
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
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [thumb, setThumb] = useState<ThumbStyle>(HIDDEN_THUMB);

  const sizeStyles = {
    xs: { height: "min-h-7", text: "text-[10px]", px: "px-2" },
    sm: { height: "min-h-9", text: "text-xs", px: "px-3" },
    md: { height: "min-h-10", text: "text-sm", px: "px-3" },
  }[size];

  const isPill = variant === "pill";
  const isLoose = variant === "loose";
  // The sliding thumb only applies to the contiguous, equal-width variants.
  // `loose` renders detached pills, so each keeps its own background.
  const hasThumb = !isLoose;

  const activeIndex = options.findIndex((o) => o.value === value);

  useLayoutEffect(() => {
    if (!hasThumb) return;

    const measure = () => {
      const node = buttonRefs.current[activeIndex];
      if (!node) {
        setThumb((current) =>
          current.ready ? { ...current, ready: false } : current
        );
        return;
      }
      setThumb({
        left: node.offsetLeft,
        top: node.offsetTop,
        width: node.offsetWidth,
        height: node.offsetHeight,
        ready: true,
      });
    };

    measure();

    const group = groupRef.current;
    if (!group || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, [activeIndex, options.length, hasThumb, size, variant]);

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
        "relative flex",
        isLoose ? "gap-1.5" : "overflow-hidden",
        isPill
          ? "rounded-full bg-cf-page-bg border border-cf-border p-0.5 gap-0.5"
          : isLoose
            ? ""
            : "rounded-xl bg-cf-surface-soft border border-cf-border/80",
        // Pills stay at full opacity when disabled (e.g. while a security
        // matrix cell is saving) so toggling never flashes a dim; they remain
        // non-interactive via pointer-events. Other variants keep the dim cue.
        disabled &&
          (isPill ? "pointer-events-none" : "opacity-60 pointer-events-none"),
        className
      )}
      role="radiogroup"
      onKeyDown={handleKeyDown}
    >
      {hasThumb && thumb.ready ? (
        <span
          aria-hidden="true"
          className={joinClasses(
            "pointer-events-none absolute left-0 top-0 z-0 transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            isPill ? "rounded-full bg-cf-text shadow-sm" : "bg-cf-surface"
          )}
          style={{
            transform: `translate3d(${thumb.left}px, ${thumb.top}px, 0)`,
            width: thumb.width,
            height: thumb.height,
          }}
        />
      ) : null}

      {options.map(({ label, value: optionValue, icon }, index) => {
        const isActive = value === optionValue;

        return (
          <button
            key={optionValue}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={joinClasses(
              "relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap font-bold transition-colors duration-150",
              !isLoose && "flex-1",
              sizeStyles.height,
              sizeStyles.text,
              sizeStyles.px,
              isPill || isLoose ? "rounded-full" : "rounded-none",
              isActive
                ? isLoose
                  ? "bg-cf-accent text-cf-page-bg shadow-sm"
                  : isPill
                    ? "text-cf-page-bg"
                    : "text-cf-text font-extrabold"
                : isLoose
                  ? "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text"
                  : isPill
                    ? "text-cf-text-muted hover:text-cf-text hover:bg-cf-surface/60"
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
