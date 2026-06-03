import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

type TabOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: ReactNode;
};

type TabsProps<TValue extends string> = {
  options: readonly TabOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  /** Accessible name for the tablist (no visible label). */
  ariaLabel?: string;
  /**
   * Stable id root for APG tab↔panel wiring. When set, each tab gets an `id`
   * and `aria-controls` pointing at the panel. Pair it on the panel container
   * with `id={getTabPanelId(idBase)}` + `aria-labelledby={getTabId(idBase,
   * activeValue)}` + `role="tabpanel"`. Generate one per instance with
   * React's `useId()`. Omit it for a standalone, panel-less tab strip.
   */
  idBase?: string;
  /** Layout overrides on the tablist container (e.g. `shrink-0`). */
  className?: string;
};

/** Id of a single tab button — pair with `aria-labelledby` on its panel. */
export function getTabId(idBase: string, value: string) {
  return `${idBase}-tab-${value}`;
}

/**
 * Id of the (single, content-swapping) panel the tabs control — pair with
 * `aria-controls` on the tabs.
 */
export function getTabPanelId(idBase: string) {
  return `${idBase}-panel`;
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Underline tab strip — the canonical control for navigating between sibling
 * content panels that each replace the main body (Patient Hub sections, the
 * Refill inbox source switch). The active tab carries an accent underline and
 * sits on a content-edge rail (`-mb-px` overlaps a parent `border-b`).
 *
 * For reshaping or filtering a surface that stays in place, use
 * SegmentedControl instead. Decision rule:
 * `docs/engineering/ui-principles.md § Selector Controls`.
 */
export default function Tabs<TValue extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  idBase,
  className,
}: TabsProps<TValue>) {
  const tablistRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent) {
    const currentIndex = options.findIndex((option) => option.value === value);
    let nextIndex = -1;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }

    if (nextIndex < 0) return;
    event.preventDefault();
    onChange(options[nextIndex].value);
    const tabs =
      tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  }

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={joinClasses("flex items-end gap-0", className)}
    >
      {options.map(({ value: optionValue, label, icon }) => {
        const isActive = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            role="tab"
            id={idBase ? getTabId(idBase, optionValue) : undefined}
            aria-selected={isActive}
            aria-controls={idBase ? getTabPanelId(idBase) : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(optionValue)}
            className={joinClasses(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium whitespace-nowrap transition",
              isActive
                ? "border-cf-accent text-cf-text"
                : "border-transparent text-cf-text-muted hover:text-cf-text"
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
