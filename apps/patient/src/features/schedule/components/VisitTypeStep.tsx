import { Stethoscope } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { EmptyState, cn } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useScheduleAppointmentTypes,
  type PortalSchedulingAppointmentType,
} from "../api/schedule";

type VisitTypeStepProps = {
  providerId: number;
  selected: PortalSchedulingAppointmentType | null;
  onSelect: (type: PortalSchedulingAppointmentType) => void;
};

export function VisitTypeStep({
  providerId,
  selected,
  onSelect,
}: VisitTypeStepProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } =
    useScheduleAppointmentTypes(providerId);
  const showLoading = useMinimumLoading(isLoading);
  const types = data ?? [];

  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {getErrorMessage(error)}
      </p>
    );
  }

  if (showLoading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: 3 }).map((_, idx) => (
          <li
            key={idx}
            aria-hidden="true"
            className="h-16 animate-pulse rounded-lg border border-border bg-surface-soft"
          />
        ))}
      </ul>
    );
  }

  if (isLoading) {
    return null;
  }

  if (types.length === 0) {
    return <EmptyState icon={Stethoscope} title={t("schedule.noVisitTypes")} />;
  }

  return (
    <ul className="space-y-2">
      {types.map((type) => {
        const isSelected = selected?.id === type.id;
        return (
          <li key={type.id}>
            <button
              type="button"
              onClick={() => onSelect(type)}
              aria-pressed={isSelected}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 text-left transition-colors",
                "hover:border-border-strong hover:bg-surface-soft",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                "min-h-[56px]",
                isSelected ? "border-accent bg-accent-soft" : "border-border"
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-text">
                  {type.name}
                </div>
                <div className="mt-0.5 text-xs text-text-muted">
                  {t("schedule.durationMinutes", {
                    count: type.duration_minutes,
                  })}
                </div>
              </div>
              <span
                aria-hidden="true"
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  isSelected
                    ? "bg-accent"
                    : "bg-transparent border border-border-strong"
                )}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
