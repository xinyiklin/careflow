import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, CalendarRange, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { Button, EmptyState, PageHeader, cn } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useUpcomingAppointments,
  usePastAppointments,
} from "../api/appointments";
import { AppointmentRow } from "../components/AppointmentRow";

type Mode = "upcoming" | "past";

export function AppointmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("upcoming");

  const upcomingQuery = useUpcomingAppointments();
  const pastQuery = usePastAppointments();
  const query = mode === "upcoming" ? upcomingQuery : pastQuery;
  const showLoading = useMinimumLoading(query.isLoading);

  const appointments = query.data ?? [];
  const isEmpty =
    !query.isLoading && !query.isError && appointments.length === 0;

  return (
    <div>
      <PageHeader
        title={t("appointments.pageTitle")}
        actions={
          <Button
            variant="primary"
            onClick={() => navigate("/schedule")}
            leadingIcon={<CalendarPlus size={16} aria-hidden="true" />}
          >
            {t("appointments.bookNew")}
          </Button>
        }
      />

      <SegmentedTabs
        value={mode}
        onChange={setMode}
        upcomingLabel={t("appointments.tabUpcoming")}
        pastLabel={t("appointments.tabPast")}
        ariaLabel={t("appointments.rangeAriaLabel")}
      />

      <div className="mt-5">
        {query.isError ? (
          <p role="alert" className="text-sm text-danger">
            {getErrorMessage(query.error)}
          </p>
        ) : showLoading ? (
          <div className="flex items-center justify-center py-10 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : query.isLoading ? null : isEmpty ? (
          <EmptyState
            icon={CalendarRange}
            title={
              mode === "upcoming"
                ? t("appointments.noUpcoming")
                : t("appointments.noPast")
            }
          />
        ) : (
          <ul className="space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentRow appointment={appointment} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type SegmentedTabsProps = {
  value: Mode;
  onChange: (next: Mode) => void;
  upcomingLabel: string;
  pastLabel: string;
  ariaLabel: string;
};

function SegmentedTabs({
  value,
  onChange,
  upcomingLabel,
  pastLabel,
  ariaLabel,
}: SegmentedTabsProps) {
  const options: { value: Mode; label: string }[] = [
    { value: "upcoming", label: upcomingLabel },
    { value: "past", label: pastLabel },
  ];

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-md border border-border bg-surface p-1"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 min-w-[96px] rounded-sm px-3 text-xs font-medium tracking-tight transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
              isActive
                ? "bg-accent-soft text-accent"
                : "text-text-muted hover:text-text"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
