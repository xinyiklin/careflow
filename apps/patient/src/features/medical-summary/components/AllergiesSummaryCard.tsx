import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Badge,
  Card,
  EmptyState,
  Skeleton,
  type BadgeTone,
} from "../../../shared/ui";
import type { PortalSummaryAllergy } from "../api/medicalSummary";

const SEVERITY_ORDER: Record<string, number> = {
  life_threatening: 0,
  severe: 1,
  moderate: 2,
  mild: 3,
  unknown: 4,
};

const SEVERITY_TONE: Record<string, BadgeTone> = {
  life_threatening: "danger",
  severe: "danger",
  moderate: "warning",
  mild: "success",
  unknown: "neutral",
};

/**
 * Shared min-height so the loading / empty / populated states keep the
 * same outer dimensions while still allowing taller cards to grow when
 * the list of allergies is long.
 */
const SUMMARY_MIN_HEIGHT = "min-h-[176px]";

type AllergiesSummaryCardProps = {
  allergies: PortalSummaryAllergy[];
  loading?: boolean;
};

export function AllergiesSummaryCard({
  allergies,
  loading = false,
}: AllergiesSummaryCardProps) {
  const { t } = useTranslation();
  const count = allergies.length;

  if (loading) {
    return (
      <Card aria-busy="true" aria-live="polite" className={SUMMARY_MIN_HEIGHT}>
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton lines={3} className="mt-4" />
      </Card>
    );
  }

  if (count === 0) {
    return (
      <Card
        aria-labelledby="records-allergies-heading"
        className={SUMMARY_MIN_HEIGHT}
      >
        <p
          id="records-allergies-heading"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
        >
          <ShieldAlert size={13} aria-hidden="true" />
          {t("records.allergiesHeading")}
        </p>
        <div className="mt-3">
          <EmptyState
            icon={ShieldAlert}
            title={t("records.noAllergiesTitle")}
            description={t("records.noAllergiesBody")}
            className="border-none bg-transparent py-4"
          />
        </div>
      </Card>
    );
  }

  const sorted = [...allergies].sort((a, b) => {
    const aRank = SEVERITY_ORDER[a.severity] ?? 99;
    const bRank = SEVERITY_ORDER[b.severity] ?? 99;
    if (aRank !== bRank) return aRank - bRank;
    return a.allergen.localeCompare(b.allergen);
  });

  return (
    <Card
      aria-labelledby="records-allergies-heading"
      className={SUMMARY_MIN_HEIGHT}
    >
      <header className="flex items-baseline justify-between gap-3">
        <p
          id="records-allergies-heading"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
        >
          <ShieldAlert size={13} aria-hidden="true" />
          {t("records.allergiesHeading")}
        </p>
        <span className="text-xs text-text-muted">
          {t("records.allergiesCount", { count })}
        </span>
      </header>

      <ul className="mt-3 divide-y divide-border">
        {sorted.map((allergy) => {
          const tone = SEVERITY_TONE[allergy.severity] ?? "neutral";
          return (
            <li
              key={allergy.id}
              className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">
                  {allergy.allergen}
                </div>
                {allergy.reaction ? (
                  <div className="mt-0.5 text-xs text-text-muted">
                    {allergy.category_label} · {allergy.reaction}
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs text-text-muted">
                    {allergy.category_label}
                  </div>
                )}
              </div>
              <Badge tone={tone}>{allergy.severity_label}</Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
