import { ArrowUpRight } from "lucide-react";
import { CREATOR, GITHUB_URL, SIBLINGS } from "../content";
import { BrandMark } from "./BrandMark";

const LINK =
  "rounded-sm transition-colors duration-150 hover:text-cf-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-text";

// The shared maker colophon: what this is, what it is made of, and the rest of
// the work from the same hand. RoleFit AI's landing closes the same way.
export function SiteFooter() {
  return (
    <footer className="border-t border-cf-border bg-cf-surface-muted">
      <div className="cf-page-shell grid gap-10 py-14 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="text-[15px] font-semibold tracking-tight text-cf-text">
              CareFlow
            </span>
          </div>
          <p className="mt-4 max-w-[19rem] text-sm leading-relaxed text-cf-text-muted">
            An EHR-style clinic workflow demo, designed and built by{" "}
            <a
              href={CREATOR.href}
              className={`text-cf-text underline decoration-cf-border-strong underline-offset-4 ${LINK}`}
            >
              {CREATOR.name}
            </a>
            .
          </p>
        </div>

        <div className="md:col-span-4">
          <h2 className="cf-label text-cf-text-subtle">Colophon</h2>
          <p className="mt-4 max-w-[22rem] text-sm leading-relaxed text-cf-text-muted">
            React, TypeScript, Vite, and Tailwind CSS on AWS Amplify. Django
            REST Framework and PostgreSQL, with the API on Render. Set in Inter
            and JetBrains Mono.
          </p>
        </div>

        <div className="md:col-span-4">
          <h2 className="cf-label text-cf-text-subtle">
            Also by {CREATOR.name}
          </h2>
          <ul className="mt-3">
            {SIBLINGS.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={`group flex items-baseline justify-between gap-4 border-b border-cf-border py-2.5 text-sm ${LINK}`}
                >
                  <span className="font-medium text-cf-text">{item.name}</span>
                  <span className="inline-flex items-center gap-1 text-cf-text-subtle group-hover:text-cf-text">
                    {item.note}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-cf-border">
        <div className="cf-page-shell flex flex-col gap-2 py-5 text-xs text-cf-text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {CREATOR.name}. Synthetic data, not a medical service.</p>
          <a
            href={GITHUB_URL}
            className={`inline-flex items-center gap-1 ${LINK}`}
          >
            Source on GitHub
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
