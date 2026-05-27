import { formatDateOnly } from "../../../shared/utils/dates";
import type { PortalAllergy, PortalAllergySeverity } from "../api/allergies";

const SEVERITY_CLASS: Record<PortalAllergySeverity, string> = {
  unknown: "bg-cf-surface-soft text-cf-text-muted",
  mild: "bg-emerald-50 text-emerald-900",
  moderate: "bg-amber-50 text-amber-900",
  severe: "bg-orange-100 text-orange-900",
  life_threatening: "bg-rose-100 text-rose-900",
};

function SeverityBadge({ allergy }: { allergy: PortalAllergy }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_CLASS[allergy.severity]}`}
    >
      {allergy.severity_label || "Unknown"}
    </span>
  );
}

export function AllergyRow({ allergy }: { allergy: PortalAllergy }) {
  const reaction = allergy.reaction?.trim() ?? "";
  const onset = formatDateOnly(allergy.onset_date);

  return (
    <li className="border-t border-cf-border py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-cf-text">
            {allergy.allergen}
          </div>
          <div className="mt-0.5 text-xs text-cf-text-muted">
            {allergy.category_label}
          </div>
        </div>
        <SeverityBadge allergy={allergy} />
      </div>
      {reaction ? (
        <div
          className="mt-1.5 truncate text-xs text-cf-text-subtle"
          title={reaction}
        >
          {reaction}
        </div>
      ) : null}
      {onset !== "—" ? (
        <div className="mt-1 text-xs text-cf-text-subtle">Onset {onset}</div>
      ) : null}
    </li>
  );
}
