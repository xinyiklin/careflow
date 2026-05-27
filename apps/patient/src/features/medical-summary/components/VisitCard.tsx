import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatDateOnly } from "../../../shared/utils/dates";
import { VitalsGrid } from "./VitalsGrid";
import type { PortalSummaryVisit } from "../api/medicalSummary";

type SoapField = {
  label: string;
  value: string;
};

function buildSoapFields(visit: PortalSummaryVisit): SoapField[] {
  const note = visit.progress_note;
  if (!note) return [];
  return [
    { label: "Subjective", value: note.subjective },
    { label: "Objective", value: note.objective },
    { label: "Assessment", value: note.assessment },
    { label: "Plan", value: note.plan },
  ].filter((field) => field.value.trim().length > 0);
}

export function VisitCard({ visit }: { visit: PortalSummaryVisit }) {
  const [expanded, setExpanded] = useState(false);
  const soap = buildSoapFields(visit);

  return (
    <article className="rounded-cf-card border border-cf-border bg-cf-surface">
      <header className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-cf-text">
            {formatDateOnly(visit.started_at)}
          </div>
          <div className="mt-0.5 text-xs text-cf-text-muted">
            {visit.provider_display_name || "—"} · {visit.facility_name}
          </div>
          {visit.reason ? (
            <div className="mt-1 text-xs text-cf-text-subtle">
              {visit.reason}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 rounded-cf-control border border-cf-border bg-cf-surface px-2.5 py-1 text-xs font-semibold text-cf-text-muted transition-colors hover:bg-cf-surface-soft hover:text-cf-text"
        >
          {expanded ? "Hide" : "View"}
          {expanded ? (
            <ChevronUp size={12} aria-hidden="true" />
          ) : (
            <ChevronDown size={12} aria-hidden="true" />
          )}
        </button>
      </header>

      {expanded ? (
        <div className="space-y-4 border-t border-cf-border px-4 py-4">
          {visit.vitals ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
                Vitals
              </h3>
              <VitalsGrid vitals={visit.vitals} />
            </section>
          ) : null}

          {soap.length > 0 ? (
            <section className="space-y-3">
              {soap.map((field) => (
                <div key={field.label}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
                    {field.label}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-cf-text">
                    {field.value}
                  </p>
                </div>
              ))}
            </section>
          ) : (
            <p className="text-sm text-cf-text-muted">
              No clinical note was recorded for this visit.
            </p>
          )}

          {visit.progress_note?.signed_by_name ? (
            <p className="text-[11px] text-cf-text-subtle">
              Signed by {visit.progress_note.signed_by_name} ·{" "}
              {formatDateOnly(visit.progress_note.signed_at)}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
