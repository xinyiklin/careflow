import type { MouseEvent } from "react";
import { ButtonLink } from "./Button";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { CREATOR, GITHUB_URL, NAV_LINKS } from "../content";

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

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-text";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-cf-border bg-cf-page-bg/85 backdrop-blur-md">
      <div className="cf-page-shell flex h-16 items-center justify-between gap-4">
        {/* Shared maker masthead: product wordmark, then the creator tag. */}
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="#top"
            onClick={(event) => handleAnchorClick(event, "#top")}
            className={`flex items-center gap-2.5 rounded-[var(--radius-cf-control)] ${FOCUS}`}
          >
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-tight text-cf-text">
              CareFlow
            </span>
          </a>
          <span
            className="hidden h-4 w-px bg-cf-border-strong sm:block"
            aria-hidden="true"
          />
          <a
            href={CREATOR.href}
            className={`hidden rounded-sm text-sm text-cf-text-muted transition-colors duration-150 hover:text-cf-text sm:block ${FOCUS}`}
          >
            by {CREATOR.name}
          </a>
        </div>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Sections"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(event) => handleAnchorClick(event, link.href)}
              className={`rounded-[var(--radius-cf-control)] px-3 py-2 text-sm text-cf-text-muted transition-colors duration-150 hover:text-cf-text ${FOCUS}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Visibility lives on the wrapper: ButtonLink's own `inline-flex`
              outranks `hidden` in the emitted utility order. */}
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
        </div>
      </div>
    </header>
  );
}
