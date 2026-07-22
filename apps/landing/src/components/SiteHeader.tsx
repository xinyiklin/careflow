import type { MouseEvent } from "react";
import { CareFlowIcon } from "@careflow/ui-icons";
import { ButtonLink } from "./Button";
import { ThemeToggle } from "./ThemeToggle";
import { GITHUB_URL, NAV_LINKS } from "../content";

// Smooth-scroll to an in-page section without pushing a #hash onto the URL.
// The href stays a real anchor (no-JS fallback, screen-reader link semantics);
// we intercept the click so the address bar stays clean. Because preventDefault
// also suppresses the browser's native focus move to the fragment target, we
// replicate it: focus the section (tabIndex=-1 makes the container
// programmatically focusable without adding it to the tab order) so keyboard and
// SR users actually land there and continue from the section. scroll-mt-* clears
// the sticky header; reduced-motion falls back to an instant jump.
function handleAnchorClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("#")) return;
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block: "start",
  });
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-cf-border bg-cf-page-bg/80 backdrop-blur">
      <div className="cf-page-shell flex h-16 items-center justify-between gap-4">
        <a
          href="#top"
          onClick={(event) => handleAnchorClick(event, "#top")}
          className="flex items-center gap-2.5 rounded-[var(--radius-cf-control)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-accent"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-cf-control)] bg-cf-accent text-cf-surface">
            <CareFlowIcon className="h-[18px] w-[18px]" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-cf-text">
            CareFlow
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(event) => handleAnchorClick(event, link.href)}
              className="rounded-[var(--radius-cf-control)] px-3 py-2 text-sm text-cf-text-muted transition-colors duration-150 hover:text-cf-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* The clinician/patient portals are reachable from the Portals
              section and Hero, so the header links to the source instead.
              Visibility lives on the wrapper: ButtonLink's own `inline-flex`
              outranks `hidden` in the emitted utility order, so the link can't
              hide itself. */}
          {GITHUB_URL ? (
            <span className="hidden sm:block">
              <ButtonLink
                href={GITHUB_URL}
                variant="secondary"
                size="sm"
                external
              >
                GitHub
              </ButtonLink>
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
