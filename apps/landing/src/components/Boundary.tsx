import { BOUNDARY, DOORS } from "../content";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";

const ROUTES: Record<string, { path: string; scope: string }> = {
  clinician: { path: "/v1/*", scope: "facility-scoped, role-aware" },
  patient: { path: "/v1/portal/*", scope: "one linked patient" },
};

function Node({
  host,
  caption,
  hub,
}: {
  host: string;
  caption: string;
  hub?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[var(--radius-cf-control)] border bg-cf-band-raised px-4 py-3",
        hub ? "border-cf-frost/45" : "border-cf-band-line",
      ].join(" ")}
    >
      <p className="truncate font-mono text-[13px] text-cf-band-text">{host}</p>
      <p className="mt-0.5 text-[13px] text-cf-band-muted">{caption}</p>
    </div>
  );
}

// Two hosts, two route namespaces, one API, one database. The two portal
// namespaces never overlap: a portal token cannot reach clinician routes.
function Wiring() {
  return (
    <figure className="mt-14 border-t border-cf-band-line pt-8">
      <figcaption className="cf-label text-cf-band-muted">
        How it's wired
      </figcaption>

      <div className="mt-6 grid items-center gap-y-3 lg:grid-cols-[minmax(0,15rem)_minmax(9rem,1fr)_minmax(0,16rem)_3rem_minmax(0,11rem)]">
        <div className="grid gap-3">
          {DOORS.map((door) => (
            <Node key={door.key} host={door.host} caption={door.name} />
          ))}
        </div>

        {/* Desktop: two wires merge into the API. Mobile: route list. */}
        <div
          className="relative hidden h-full min-h-[9rem] lg:block"
          aria-hidden="true"
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path className="cf-wire" d="M0 25 C 55 25, 45 50, 100 50" />
            <path className="cf-wire" d="M0 75 C 55 75, 45 50, 100 50" />
          </svg>
          <span className="absolute left-0 top-1/4 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cf-frost" />
          <span className="absolute left-0 top-3/4 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cf-frost" />
          <span className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent border-l-cf-frost" />
          {DOORS.map((door, i) => (
            <span
              key={door.key}
              className={`absolute left-4 font-mono text-[11px] leading-4 text-cf-band-muted ${i === 0 ? "top-[calc(25%-2.4rem)]" : "top-[calc(75%+0.45rem)]"}`}
            >
              <span className="block text-cf-band-text">
                {ROUTES[door.key].path}
              </span>
              {ROUTES[door.key].scope}
            </span>
          ))}
        </div>
        <ul className="grid gap-1 py-2 font-mono text-[12px] text-cf-band-muted lg:hidden">
          {DOORS.map((door) => (
            <li key={door.key}>
              ↓{" "}
              <span className="text-cf-band-text">{ROUTES[door.key].path}</span>{" "}
              · {ROUTES[door.key].scope}
            </li>
          ))}
        </ul>

        <Node
          host="api.careflow.xinyiklin.com"
          caption="Django REST Framework"
          hub
        />

        <div
          className="relative hidden h-px bg-cf-frost/50 lg:block"
          aria-hidden="true"
        >
          <span className="absolute -right-px top-1/2 h-0 w-0 -translate-y-1/2 border-y-[4px] border-l-[6px] border-y-transparent border-l-cf-frost" />
        </div>
        <p
          className="font-mono text-[12px] text-cf-band-muted lg:hidden"
          aria-hidden="true"
        >
          ↓
        </p>

        <Node host="PostgreSQL" caption="One database" />
      </div>

      <p className="mt-6 max-w-[44rem] text-sm leading-relaxed text-cf-band-muted">
        Patient-adjacent staff routes live under{" "}
        <code className="text-cf-band-text">/v1/</code> and check facility and
        role on every request. The portal lives entirely under{" "}
        <code className="text-cf-band-text">/v1/portal/</code>, scoped to the
        one patient its account links to.
      </p>
    </figure>
  );
}

export function Boundary() {
  return (
    <section
      id="boundary"
      aria-labelledby="boundary-title"
      className="scroll-mt-16 border-y border-cf-band-line bg-cf-band"
    >
      <div className="cf-page-shell py-20 md:py-28">
        <SectionHead
          id="boundary-title"
          title="Facility scope is the invariant."
          inverse
        >
          Every patient, appointment, document, chart, and bill is bound to a
          facility. Crossing that line takes an explicit organization-level
          permission, and nothing here is real.
        </SectionHead>

        <Reveal className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
          {BOUNDARY.map((group, i) => (
            <div
              key={group.title}
              className={[
                "md:px-8",
                i === 0 ? "md:pl-0" : "md:border-l md:border-cf-band-line",
                i === BOUNDARY.length - 1 ? "md:pr-0" : "",
              ].join(" ")}
            >
              <h3 className="cf-label text-cf-frost">{group.title}</h3>
              <ul className="mt-4">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="border-t border-cf-band-line py-3 text-[15px] leading-snug text-cf-band-text"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>

        <Wiring />
      </div>
    </section>
  );
}
