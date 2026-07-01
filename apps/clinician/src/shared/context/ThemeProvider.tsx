import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";
import type { ThemePreference } from "../types/domain";

/** The concrete theme actually painted to the DOM. */
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  /** The user's stored preference; may be "system". */
  theme: ThemePreference;
  /** Always concrete: what the workspace is currently rendering. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  /** Flip the resolved theme to its opposite explicit value. */
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Mirrors the current preference for the pre-paint script in index.html. The
// authoritative theme is server-side (user preferences), unreadable before auth,
// so this local hint lets the next load apply the right theme without a flash.
// Keep this key in sync with the IIFE in apps/clinician/index.html.
const THEME_HINT_KEY = "cf-theme-hint";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// Seed from the same hint the index.html pre-paint script used, so the provider
// agrees with the already-applied `.dark` class and doesn't clobber it (which
// would flash) before AppShell syncs the authoritative server preference.
function getInitialPreference(): ThemePreference {
  try {
    const hint = window.localStorage.getItem(THEME_HINT_KEY);
    if (hint === "light" || hint === "dark" || hint === "system") return hint;
  } catch {
    // storage unavailable — fall through to "system"
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Seed from the local hint (matches the pre-paint script); AppShell later
  // syncs the authoritative server preference once the user loads.
  const [theme, setThemeState] =
    useState<ThemePreference>(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme()
  );

  // Track the OS preference so the resolved theme stays accurate while the user
  // is on "system".
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  // The palette's dark tokens live under `.dark` (index.css); keep the class in
  // sync with the resolved theme.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  // Persist the preference (not the resolved value) as the pre-paint hint, so a
  // "system" choice re-evaluates the OS on the next load rather than freezing a
  // stale light/dark.
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_HINT_KEY, theme);
    } catch {
      // storage unavailable (private mode / disabled) — the hint is best-effort
    }
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
