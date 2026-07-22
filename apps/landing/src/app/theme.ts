// Theme choice for the landing page. Mirrors the clinician/patient apps:
// an explicit "light"/"dark" sets a `data-theme` attribute on <html>; "system"
// removes it so CSS falls back to prefers-color-scheme. The pre-paint script in
// index.html applies the stored value before first paint to avoid a flash.

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "careflow_landing_theme";
const THEME_COLORS = { light: "#f6f7f9", dark: "#0f172a" } as const;

function syncBrowserThemeColor(choice: ThemeChoice): void {
  const forced = document.querySelector<HTMLMetaElement>(
    "meta[data-theme-color-forced]",
  );
  const system = document.querySelectorAll<HTMLMetaElement>(
    "meta[data-theme-color-media]",
  );
  const useSystem = choice === "system";

  system.forEach((meta) => {
    meta.media = useSystem ? (meta.dataset.themeColorMedia ?? "") : "not all";
  });
  if (!forced) return;

  forced.media = useSystem ? "not all" : "all";
  if (choice !== "system") forced.content = THEME_COLORS[choice];
}

export function getStoredTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, etc.); fall through to system.
  }
  return "system";
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }
  syncBrowserThemeColor(choice);
  try {
    if (choice === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, choice);
    }
  } catch {
    // Ignore persistence failures; the in-page attribute still applies.
  }
}
