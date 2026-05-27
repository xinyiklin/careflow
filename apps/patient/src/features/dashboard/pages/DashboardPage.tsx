import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  Pill,
  User,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { useUpcomingAppointments } from "../../appointments/api/appointments";
import { useMedications } from "../../medications/api/medications";
import { useAllergies } from "../../allergies/api/allergies";
import { formatFacilityLocalDateTime } from "../../../shared/utils/dates";

export function DashboardPage() {
  const { patient } = useAuth();
  const firstName = patient?.first_name?.trim() || "there";
  const initials =
    [patient?.first_name?.[0], patient?.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  const { data: upcoming } = useUpcomingAppointments();
  const { data: medications } = useMedications();
  const { data: allergies } = useAllergies();

  const nextAppt = upcoming && upcoming.length > 0 ? upcoming[0] : null;
  const activeMeds = medications
    ? medications.filter((m) => m.status === "active")
    : [];
  const activeAllergies = allergies || [];

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 space-y-6">
      {/* Welcome Card */}
      <div className="flex items-center gap-4 rounded-cf-shell border border-cf-border bg-cf-surface p-5 shadow-panel">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cf-accent-soft text-cf-accent text-base font-semibold">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
            Patient Portal
          </div>
          <h1 className="text-xl font-bold tracking-tight text-cf-text mt-0.5">
            Welcome, {firstName}
          </h1>
        </div>
        <Link
          to="/profile"
          className="rounded-cf-control border border-cf-border bg-cf-surface px-3 py-1.5 text-xs font-semibold text-cf-text transition-all hover:bg-cf-surface-soft"
        >
          View profile
        </Link>
      </div>

      {/* Next Appointment Feature */}
      {nextAppt && (
        <div className="rounded-cf-shell border border-cf-border bg-cf-surface p-5 shadow-panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle flex items-center gap-1.5">
              <Calendar size={14} className="text-cf-accent" /> Next Appointment
            </h2>
            <Link
              to="/appointments"
              className="text-xs font-medium text-cf-text-muted hover:text-cf-text flex items-center gap-1"
            >
              All visits <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cf-surface-muted p-4 rounded-cf-card border border-cf-border">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-cf-text">
                {formatFacilityLocalDateTime(
                  nextAppt.appointment_time,
                  nextAppt.facility_timezone
                )}
              </div>
              <div className="text-xs text-cf-text-muted mt-1 font-medium">
                {nextAppt.appointment_type_name} with{" "}
                {nextAppt.provider_display_name || "—"}
              </div>
              <div className="text-xs text-cf-text-subtle mt-0.5">
                {nextAppt.facility_name}{" "}
                {nextAppt.room ? ` · Room ${nextAppt.room}` : ""}
              </div>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center rounded-full bg-cf-accent-soft px-2.5 py-1 text-xs font-medium text-cf-text">
                {nextAppt.status_name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Grid */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle mb-3 px-1">
          Quick Access
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            {
              to: "/appointments",
              label: "Appointments",
              Icon: Calendar,
              desc: "Schedule / History",
            },
            {
              to: "/medications",
              label: "Medications",
              Icon: Pill,
              desc: "Prescriptions",
            },
            {
              to: "/allergies",
              label: "Allergies",
              Icon: AlertTriangle,
              desc: "Known triggers",
            },
            {
              to: "/profile",
              label: "Profile",
              Icon: User,
              desc: "Account details",
            },
          ].map(({ to, label, Icon, desc }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col items-center justify-center text-center p-4 rounded-cf-card border border-cf-border bg-cf-surface shadow-panel transition-all duration-150 hover:-translate-y-0.5 hover:border-cf-border-strong hover:bg-cf-surface-soft"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cf-surface-soft group-hover:bg-cf-accent-soft transition-colors mb-2">
                <Icon
                  size={16}
                  className="text-cf-text group-hover:text-cf-accent transition-colors"
                />
              </div>
              <div className="text-xs font-semibold text-cf-text">{label}</div>
              <div className="text-[10px] text-cf-text-subtle mt-0.5 leading-tight">
                {desc}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* At a glance split preview */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Active Medications Preview */}
        <div className="rounded-cf-shell border border-cf-border bg-cf-surface p-5 shadow-panel space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle flex items-center gap-1.5">
              <Pill size={14} className="text-cf-text-muted" /> Active
              Medications ({activeMeds.length})
            </h2>
            <Link
              to="/medications"
              className="text-xs font-medium text-cf-text-muted hover:text-cf-text flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {activeMeds.length === 0 ? (
            <p className="text-xs text-cf-text-muted py-3">
              No active medications on file.
            </p>
          ) : (
            <ul className="divide-y divide-cf-border">
              {activeMeds.slice(0, 3).map((med) => (
                <li key={med.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="text-xs font-semibold text-cf-text">
                    {med.medication_name}
                  </div>
                  <div className="text-[11px] text-cf-text-muted mt-0.5">
                    {[med.dose, med.frequency].filter(Boolean).join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active Allergies Preview */}
        <div className="rounded-cf-shell border border-cf-border bg-cf-surface p-5 shadow-panel space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-cf-text-muted" /> Allergies
              ({activeAllergies.length})
            </h2>
            <Link
              to="/allergies"
              className="text-xs font-medium text-cf-text-muted hover:text-cf-text flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {activeAllergies.length === 0 ? (
            <p className="text-xs text-cf-text-muted py-3">
              No known allergies on file.
            </p>
          ) : (
            <ul className="divide-y divide-cf-border">
              {activeAllergies.slice(0, 3).map((allergy) => (
                <li
                  key={allergy.id}
                  className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-cf-text">
                      {allergy.allergen}
                    </div>
                    <div className="text-[11px] text-cf-text-muted mt-0.5">
                      {allergy.category_label}
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-cf-surface-soft px-2 py-0.5 text-[10px] font-medium text-cf-text">
                    {allergy.severity_label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
