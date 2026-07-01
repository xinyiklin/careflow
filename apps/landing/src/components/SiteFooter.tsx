import { CareFlowIcon } from "@careflow/ui-icons";
import { ArrowUpRight } from "lucide-react";
import { GITHUB_URL, PORTALS } from "../content";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-cf-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-cf-control)] bg-cf-accent text-cf-surface">
              <CareFlowIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-cf-text">
              CareFlow
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-cf-text-subtle">
            An EHR-style clinic workflow demo. A clinician workspace and a
            patient portal over one facility-scoped API.
          </p>
        </div>

        <nav
          className="flex flex-col gap-3"
          aria-label="Portals and links"
        >
          {PORTALS.map((portal) => (
            <a
              key={portal.key}
              href={portal.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-cf-text-muted transition-colors duration-150 hover:text-cf-text"
            >
              {portal.name}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ))}
          {GITHUB_URL ? (
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-cf-text-muted transition-colors duration-150 hover:text-cf-text"
            >
              Source
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </nav>
      </div>

      <div className="border-t border-cf-border">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-xs text-cf-text-subtle">
            &copy; 2026 Xinyi Lin. Built as a portfolio project.
          </p>
        </div>
      </div>
    </footer>
  );
}
