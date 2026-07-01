import { FlaskConical } from "lucide-react";
import { Reveal } from "./Reveal";

export function Disclaimer() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Reveal className="cf-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-cf-control)] bg-cf-surface-muted text-cf-text-muted">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-cf-text-muted">
          <span className="font-medium text-cf-text">
            A portfolio project, not a product.
          </span>{" "}
          Every patient, appointment, and record in CareFlow is synthetic. It
          handles no real patient data and makes no HIPAA or SOC 2 compliance
          claim.
        </p>
      </Reveal>
    </section>
  );
}
