import { ButtonLink } from "./Button";
import { ScreenFrame } from "./ScreenFrame";
import { Reveal } from "./Reveal";
import { PORTALS } from "../content";

const clinician = PORTALS.find((p) => p.key === "clinician")!;
const patient = PORTALS.find((p) => p.key === "patient")!;

export function Hero() {
  return (
    <section className="cf-page-shell pb-16 pt-16 md:pb-24 md:pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-cf-border bg-cf-surface/60 px-3 py-1 text-xs font-medium text-cf-text-muted backdrop-blur">
            <span
              className="h-1.5 w-1.5 rounded-full bg-cf-success-text"
              aria-hidden="true"
            />
            Live portfolio demo
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-cf-text sm:text-5xl">
            One clinic.
            <br />
            Two front doors.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-cf-text-muted">
            CareFlow is a full-stack EHR-style demo: a staff workspace and a
            patient portal over one facility-scoped Django API.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={clinician.href} variant="primary" external>
              {clinician.cta}
            </ButtonLink>
            <ButtonLink href={patient.href} variant="secondary" external>
              {patient.cta}
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={120} className="lg:col-span-7">
          <ScreenFrame
            src={clinician.shot}
            alt={clinician.shotAlt}
            caption="Clinician workspace preview"
            eager
          />
        </Reveal>
      </div>
    </section>
  );
}
