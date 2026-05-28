import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Card } from "../../../shared/ui";
import { formatDateOnly } from "../../../shared/utils/dates";
import { VitalsGrid } from "./VitalsGrid";
import type { PortalSummaryVisit } from "../api/medicalSummary";

type SoapField = {
  labelKey: string;
  value: string;
};

function buildSoapFields(visit: PortalSummaryVisit): SoapField[] {
  const note = visit.progress_note;
  if (!note) return [];
  return [
    { labelKey: "records.soapSubjective", value: note.subjective },
    { labelKey: "records.soapObjective", value: note.objective },
    { labelKey: "records.soapAssessment", value: note.assessment },
    { labelKey: "records.soapPlan", value: note.plan },
  ].filter((field) => field.value.trim().length > 0);
}

export function VisitCard({ visit }: { visit: PortalSummaryVisit }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const soap = buildSoapFields(visit);

  const provider =
    visit.provider_display_name?.trim() || t("records.unknownProvider");

  return (
    <Card padded={false} as="article">
      <header className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text">
            {formatDateOnly(visit.started_at)}
          </div>
          <div className="mt-0.5 text-xs text-text-muted">
            {provider} · {visit.facility_name}
          </div>
          {visit.reason ? (
            <div className="mt-1 text-xs text-text-subtle">{visit.reason}</div>
          ) : null}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          trailingIcon={
            expanded ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )
          }
        >
          {expanded ? t("records.hideDetails") : t("records.viewDetails")}
        </Button>
      </header>

      {expanded ? (
        <div className="space-y-5 border-t border-border px-5 py-5">
          {visit.vitals ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">
                {t("records.vitalsHeading")}
              </h3>
              <VitalsGrid vitals={visit.vitals} />
            </section>
          ) : null}

          {soap.length > 0 ? (
            <section className="space-y-4">
              {soap.map((field) => (
                <div key={field.labelKey}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">
                    {t(field.labelKey)}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                    {field.value}
                  </p>
                </div>
              ))}
            </section>
          ) : (
            <p className="text-sm text-text-muted">{t("records.noNote")}</p>
          )}

          {visit.progress_note?.signed_by_name ? (
            <p className="text-[11px] text-text-subtle">
              {t("records.signedBy", {
                name: visit.progress_note.signed_by_name,
                date: formatDateOnly(visit.progress_note.signed_at),
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
