import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, CalendarRange } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  cn,
} from "../../../shared/ui";
import {
  getPortalTabId,
  getPortalTabPanelId,
  usePortalTabs,
} from "../../../shared/ui/portalTabs";
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
  const idBase = useId();

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
        idBase={idBase}
        upcomingLabel={t("appointments.tabUpcoming")}
        pastLabel={t("appointments.tabPast")}
        ariaLabel={t("appointments.rangeAriaLabel")}
      />

      <div
        role="tabpanel"
        id={getPortalTabPanelId(idBase)}
        aria-labelledby={getPortalTabId(idBase, mode)}
        className="mt-5"
      >
        {query.isError ? (
          <p role="alert" className="text-sm text-danger">
            {getErrorMessage(query.error)}
          </p>
        ) : showLoading ? (
          <ul className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((row) => (
              <li key={row}>
                <Card padded={false} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 max-w-full" />
                      <Skeleton className="h-3 w-24 max-w-full" />
                      <Skeleton className="h-4 w-56 max-w-full" />
                      <Skeleton className="h-3 w-32 max-w-full" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-sm" />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
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
  idBase: string;
  upcomingLabel: string;
  pastLabel: string;
  ariaLabel: string;
};

function SegmentedTabs({
  value,
  onChange,
  idBase,
  upcomingLabel,
  pastLabel,
  ariaLabel,
}: SegmentedTabsProps) {
  const options: { value: Mode; label: string }[] = [
    { value: "upcoming", label: upcomingLabel },
    { value: "past", label: pastLabel },
  ];
  const { getTabListProps } = usePortalTabs<Mode>({
    values: ["upcoming", "past"],
    value,
    onChange,
  });

  return (
    <div
      {...getTabListProps()}
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
            id={getPortalTabId(idBase, option.value)}
            aria-selected={isActive}
            aria-controls={getPortalTabPanelId(idBase)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 min-w-[96px] rounded-sm px-3 text-sm font-medium tracking-tight transition-colors",
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
