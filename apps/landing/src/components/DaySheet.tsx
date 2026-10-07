import { useRef, type CSSProperties } from "react";
import { DAY, LANES, type DayBlock } from "../content";
import { SectionHead } from "./SectionHead";
import { useShownOnce } from "./Reveal";

type Row = { hour: string; blocks: DayBlock[] };

// Blocks that share an hour share a board row, like simultaneous bookings.
function toRows(blocks: DayBlock[]): Row[] {
  const rows: Row[] = [];
  for (const block of blocks) {
    const hour = `${Number(block.time.slice(0, 2))}:00`;
    const row = rows.at(-1);
    if (row?.hour === hour) row.blocks.push(block);
    else rows.push({ hour, blocks: [block] });
  }
  return rows;
}

const ROWS = toRows(DAY);
const laneIndex = (lane: DayBlock["lane"]) =>
  LANES.findIndex((l) => l.key === lane);
const laneOf = (lane: DayBlock["lane"]) => LANES[laneIndex(lane)];

export function DaySheet() {
  const board = useRef<HTMLDivElement>(null);
  const shown = useShownOnce(board);

  return (
    <section
      id="day"
      aria-labelledby="day-title"
      className="cf-page-shell scroll-mt-20 py-20 md:py-28"
    >
      <SectionHead id="day-title" title="A clinic day, end to end.">
        Front desk, clinicians, patients, and administrators work the same
        facility-scoped records. Every block is a workflow you can open in the
        demo.
      </SectionHead>

      <div
        ref={board}
        className={`cf-fill mt-12 overflow-hidden rounded-[var(--radius-cf-card)] border border-cf-border bg-cf-surface shadow-panel ${shown ? "is-shown" : ""}`}
      >
        {/* Lane headers, as on the clinician schedule's resource columns. */}
        <div
          aria-hidden="true"
          className="cf-board-grid hidden border-b border-cf-border bg-cf-surface-muted lg:grid"
        >
          <span className="cf-label flex items-center px-4 py-3 text-cf-text-subtle">
            EDT
          </span>
          {LANES.map((lane) => (
            <span
              key={lane.key}
              className="flex items-center justify-between gap-2 border-l border-cf-border px-4 py-3 text-sm font-semibold text-cf-text"
            >
              {lane.label}
              <span className="cf-door-dot" data-door={lane.door} />
            </span>
          ))}
        </div>

        <div className="relative">
          {/* Column rules behind the rows. */}
          <div
            aria-hidden="true"
            className="cf-board-grid pointer-events-none absolute inset-0 hidden lg:grid"
          >
            <span />
            {LANES.map((lane) => (
              <span key={lane.key} className="border-l border-cf-border" />
            ))}
          </div>

          <ol>
            {ROWS.map((row, r) => (
              <li
                key={row.hour}
                className="relative border-t border-cf-border first:border-t-0 lg:grid lg:cf-board-grid"
              >
                <span className="block px-4 pt-4 font-mono text-xs text-cf-text-subtle lg:py-4">
                  <time>{row.hour}</time>
                </span>
                {row.blocks.map((block) => {
                  const lane = laneOf(block.lane);
                  const style = {
                    "--row": r,
                    "--col": laneIndex(block.lane),
                    gridColumn: laneIndex(block.lane) + 2,
                  } as CSSProperties;
                  return (
                    <article
                      key={block.title}
                      style={style}
                      data-door={lane.door}
                      className="cf-appt m-3 p-3.5 lg:m-2 lg:self-start"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                        <span className="font-mono text-xs text-cf-text-muted">
                          {block.time}
                          <span className="lg:sr-only"> · {lane.label}</span>
                        </span>
                        <span className="cf-label inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cf-border bg-cf-surface px-2 py-0.5 text-[0.625rem] text-cf-text-muted">
                          <span
                            className="cf-door-dot h-1.5 w-1.5"
                            data-door={lane.door}
                            aria-hidden="true"
                          />
                          <span>{block.module}</span>
                        </span>
                      </header>
                      <h3 className="mt-2.5 text-[15px] font-semibold leading-snug tracking-tight text-cf-text">
                        <span className="sr-only">{lane.label}: </span>
                        {block.title}
                      </h3>
                      <p className="mt-1 text-[13.5px] leading-normal text-cf-text-muted">
                        {block.body}
                      </p>
                    </article>
                  );
                })}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-2 border-t border-cf-border bg-cf-surface-muted px-4 py-3 text-sm text-cf-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="inline-flex items-center gap-2">
              <span
                className="cf-door-dot"
                data-door="clinician"
                aria-hidden="true"
              />
              Clinician workspace
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="cf-door-dot"
                data-door="patient"
                aria-hidden="true"
              />
              Patient portal
            </span>
          </div>
          <span className="cf-label text-cf-text-muted">
            Illustrative day · synthetic clinic
          </span>
        </div>
      </div>
    </section>
  );
}
