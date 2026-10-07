import { ArrowUpRight, CodeXml } from "lucide-react";
import { DOORS, GITHUB_URL } from "../content";
import { ButtonLink } from "./Button";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

// The shared maker action ledger: name, audience, mono host, one action per
// row. RoleFit AI's download rows use the same grammar.
export function Doors() {
  const rows = [
    ...DOORS.map((door) => ({
      key: door.key,
      name: door.name,
      audience: door.audience,
      host: door.host,
      href: door.href,
      action: (
        <ButtonLink href={door.href} variant={door.key} size="sm" external>
          Open<span className="sr-only"> {door.name}</span>
        </ButtonLink>
      ),
      lead: (
        <span className="cf-door-dot" data-door={door.key} aria-hidden="true" />
      ),
    })),
    {
      key: "source",
      name: "Source",
      audience: "Django API, both portals, and this page",
      host: hostOf(GITHUB_URL),
      href: GITHUB_URL,
      action: (
        <ButtonLink href={GITHUB_URL} variant="secondary" size="sm" external>
          View<span className="sr-only"> source on GitHub</span>
        </ButtonLink>
      ),
      lead: (
        <CodeXml
          className="h-3.5 w-3.5 text-cf-text-subtle"
          aria-hidden="true"
        />
      ),
    },
  ];

  return (
    <section
      id="doors"
      aria-labelledby="doors-title"
      className="cf-page-shell scroll-mt-20 py-20 md:py-28"
    >
      <SectionHead id="doors-title" title="Open the demo.">
        Both portals sign in with “Continue with Demo”. Everything you touch is
        synthetic, so click anything.
      </SectionHead>

      <Reveal className="mt-12">
        <ul className="overflow-hidden rounded-[var(--radius-cf-card)] border border-cf-border bg-cf-surface shadow-panel">
          {rows.map((row, i) => (
            <li
              key={row.key}
              className={[
                "grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-5 py-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,16rem)_auto] md:px-6",
                i > 0 ? "border-t border-cf-border" : "",
              ].join(" ")}
            >
              <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-cf-text">
                <span className="flex w-3.5 justify-center">{row.lead}</span>
                {row.name}
              </span>
              <span className="col-start-1 row-start-2 pl-6 text-sm text-cf-text-muted md:col-start-auto md:row-start-auto md:pl-0">
                {row.audience}
              </span>
              <a
                href={row.href}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
                aria-hidden="true"
                className="hidden items-center gap-1 truncate font-mono text-xs text-cf-text-subtle hover:text-cf-text md:inline-flex"
              >
                {row.host}
                <ArrowUpRight className="h-3 w-3 shrink-0" />
              </a>
              <span className="col-start-2 row-span-2 row-start-1 md:col-start-auto md:row-span-1 md:row-start-auto">
                {row.action}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
