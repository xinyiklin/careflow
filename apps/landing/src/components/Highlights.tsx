import { HIGHLIGHTS } from "../content";
import { Reveal } from "./Reveal";

// Deliberate bento rhythm: two half-width, then three thirds, then one
// full-width anchor. Exactly six cells for six items, no empty tiles.
const SPANS = [
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-6",
];

// Tint a couple of cells so the grid is not six identical white cards.
const TINTED = new Set([1, 5]);

export function Highlights() {
  return (
    <section
      id="highlights"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24"
    >
      <Reveal className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-cf-text sm:text-4xl">
          What's inside
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-cf-text-muted">
          The workflows a real clinic runs on, built as a coherent system rather
          than a screen tour.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 lg:grid-cols-6">
        {HIGHLIGHTS.map((item, i) => {
          const Icon = item.icon;
          const wide = SPANS[i] === "lg:col-span-6";
          return (
            <Reveal
              key={item.title}
              delay={i * 70}
              className={[SPANS[i], "flex flex-col"].join(" ")}
            >
              <article
                className={[
                  "cf-panel cf-lift flex h-full p-6",
                  wide
                    ? "flex-col gap-4 sm:flex-row sm:items-start sm:gap-5"
                    : "flex-col",
                  TINTED.has(i) ? "!bg-cf-surface-muted" : "",
                ].join(" ")}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-cf-control)] bg-cf-accent-soft text-cf-text">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className={wide ? "" : "flex flex-col"}>
                  <h3
                    className={[
                      "text-base font-semibold tracking-tight text-cf-text",
                      wide ? "" : "mt-4",
                    ].join(" ")}
                  >
                    {item.title}
                  </h3>
                  <p
                    className={[
                      "mt-2 text-sm leading-relaxed text-cf-text-muted",
                      wide ? "max-w-2xl" : "",
                    ].join(" ")}
                  >
                    {item.body}
                  </p>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
