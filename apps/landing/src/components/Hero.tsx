import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { DOORS, SPECS, type DoorKey } from "../content";
import { DoorFrame } from "./DoorFrame";

export function Hero() {
  const [active, setActive] = useState<DoorKey>("clinician");
  const tabs = useRef<Partial<Record<DoorKey, HTMLButtonElement | null>>>({});

  // APG vertical tablist with automatic activation.
  function onTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const last = DOORS.length - 1;
    const next =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const key = DOORS[next].key;
    setActive(key);
    tabs.current[key]?.focus();
  }

  return (
    <section
      aria-labelledby="hero-title"
      className="cf-page-shell pb-16 pt-12 md:pb-20 md:pt-20"
    >
      <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-12">
        <div className="cf-enter lg:col-span-5 lg:pt-4">
          <p className="cf-label flex items-center gap-2 text-cf-text-muted">
            <span
              className="h-1.5 w-1.5 rounded-full bg-cf-success-text"
              aria-hidden="true"
            />
            Live demo · synthetic clinic
          </p>

          <h1
            id="hero-title"
            className="cf-display mt-5 text-[2.75rem] leading-[1.02] text-cf-text sm:text-[3.5rem] xl:text-[4.25rem]"
          >
            One clinic.
            <br />
            Two front doors.
          </h1>

          <p className="mt-6 max-w-[30rem] text-lg leading-relaxed text-cf-text-muted">
            CareFlow is a full-stack EHR-style demo: a staff workspace and a
            patient portal over one facility-scoped Django API.
          </p>

          <div className="mt-9">
            {/* Tabs and their "Open" links sit in sibling columns that share
                rows through subgrid, so the tablist owns only tabs. */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] overflow-hidden rounded-[var(--radius-cf-card)] border border-cf-border bg-cf-surface-muted/60">
              <div
                role="tablist"
                aria-label="CareFlow portals"
                aria-orientation="vertical"
                className="row-span-2 grid grid-rows-subgrid"
              >
                {DOORS.map((door, i) => {
                  const selected = door.key === active;
                  return (
                    <button
                      key={door.key}
                      ref={(el) => {
                        tabs.current[door.key] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`door-tab-${door.key}`}
                      aria-selected={selected}
                      aria-controls="door-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActive(door.key)}
                      onKeyDown={(event) => onTabKeyDown(event, i)}
                      className={[
                        "group flex min-w-0 items-start gap-3 py-4 pl-4 pr-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cf-text",
                        i > 0 ? "border-t border-cf-border" : "",
                        selected ? "bg-cf-surface" : "",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "mt-[0.4rem] flex h-3 w-3 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                          selected
                            ? "border-transparent"
                            : "border-cf-border-strong",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "cf-door-dot transition-transform duration-150",
                            selected ? "scale-100" : "scale-0",
                          ].join(" ")}
                          data-door={door.key}
                        />
                      </span>
                      <span className="min-w-0">
                        <span
                          className={[
                            "block text-[15px] font-semibold tracking-tight",
                            selected
                              ? "text-cf-text"
                              : "text-cf-text-muted group-hover:text-cf-text",
                          ].join(" ")}
                        >
                          {door.name}
                        </span>
                        <span className="mt-0.5 block text-sm text-cf-text-muted">
                          {door.audience}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="row-span-2 grid grid-rows-subgrid">
                {DOORS.map((door, i) => {
                  const selected = door.key === active;
                  return (
                    <div
                      key={door.key}
                      className={[
                        "flex items-center pr-3 transition-colors duration-150",
                        i > 0 ? "border-t border-cf-border" : "",
                        selected ? "bg-cf-surface" : "",
                      ].join(" ")}
                    >
                      <a
                        href={door.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={[
                          "inline-flex items-center gap-1 rounded-[var(--radius-cf-control)] px-3.5 py-2 text-sm font-medium transition-[background-color,color,filter] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-text",
                          selected
                            ? door.key === "patient"
                              ? "bg-cf-door-patient text-cf-on-door hover:brightness-[1.08]"
                              : "bg-cf-door-clinician text-cf-on-door hover:brightness-[1.15]"
                            : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
                        ].join(" ")}
                      >
                        Open
                        <span className="sr-only"> {door.name}</span>
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-sm text-cf-text-muted">
              Both portals sign in with{" "}
              <span className="font-medium text-cf-text">
                Continue with Demo
              </span>
              .
            </p>
          </div>
        </div>

        <div
          id="door-panel"
          role="tabpanel"
          aria-labelledby={`door-tab-${active}`}
          className="cf-enter lg:col-span-7"
        >
          <DoorFrame active={active} />
        </div>
      </div>

      <dl className="cf-enter mt-14 grid grid-cols-2 overflow-hidden rounded-[var(--radius-cf-card)] border border-cf-border bg-cf-surface sm:grid-cols-3 lg:grid-cols-5">
        {SPECS.map((spec) => (
          <div
            key={spec.label}
            className="-ml-px -mt-px border-l border-t border-cf-border px-5 py-4 last:col-span-2 sm:last:col-span-1"
          >
            <dt className="cf-label text-cf-text-subtle">{spec.label}</dt>
            <dd className="mt-1.5 text-[15px] font-medium text-cf-text">
              {spec.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
