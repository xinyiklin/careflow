import { Monitor, Moon, Sun } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import type { KeyboardEvent } from "react";

import { useTheme, type ThemeChoice } from "./ThemeProvider";

type Option = {
  value: ThemeChoice;
  labelKey: string;
  Icon: typeof Sun;
};

const OPTIONS: readonly Option[] = [
  { value: "light", labelKey: "common.themeLight", Icon: Sun },
  { value: "dark", labelKey: "common.themeDark", Icon: Moon },
  { value: "system", labelKey: "common.themeSystem", Icon: Monitor },
] as const;

type ThemeToggleProps = {
  /** Visual size. `compact` is icon-only; `full` shows label text. */
  size?: "compact" | "full";
  /** Optional className applied to the outer wrapper. */
  className?: string;
};

export function ThemeToggle({
  size = "compact",
  className = "",
}: ThemeToggleProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = OPTIONS.findIndex((option) => option.value === theme);
    let nextIndex = currentIndex;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + OPTIONS.length) % OPTIONS.length;
        break;
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % OPTIONS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = OPTIONS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setTheme(OPTIONS[nextIndex].value);
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [nextIndex]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={t("common.theme")}
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-soft p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, labelKey, Icon }) => {
        const isActive = theme === value;
        const label = t(labelKey);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setTheme(value)}
            className={[
              "inline-flex items-center justify-center gap-1.5 rounded transition-colors",
              size === "compact" ? "h-7 w-7" : "h-8 px-2.5 text-xs font-medium",
              isActive
                ? "bg-surface text-text shadow-[var(--shadow-sm)]"
                : "text-text-muted hover:text-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
            ].join(" ")}
          >
            <Icon size={14} aria-hidden="true" />
            {size === "full" ? <span>{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
