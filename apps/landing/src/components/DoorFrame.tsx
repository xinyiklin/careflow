import { useState } from "react";
import { Lock } from "lucide-react";
import { DOORS, type DoorKey } from "../content";
import { BrandMark } from "./BrandMark";

type Theme = "light" | "dark";

// Which theme shows at first paint (explicit data-theme wins, else the OS), so
// the visible variant of the default door wins the LCP priority race.
function initialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const THEMES: Theme[] = ["light", "dark"];

// A browser-style frame around the real capture of whichever door is
// selected. Both doors stay mounted and cross-fade, so switching is instant and
// the frame never changes height. A missing capture degrades to a labeled empty
// slot, never a mock UI built from divs.
export function DoorFrame({ active }: { active: DoorKey }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [first] = useState(initialTheme);
  const door = DOORS.find((d) => d.key === active) ?? DOORS[0];

  return (
    <figure className="overflow-hidden rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-surface shadow-panel-lg">
      <div className="flex h-11 items-center gap-3 border-b border-cf-border bg-cf-surface-muted px-4">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-cf-border-strong/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-cf-border-strong/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-cf-border-strong/70" />
        </span>
        <span className="mx-auto flex h-7 min-w-0 max-w-[22rem] flex-1 items-center justify-center gap-1.5 rounded-lg border border-cf-border bg-cf-surface px-3">
          <Lock
            className="h-3 w-3 shrink-0 text-cf-text-subtle"
            aria-hidden="true"
          />
          <span
            className="truncate font-mono text-xs text-cf-text-muted"
            aria-live="polite"
          >
            {door.host}
          </span>
        </span>
        <span className="w-[2.625rem]" aria-hidden="true" />
      </div>

      <div className="relative aspect-[16/10] bg-cf-surface-muted">
        {DOORS.map((d) => {
          const shown = d.key === active;
          return (
            <div
              key={d.key}
              aria-hidden={!shown}
              className={[
                "absolute inset-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
                shown ? "opacity-100" : "pointer-events-none opacity-0",
              ].join(" ")}
            >
              {THEMES.map((theme) => {
                const id = `${d.key}-${theme}`;
                const cls = `cf-shot-${theme} absolute inset-0`;
                if (failed[id]) {
                  return (
                    <div
                      key={theme}
                      className={`${cls} flex flex-col items-center justify-center gap-3 text-sm text-cf-text-subtle`}
                    >
                      <BrandMark />
                      {d.name} preview
                    </div>
                  );
                }
                const lead = d.key === "clinician" && theme === first;
                return (
                  <img
                    key={theme}
                    src={d.shot[theme]}
                    alt={shown ? d.shotAlt : ""}
                    width={1280}
                    height={800}
                    // The off-theme pair loads only if the theme changes.
                    loading={theme === first ? "eager" : "lazy"}
                    fetchPriority={lead ? "high" : "low"}
                    decoding="async"
                    onError={() => setFailed((f) => ({ ...f, [id]: true }))}
                    className={`${cls} h-full w-full object-cover object-top`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </figure>
  );
}
