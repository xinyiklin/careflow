import useAdminFacilityConfig from "../../hooks/facility/useAdminFacilityConfig";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import { AdminTableCard } from "../shared/AdminSurface";

import type { ReactNode } from "react";
import type { AdminAddress, AdminFacility } from "../../types";

function formatAddress(address: AdminAddress | null | undefined) {
  if (!address?.line_1) return "—";
  return [
    address.line_1,
    address.line_2,
    [address.city, address.state, address.zip_code].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");
}

function ProfileField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["border-t border-cf-border py-2.5", className]
        .filter(Boolean)
        .join(" ")}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-cf-text-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-cf-text">
        {value || "—"}
      </dd>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border-t border-cf-border py-2.5">
      <div className="text-2xl font-semibold tracking-tight text-cf-text">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-cf-text-subtle">
        {label}
      </div>
    </div>
  );
}

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function formatTime(value: string | null | undefined) {
  if (!value) return "";
  const [hourValue, minuteValue] = value.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;

  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatOperatingDays(days: Array<string | number> | null | undefined) {
  const normalizedDays = Array.isArray(days)
    ? days.map((day) => Number(day))
    : [];
  if (normalizedDays.length === 7) return "Daily";
  if (normalizedDays.join(",") === "1,2,3,4,5") return "Mon-Fri";
  return normalizedDays
    .map((day) => DAY_LABELS[day])
    .filter(Boolean)
    .join(", ");
}

function formatOperatingHours(facility: AdminFacility) {
  const window = [
    formatTime(facility.operating_start_time),
    formatTime(facility.operating_end_time),
  ]
    .filter(Boolean)
    .join(" - ");
  const days = formatOperatingDays(facility.operating_days);

  return [days, window].filter(Boolean).join(" · ");
}

function getFacilityInitials(name: string | null | undefined) {
  return (
    name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "FC"
  );
}

export default function FacilityOverviewPanel() {
  const { adminFacility } = useAdminFacility();
  const {
    physicians = [],
    staffs = [],
    resources = [],
    typeOptions = [],
  } = useAdminFacilityConfig(adminFacility?.id);

  if (!adminFacility) {
    return (
      <AdminTableCard>
        <div className="px-5 py-12 text-center text-sm text-cf-text-muted">
          No facility selected.
        </div>
      </AdminTableCard>
    );
  }
  const facility = adminFacility as AdminFacility;

  return (
    <AdminTableCard>
      <div className="px-5 py-5">
        <header className="mb-4 border-b border-cf-border pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cf-border bg-cf-surface text-sm font-bold text-cf-text">
              {getFacilityInitials(facility.name)}
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                Facility profile
              </div>
              <h3 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-cf-text">
                {facility.name}
              </h3>
              <div className="mt-0.5 text-sm font-medium text-cf-text-muted">
                {facility.facility_code || "No facility code"}
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <ProfileField label="Facility name" value={facility.name} />
              <ProfileField label="Time zone" value={facility.timezone} />
              <ProfileField label="Phone" value={facility.phone_number} />
              <ProfileField label="Fax" value={facility.fax_number} />
              <ProfileField label="Email" value={facility.email} />
              <ProfileField
                label="Hours"
                value={formatOperatingHours(facility)}
              />
              <ProfileField
                label="Address"
                value={formatAddress(facility.address)}
                className="sm:col-span-2"
              />
            </dl>
          </div>

          <div className="space-y-4 lg:border-l lg:border-cf-border lg:pl-4">
            <section>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                At a glance
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4">
                <SummaryTile label="Physicians" value={physicians.length} />
                <SummaryTile label="Staff" value={staffs.length} />
                <SummaryTile label="Resources" value={resources.length} />
                <SummaryTile label="Visit types" value={typeOptions.length} />
              </div>
            </section>

            <section className="border-t border-cf-border pt-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                Notes
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-cf-text-muted">
                {facility.notes || "No notes yet."}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminTableCard>
  );
}
