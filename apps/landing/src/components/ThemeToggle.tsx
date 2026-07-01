import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, getStoredTheme, type ThemeChoice } from "../app/theme";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];
const NEXT_LABEL: Record<ThemeChoice, string> = {
  system: "Switch to light theme",
  light: "Switch to dark theme",
  dark: "Switch to system theme",
};

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  // Sync from storage after mount; the index.html pre-paint script already set
  // the attribute, so this only aligns component state.
  useEffect(() => {
    setChoice(getStoredTheme());
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    setChoice(next);
    applyTheme(next);
  }

  const Icon = choice === "light" ? Sun : choice === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={NEXT_LABEL[choice]}
      title={NEXT_LABEL[choice]}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-cf-control)] border border-cf-border bg-cf-surface text-cf-text-muted transition-colors duration-150 hover:border-cf-border-strong hover:text-cf-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-accent"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
