import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button } from "../../../../shared/components/ui";
import { formatPhoneDisplay } from "../../../../shared/utils/phone";
import useAdminFacilityConfig from "../../hooks/facility/useAdminFacilityConfig";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import {
  fetchOrganizationFacility,
  updateOrganizationFacility,
} from "../../api/organization/facilities";
import { fetchOrganizationFeeSchedules } from "../../api/organization/feeSchedule";
import { useAuth } from "../../../auth/AuthProvider";
import { fetchUserProfile } from "../../../auth/api/users";
import { AdminTableCard } from "../shared/AdminSurface";
import FacilityModal from "../organization/FacilityModal";
import {
  Building2,
  Clock,
  Phone,
  Mail,
  MapPin,
  Users,
  FileText,
  Layers,
  Printer,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import type {
  AdminAddress,
  AdminCustomOperatingHours,
  AdminFacility,
  AdminSavePayload,
} from "../../types";

function formatAddress(address: AdminAddress | null | undefined) {
  if (!address?.line_1) return null;
  return {
    line_1: address.line_1,
    line_2: address.line_2,
    cityStateZip: [address.city, address.state, address.zip_code]
      .filter(Boolean)
      .join(", "),
  };
}

const WEEKDAYS = [
  { key: 1, label: "Monday", short: "Mon" },
  { key: 2, label: "Tuesday", short: "Tue" },
  { key: 3, label: "Wednesday", short: "Wed" },
  { key: 4, label: "Thursday", short: "Thu" },
  { key: 5, label: "Friday", short: "Fri" },
  { key: 6, label: "Saturday", short: "Sat" },
  { key: 7, label: "Sunday", short: "Sun" },
];

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

export default function FacilityOverviewPanel() {
  const { adminFacility } = useAdminFacility();
  const { setUser } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const facilityId = adminFacility?.id || null;

  const {
    physicians = [],
    staffs = [],
    resources = [],
    typeOptions = [],
    reload: reloadConfig,
    loading: loadingConfig,
  } = useAdminFacilityConfig(facilityId);

  const facilityQueryKey = ["admin", "facility", "detail", facilityId];
  const { data: facilityDetail, isLoading: loadingDetail } = useQuery({
    queryKey: facilityQueryKey,
    queryFn: () => fetchOrganizationFacility(facilityId!),
    enabled: Boolean(facilityId),
  });

  const { data: feeSchedules = [] } = useQuery({
    queryKey: ["organizationFeeSchedules"],
    queryFn: fetchOrganizationFeeSchedules,
  });

  const loading = loadingConfig || loadingDetail;
  const facility = (facilityDetail || adminFacility) as AdminFacility;

  if (!adminFacility) {
    return (
      <div className="px-6 py-16 text-center text-sm text-cf-text-muted">
        No facility selected.
      </div>
    );
  }

  const addressInfo = formatAddress(facility.address);
  const operatingDays = Array.isArray(facility.operating_days)
    ? facility.operating_days.map((day) => Number(day))
    : [];

  const initialLetter = facility.name?.charAt(0).toUpperCase() || "F";

  const handleSave = async (values: AdminSavePayload["values"]) => {
    try {
      setSaving(true);
      await updateOrganizationFacility(facility.id, values);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: facilityQueryKey }),
        fetchUserProfile().then(setUser),
      ]);
      reloadConfig();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to update facility", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminTableCard
        savingLabel={saving ? "Saving..." : ""}
        actions={
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: facilityQueryKey });
                reloadConfig();
              }}
              disabled={loading || saving}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              disabled={loading || saving}
            >
              Edit Overview
            </Button>
          </>
        }
      >
        {loading ? null : (
          <div className="px-6 py-6">
            {/* Profile Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-cf-border/60 pb-5 mb-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cf-accent/10 border border-cf-accent/20 text-lg font-bold text-cf-accent">
                  {initialLetter}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold tracking-tight text-cf-text">
                      {facility.name}
                    </h2>
                    <Badge
                      variant={
                        facility.is_active !== false ? "success" : "neutral"
                      }
                    >
                      {facility.is_active !== false ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-cf-text-muted font-medium">
                    <span className="font-semibold text-cf-text-subtle uppercase tracking-wider text-[10px]">
                      {facility.facility_code || "No Code"}
                    </span>
                    <span className="h-3 w-px bg-cf-border" />
                    <span>{facility.timezone || "No Timezone"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Layout */}
            <div className="grid gap-6 md:grid-cols-[1fr_2.2fr]">
              {/* Left Column: Contact and Address Details (1/3) */}
              <div className="space-y-6 md:border-r md:border-cf-border/60 md:pr-6">
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
                    <Building2 className="h-4 w-4 text-cf-accent" />
                    Facility Profile
                  </h3>

                  <div className="space-y-4 text-xs font-semibold">
                    <div className="flex items-start gap-3 py-1 border-b border-cf-border/40 pb-2">
                      <Phone className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                          Phone
                        </span>
                        <span className="text-cf-text block truncate text-sm font-bold">
                          {formatPhoneDisplay(facility.phone_number) || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 py-1 border-b border-cf-border/40 pb-2">
                      <Printer className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                          Fax
                        </span>
                        <span className="text-cf-text block truncate text-sm font-bold">
                          {formatPhoneDisplay(facility.fax_number) || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 py-1 border-b border-cf-border/40 pb-2">
                      <Mail className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                          Email
                        </span>
                        <span className="text-cf-text block truncate text-sm font-bold break-all">
                          {facility.email || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 py-1">
                      <MapPin className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-cf-text-subtle block text-[9px] uppercase tracking-wider leading-none mb-1.5">
                          Location Address
                        </span>
                        {addressInfo ? (
                          <div className="text-cf-text text-sm font-bold leading-relaxed">
                            <div>{addressInfo.line_1}</div>
                            {addressInfo.line_2 && (
                              <div>{addressInfo.line_2}</div>
                            )}
                            <div className="text-cf-text-muted mt-0.5">
                              {addressInfo.cityStateZip}
                            </div>
                          </div>
                        ) : (
                          <span className="text-cf-text-muted block mt-1">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Dashboard Details & Stats (2/3) */}
              <div className="space-y-6">
                {/* Footprint Statistics Grid */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    {
                      label: "Providers",
                      value: physicians.length,
                      icon: Users,
                      color: "text-blue-500 bg-blue-500/8 dark:bg-blue-500/12",
                    },
                    {
                      label: "Staff Members",
                      value: staffs.length,
                      icon: Users,
                      color:
                        "text-indigo-500 bg-indigo-500/8 dark:bg-indigo-500/12",
                    },
                    {
                      label: "Resources",
                      value: resources.length,
                      icon: Building2,
                      color: "text-teal-500 bg-teal-500/8 dark:bg-teal-500/12",
                    },
                    {
                      label: "Visit Types",
                      value: typeOptions.length,
                      icon: Layers,
                      color:
                        "text-amber-500 bg-amber-500/8 dark:bg-amber-500/12",
                    },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className="cf-admin-stat flex items-center gap-3"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                      >
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xl font-bold tracking-tight text-cf-text leading-none">
                          {stat.value}
                        </div>
                        <div className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-cf-text-subtle leading-none">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="border-cf-border/60" />

                {/* Operating Hours Visual Section */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
                    <Clock className="h-4 w-4 text-cf-accent" />
                    Operating Hours & Days
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 bg-cf-surface-soft/10 border border-cf-border/50 rounded-xl p-4 shadow-[var(--shadow-panel)]">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle mb-1">
                        Weekly Operating Days
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {WEEKDAYS.map((day) => {
                          const isActive = operatingDays.includes(day.key);
                          return (
                            <div
                              key={day.key}
                              className={`text-center py-2 px-0.5 rounded-lg border text-xs font-bold transition ${
                                isActive
                                  ? "bg-cf-accent/15 border-cf-accent/30 text-cf-accent shadow-sm"
                                  : "bg-cf-surface-soft/40 border-cf-border/40 text-cf-text-subtle opacity-50"
                              }`}
                              title={day.label}
                            >
                              <div>{day.short}</div>
                              <div className="mt-0.5 text-[8px] uppercase tracking-wide leading-none font-bold">
                                {isActive ? "On" : "Off"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-cf-border/40 pt-3 sm:border-t-0 sm:pt-0 sm:border-l sm:border-cf-border/40 sm:pl-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-cf-text-subtle mb-1">
                        Configured Hours Details
                      </div>
                      {facility.custom_operating_hours &&
                      Array.isArray(facility.custom_operating_hours) &&
                      facility.custom_operating_hours.length > 0 ? (
                        <div className="grid gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {facility.custom_operating_hours.map(
                            (block: AdminCustomOperatingHours, idx: number) => {
                              const daysStr = block.days
                                .map(
                                  (d: number) =>
                                    WEEKDAYS.find((wd) => wd.key === d)?.short
                                )
                                .filter(Boolean)
                                .join(", ");
                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center bg-cf-surface-soft/30 border border-cf-border/30 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm"
                                >
                                  <span className="text-cf-text-muted">
                                    {daysStr}
                                  </span>
                                  <span className="text-cf-accent">
                                    {formatTime(block.start_time)} –{" "}
                                    {formatTime(block.end_time)}
                                  </span>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : facility.operating_start_time ||
                        facility.operating_end_time ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-cf-text bg-cf-surface-soft/30 border border-cf-border/30 rounded-lg px-2.5 py-2 shadow-sm">
                          <CalendarDays className="h-4 w-4 text-cf-text-subtle" />
                          <span>
                            Hours:{" "}
                            <strong className="text-cf-text">
                              {formatTime(facility.operating_start_time)}
                            </strong>{" "}
                            –{" "}
                            <strong className="text-cf-text">
                              {formatTime(facility.operating_end_time)}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-cf-text-muted">
                          No operating hours configured.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-cf-border/60" />

                {/* Notes & Information */}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cf-text-subtle">
                    <FileText className="h-4 w-4 text-cf-accent" />
                    Notes & Information
                  </h3>
                  <div className="rounded-xl border border-cf-border/50 bg-cf-surface-soft/15 p-4 text-xs leading-relaxed text-cf-text-muted whitespace-pre-wrap font-medium min-h-[100px] max-h-[200px] overflow-y-auto shadow-inner">
                    {facility.notes || "No notes configured for this facility."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminTableCard>

      <FacilityModal
        isOpen={isModalOpen}
        mode="edit"
        initialValues={facility}
        feeSchedules={feeSchedules ?? undefined}
        saving={saving}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
