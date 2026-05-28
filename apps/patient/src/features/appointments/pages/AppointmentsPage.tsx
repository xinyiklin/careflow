import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { PageHeader } from "../../../shared/components/ui/PageHeader";
import { SegmentedControl } from "../../../shared/components/ui/SegmentedControl";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useUpcomingAppointments,
  usePastAppointments,
} from "../api/appointments";
import { AppointmentRow } from "../components/AppointmentRow";

type Mode = "upcoming" | "past";

const OPTIONS = [
  { value: "upcoming" as const, label: "Upcoming" },
  { value: "past" as const, label: "Past" },
];

export function AppointmentsPage() {
  const [mode, setMode] = useState<Mode>("upcoming");
  const upcomingQuery = useUpcomingAppointments();
  const pastQuery = usePastAppointments();
  const query = mode === "upcoming" ? upcomingQuery : pastQuery;

  const appointments = query.data ?? [];
  const emptyMessage =
    mode === "upcoming"
      ? "No upcoming visits."
      : "No past visits in the last 12 months.";

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <PageHeader title="Appointments" />
        <Link
          to="/schedule"
          className="inline-flex items-center gap-1.5 rounded-cf-control border border-cf-accent bg-cf-accent px-3 py-2 text-xs font-semibold text-cf-page-bg shadow-[var(--shadow-panel)] transition hover:bg-cf-accent-hover"
        >
          <Plus size={13} aria-hidden="true" />
          Book new
        </Link>
      </div>
      <div className="mb-4">
        <SegmentedControl<Mode>
          options={OPTIONS}
          value={mode}
          onChange={setMode}
          ariaLabel="Appointment range"
        />
      </div>

      {query.isError ? (
        <p className="py-2 text-sm text-cf-text-muted">
          {getErrorMessage(query.error)}
        </p>
      ) : appointments.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ul>
          {appointments.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} />
          ))}
        </ul>
      )}
    </div>
  );
}
