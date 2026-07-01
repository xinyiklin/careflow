import { useState } from "react";
import { CareFlowIcon } from "@careflow/ui-icons";
import { Lock } from "lucide-react";

import type { ThemedShot } from "../content";

type Resolved = "light" | "dark";

// Which theme is showing at first paint (explicit data-theme wins, else the OS).
// Used only to pick which eager hero variant wins the priority race — the
// off-theme variant still preloads for an instant swap, just at low priority so
// it doesn't compete with the LCP image.
function initialResolvedTheme(): Resolved {
  if (typeof document === "undefined") return "light";
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

type ScreenFrameProps = {
  src: ThemedShot;
  alt: string;
  /** Optional hostname shown in a slim address bar above the shot. */
  host?: string;
  caption: string;
  /** Drop the outer frame chrome so it nests flush inside a parent card. */
  bare?: boolean;
  /** Load eagerly + high priority. Use for the above-the-fold hero (its LCP). */
  eager?: boolean;
  className?: string;
};

// A browser-style frame around a real product screenshot. When the screenshot
// is not present yet, it degrades to an honest, clearly-empty media slot (the
// brand mark plus a caption), never a fake product UI built from divs.
export function ScreenFrame({
  src,
  alt,
  host,
  caption,
  bare = false,
  eager = false,
  className = "",
}: ScreenFrameProps) {
  // Track failure per variant. Both variants always fetch (the off-theme one is
  // display:none but still requested), so a shared flag would let a broken
  // HIDDEN image blank the good visible one. Each theme falls back on its own.
  const [failed, setFailed] = useState({ light: false, dark: false });
  const shell = bare ? "overflow-hidden" : "cf-frame";

  // Non-eager frames (portal cards, below the fold) load lazily at default
  // priority. The eager hero prioritizes only the variant that will show.
  const primary = eager ? initialResolvedTheme() : null;
  const priorityFor = (variant: Resolved) =>
    eager ? (primary === variant ? "high" : "low") : "auto";

  // One media element per theme, each carrying its cf-shot-* class so index.css
  // shows only the one matching the active theme. Only one is ever
  // `display: block`, so screen readers announce a single alt (or one caption).
  const variants: Resolved[] = ["light", "dark"];

  return (
    <div className={`${shell} ${className}`}>
      {host ? (
        <div className="flex items-center gap-2 border-b border-cf-border bg-cf-surface-muted px-4 py-2.5">
          <Lock className="h-3.5 w-3.5 text-cf-text-subtle" aria-hidden="true" />
          <span className="font-mono text-xs text-cf-text-subtle">{host}</span>
        </div>
      ) : null}

      <div className="relative aspect-[16/10] bg-cf-surface-muted">
        {variants.map((variant) => {
          const shotClass = `cf-shot-${variant} absolute inset-0`;
          return failed[variant] ? (
            <div key={variant} className={shotClass}>
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-cf-text-subtle">
                <CareFlowIcon className="h-8 w-8 text-cf-text-subtle" />
                <span className="text-sm">{caption}</span>
              </div>
            </div>
          ) : (
            <img
              key={variant}
              src={src[variant]}
              alt={alt}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={priorityFor(variant)}
              decoding="async"
              onError={() => setFailed((f) => ({ ...f, [variant]: true }))}
              className={`${shotClass} h-full w-full object-cover object-top`}
            />
          );
        })}
      </div>
    </div>
  );
}
