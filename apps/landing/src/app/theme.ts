// Theme choice for the landing page. Mirrors the clinician/patient apps:
// an explicit "light"/"dark" sets a `data-theme` attribute on <html>; "system"
// removes it so CSS falls back to prefers-color-scheme. The pre-paint script in
// index.html applies the stored value before first paint to avoid a flash.

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "careflow_landing_theme";

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
