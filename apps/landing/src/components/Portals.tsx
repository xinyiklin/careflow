import { Check } from "lucide-react";
import { ButtonLink } from "./Button";
import { ScreenFrame } from "./ScreenFrame";
import { Reveal } from "./Reveal";
import { PORTALS } from "../content";

export function Portals() {
  return (
    <section
      id="portals"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24"
    >
      <Reveal className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-cf-text sm:text-4xl">
          Two ways in
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-cf-text-muted">
          The same data, two surfaces. Staff work in the clinician app; patients
          get a read-first portal. Pick a door.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {PORTALS.map((portal, i) => (
          <Reveal key={portal.key} delay={i * 90} className="flex flex-col">
          <article className="cf-panel cf-lift flex h-full flex-col overflow-hidden">
            <ScreenFrame
              src={portal.shot}
              alt={portal.shotAlt}
              host={portal.host}
              caption={`${portal.name} preview`}
              bare
              className="border-b border-cf-border"
            />
            <div className="flex flex-1 flex-col p-6">
              <h3 className="text-xl font-semibold tracking-tight text-cf-text">
                {portal.name}
              </h3>
              <p className="mt-1 text-sm text-cf-text-subtle">
                {portal.tagline}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-cf-text-muted">
                {portal.description}
              </p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {portal.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-cf-success-text"
                      aria-hidden="true"
                    />
                    <span className="text-sm leading-relaxed text-cf-text-muted">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-2">
                <ButtonLink href={portal.href} variant="primary" external>
                  {portal.cta}
                </ButtonLink>
              </div>
            </div>
          </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
