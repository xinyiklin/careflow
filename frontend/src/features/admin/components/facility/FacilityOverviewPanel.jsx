import useAdminFacilityConfig from "../../hooks/facility/useAdminFacilityConfig";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import { AdminTableCard } from "../shared/AdminSurface";

function formatAddress(address) {
  if (!address?.line_1) return "—";
  return [
    address.line_1,
    address.line_2,
    [address.city, address.state, address.zip_code].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");
}

function ProfileField({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-cf-text-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-cf-text">
        {value || "—"}
      </dd>
    </div>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-xl bg-cf-surface-soft p-3 text-center">
      <div className="text-xl font-semibold tracking-tight text-cf-text">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-cf-text-subtle">
        {label}
      </div>
    </div>
  );
}

const DAY_LABELS = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function formatTime(value) {
  if (!value) return "";
  const [hourValue, minuteValue] = value.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;

  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatOperatingDays(days) {
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

function formatOperatingHours(facility) {
  const window = [
    formatTime(facility.operating_start_time),
    formatTime(facility.operating_end_time),
  ]
    .filter(Boolean)
    .join(" - ");
  const days = formatOperatingDays(facility.operating_days);

  return [days, window].filter(Boolean).join(" · ");
}

function getFacilityInitials(name) {
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

  return (
    <AdminTableCard>
      <div className="px-5 py-5">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Facility · Overview
            </div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-cf-text">
              {adminFacility.name}
            </h3>
            <p className="mt-1 text-sm text-cf-text-muted">
              Profile, contact details, and operating notes for this facility.
            </p>
          </div>
          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              adminFacility.is_active !== false
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-500/30"
                : "bg-cf-surface-muted text-cf-text-subtle ring-1 ring-cf-border",
            ].join(" ")}
          >
            {adminFacility.is_active !== false ? "Active" : "Inactive"}
          </span>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)] lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cf-accent/12 text-sm font-semibold text-cf-accent ring-1 ring-cf-accent/20">
                {getFacilityInitials(adminFacility.name)}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                  Profile
                </div>
                <div className="truncate text-sm font-semibold text-cf-text">
                  {adminFacility.facility_code || "No facility code"}
                </div>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <ProfileField label="Facility name" value={adminFacility.name} />
              <ProfileField label="Time zone" value={adminFacility.timezone} />
              <ProfileField label="Phone" value={adminFacility.phone_number} />
              <ProfileField label="Fax" value={adminFacility.fax_number} />
              <ProfileField label="Email" value={adminFacility.email} />
              <ProfileField
                label="Hours"
                value={formatOperatingHours(adminFacility)}
              />
              <ProfileField
                label="Address"
                value={formatAddress(adminFacility.address)}
                className="sm:col-span-2"
              />
            </dl>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                At a glance
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <SummaryTile label="Physicians" value={physicians.length} />
                <SummaryTile label="Staff" value={staffs.length} />
                <SummaryTile label="Resources" value={resources.length} />
                <SummaryTile label="Visit types" value={typeOptions.length} />
              </div>
            </div>

            <div className="rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                Notes
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-cf-text-muted">
                {adminFacility.notes || "No notes yet."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminTableCard>
  );
}
