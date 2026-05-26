import { Input, Button, Badge } from "../../../../shared/components/ui";
import PhoneInput from "../../../../shared/components/PhoneInput";
import { US_STATE_OPTIONS } from "../../../../shared/constants/usStates";
import type { ChangeEvent } from "react";
import type { AdminCustomOperatingHours, AdminFacilityForm } from "../../types";
import {
  Building2,
  Clock,
  Phone,
  MapPin,
  FileText,
  CalendarDays,
  Trash2,
  Plus,
} from "lucide-react";

type AdminFormChangeEvent = ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>;

export const OPERATING_DAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export const DEFAULT_OPERATING_DAYS = [1, 2, 3, 4, 5];

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
];

type FacilityPreviewPanelProps = {
  formData: AdminFacilityForm;
  initials: string;
  daysLabel: string;
};

// Helper to format 24h time string (HH:MM) to AM/PM format
function format12hTime(timeStr?: string | null) {
  if (!timeStr) return "—";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minStr || "00"} ${ampm}`;
}

export function FacilityPreviewPanel({
  formData,
  initials,
  daysLabel,
}: FacilityPreviewPanelProps) {
  return (
    <div className="flex flex-col items-center bg-cf-surface-soft/20 border border-cf-border/40 rounded-2xl p-6 text-center space-y-5 h-full md:sticky md:top-2">
      {/* Avatar block */}
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-cf-accent/10 border border-cf-accent/30 text-cf-accent flex items-center justify-center text-2xl font-extrabold">
          {initials}
        </div>
        <span
          className={`absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full border-2 border-cf-surface flex items-center justify-center ${
            formData.is_active ? "bg-cf-success-text" : "bg-cf-text-subtle"
          }`}
        />
      </div>

      {/* Title & Metadata */}
      <div className="space-y-1 w-full">
        <h4 className="truncate text-base font-bold tracking-tight text-cf-text">
          {formData.name || "Unnamed Facility"}
        </h4>
        <p className="truncate text-xs font-semibold tracking-wider uppercase text-cf-text-muted">
          {formData.facility_code || "No Code"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        <Badge variant={formData.is_active ? "success" : "neutral"}>
          {formData.is_active ? "Active" : "Inactive"}
        </Badge>
        <Badge variant="outline" size="sm">
          {formData.timezone.split("/")[1]?.replace("_", " ") ||
            formData.timezone}
        </Badge>
      </div>

      {/* Flat Details list */}
      <div className="w-full border-t border-cf-border/50 pt-4 text-left space-y-3.5 text-xs font-semibold mt-auto">
        <div className="flex gap-2">
          <Clock className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
              Hours
            </span>
            <span className="text-cf-text block truncate">
              {formData.custom_operating_hours &&
              formData.custom_operating_hours.length > 0 ? (
                <span className="text-cf-accent">
                  {formData.custom_operating_hours.length} hour groups
                </span>
              ) : (
                `${format12hTime(formData.operating_start_time)} – ${format12hTime(formData.operating_end_time)}`
              )}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <CalendarDays className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
              Operating Days
            </span>
            <span className="text-cf-text block truncate">{daysLabel}</span>
          </div>
        </div>

        {formData.phone_number && (
          <div className="flex gap-2">
            <Phone className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
                Phone
              </span>
              <span className="text-cf-text block truncate">
                {formData.phone_number}
              </span>
            </div>
          </div>
        )}

        {(formData.address.line_1 || formData.address.city) && (
          <div className="flex gap-2">
            <MapPin className="h-4 w-4 text-cf-text-subtle shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-cf-text-subtle block text-[10px] uppercase tracking-wider leading-none mb-1">
                Location
              </span>
              <span className="text-cf-text block truncate leading-tight">
                {formData.address.line_1}
                {formData.address.city && `, ${formData.address.city}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FacilityIdentityCard({
  formData,
  onChange,
  saving = false,
}: {
  formData: AdminFacilityForm;
  onChange: (event: AdminFormChangeEvent) => void;
  saving?: boolean;
}) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cf-text-subtle">
        <Building2 className="h-4 w-4 text-cf-accent" />
        Facility Identity
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            Facility Name
          </span>
          <Input
            name="name"
            value={formData.name}
            onChange={onChange}
            required
            disabled={saving}
            placeholder="e.g. CareFlow Downtown Clinic"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            Facility Code
          </span>
          <Input
            name="facility_code"
            value={formData.facility_code}
            onChange={onChange}
            disabled={saving}
            placeholder="e.g. CF-DOWNTOWN"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            Timezone
          </span>
          <Input
            as="select"
            name="timezone"
            value={formData.timezone}
            onChange={onChange}
            required
            disabled={saving}
          >
            {US_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label} ({tz.value})
              </option>
            ))}
          </Input>
        </label>
      </div>
    </div>
  );
}

export function FacilityContactCard({
  formData,
  onChange,
  saving = false,
}: {
  formData: AdminFacilityForm;
  onChange: (event: AdminFormChangeEvent) => void;
  saving?: boolean;
}) {
  const fireChange = (name: string, value: string) =>
    onChange({ target: { name, value, type: "text" } } as AdminFormChangeEvent);

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cf-text-subtle">
        <Phone className="h-4 w-4 text-cf-accent" />
        Contact Channels
      </h3>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            Phone Number
          </span>
          <PhoneInput
            name="phone_number"
            value={formData.phone_number}
            onChange={(v) => fireChange("phone_number", v)}
            disabled={saving}
            placeholder="(555) 000-0000"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            Fax Number
          </span>
          <PhoneInput
            name="fax_number"
            value={formData.fax_number}
            onChange={(v) => fireChange("fax_number", v)}
            disabled={saving}
            placeholder="(555) 000-0000"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            Email Address
          </span>
          <Input
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            disabled={saving}
            placeholder="info@facility.com"
          />
        </label>
      </div>
    </div>
  );
}

export function FacilityAddressCard({
  address,
  onChange,
  saving = false,
}: {
  address: AdminFacilityForm["address"];
  onChange: (event: AdminFormChangeEvent) => void;
  saving?: boolean;
}) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cf-text-subtle">
        <MapPin className="h-4 w-4 text-cf-accent" />
        Location Address
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            Street Address Line 1
          </span>
          <Input
            name="line_1"
            value={address.line_1}
            onChange={onChange}
            disabled={saving}
            placeholder="123 Main Street"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            Line 2 / Suite
          </span>
          <Input
            name="line_2"
            value={address.line_2}
            onChange={onChange}
            disabled={saving}
            placeholder="Suite 400"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
            City
          </span>
          <Input
            name="city"
            value={address.city}
            onChange={onChange}
            disabled={saving}
            placeholder="New York"
          />
        </label>

        <div className="grid gap-4 grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
              State
            </span>
            <Input
              as="select"
              name="state"
              value={address.state}
              onChange={onChange}
              disabled={saving}
            >
              {US_STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Input>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
              ZIP Code
            </span>
            <Input
              name="zip_code"
              value={address.zip_code}
              onChange={onChange}
              disabled={saving}
              placeholder="10001"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export function FacilityHoursCard({
  formData,
  onChange,
  onDayToggle,
  onCustomHoursChange,
}: {
  formData: AdminFacilityForm;
  onChange: (event: AdminFormChangeEvent) => void;
  onDayToggle: (day: number) => void;
  onCustomHoursChange: (
    customHours: AdminCustomOperatingHours[] | null
  ) => void;
  saving?: boolean;
}) {
  const customOperatingHours = formData.custom_operating_hours || [];

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cf-text-subtle">
        <Clock className="h-4 w-4 text-cf-accent" />
        Operating Hours & Days
      </h3>

      {/* Tab switch */}
      <div className="flex rounded-xl border border-cf-border bg-cf-surface-soft/60 p-1">
        <button
          type="button"
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
            !formData.custom_operating_hours
              ? "bg-cf-surface text-cf-text shadow-[var(--shadow-panel)]"
              : "text-cf-text-subtle hover:text-cf-text"
          }`}
          onClick={() => onCustomHoursChange(null)}
        >
          Same Hours Daily
        </button>
        <button
          type="button"
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
            formData.custom_operating_hours
              ? "bg-cf-surface text-cf-text shadow-[var(--shadow-panel)]"
              : "text-cf-text-subtle hover:text-cf-text"
          }`}
          onClick={() =>
            onCustomHoursChange([
              {
                days: [...formData.operating_days],
                start_time: formData.operating_start_time || "08:00",
                end_time: formData.operating_end_time || "17:00",
              },
            ])
          }
        >
          Custom Hours By Day
        </button>
      </div>

      {/* Daily schedule layout */}
      {!formData.custom_operating_hours ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                Opening Time
              </span>
              <Input
                type="time"
                name="operating_start_time"
                value={formData.operating_start_time}
                onChange={onChange}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                Closing Time
              </span>
              <Input
                type="time"
                name="operating_end_time"
                value={formData.operating_end_time}
                onChange={onChange}
                required
              />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
              Active Operating Days
            </span>
            <div className="flex flex-wrap gap-1.5">
              {OPERATING_DAY_OPTIONS.map((day) => {
                const isSelected = formData.operating_days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => onDayToggle(day.value)}
                    className={`flex-1 min-w-[50px] text-center rounded-lg border py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "border-cf-accent bg-cf-accent/15 text-cf-accent"
                        : "border-cf-border bg-cf-surface-soft/40 text-cf-text-muted hover:border-cf-border-strong"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Day-specific grouped hours editor */
        <div className="space-y-4 divide-y divide-cf-border/50">
          {customOperatingHours.map((group, idx) => {
            const toggleDayInGroup = (dayVal: number) => {
              const nextGroups = customOperatingHours.map((g, gIdx) => {
                if (gIdx !== idx) return g;
                const days = g.days.includes(dayVal)
                  ? g.days.filter((d: number) => d !== dayVal)
                  : [...g.days, dayVal].sort((a, b) => a - b);
                return { ...g, days };
              });
              onCustomHoursChange(nextGroups);
            };

            const changeTimeInGroup = (
              field: "start_time" | "end_time",
              val: string
            ) => {
              const nextGroups = customOperatingHours.map((g, gIdx) => {
                if (gIdx !== idx) return g;
                return { ...g, [field]: val };
              });
              onCustomHoursChange(nextGroups);
            };

            const deleteGroup = () => {
              const nextGroups = customOperatingHours.filter(
                (_, gIdx) => gIdx !== idx
              );
              onCustomHoursChange(nextGroups.length > 0 ? nextGroups : null);
            };

            const otherSelectedDays = customOperatingHours
              .filter((_, gIdx) => gIdx !== idx)
              .flatMap((g) => g.days);

            return (
              <div key={idx} className={`space-y-3 ${idx > 0 ? "pt-4" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cf-accent flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Hours Group #{idx + 1}
                  </span>
                  {customOperatingHours.length > 1 && (
                    <button
                      type="button"
                      onClick={deleteGroup}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove Group
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                      Opening Time
                    </span>
                    <Input
                      type="time"
                      value={group.start_time}
                      onChange={(e) =>
                        changeTimeInGroup("start_time", e.target.value)
                      }
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                      Closing Time
                    </span>
                    <Input
                      type="time"
                      value={group.end_time}
                      onChange={(e) =>
                        changeTimeInGroup("end_time", e.target.value)
                      }
                      required
                    />
                  </label>
                </div>

                <div>
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                    Assigned Days
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {OPERATING_DAY_OPTIONS.map((day) => {
                      const isSelected = group.days.includes(day.value);
                      const isTaken = otherSelectedDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          disabled={isTaken && !isSelected}
                          onClick={() => toggleDayInGroup(day.value)}
                          className={`flex-1 min-w-[50px] text-center rounded-lg border py-2 text-xs font-semibold transition ${
                            isSelected
                              ? "border-cf-accent bg-cf-accent/15 text-cf-accent"
                              : "border-cf-border bg-cf-surface-soft/40 text-cf-text-muted hover:border-cf-border-strong"
                          } ${isTaken ? "opacity-30 cursor-not-allowed" : ""}`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-4">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full justify-center border-dashed"
              onClick={() => {
                const allSelectedDays = customOperatingHours.flatMap(
                  (g) => g.days
                );
                const remainingDay = [1, 2, 3, 4, 5, 6, 7].find(
                  (d) => !allSelectedDays.includes(d)
                );
                onCustomHoursChange([
                  ...customOperatingHours,
                  {
                    days: remainingDay ? [remainingDay] : [],
                    start_time: "08:00",
                    end_time: "17:00",
                  },
                ]);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Operating Hours Group
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FacilityNotesCard({
  formData,
  onChange,
  saving = false,
}: {
  formData: AdminFacilityForm;
  onChange: (event: AdminFormChangeEvent) => void;
  saving?: boolean;
}) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cf-text-subtle">
        <FileText className="h-4 w-4 text-cf-accent" />
        Facility Notes
      </h3>

      <label className="block">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
          Overview Notes / Comments
        </span>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={onChange}
          disabled={saving}
          rows={3}
          placeholder="Add internal notes, instructions, or specific operational details for staff..."
          className="w-full rounded-xl border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text shadow-[var(--shadow-input)] transition focus:border-cf-accent focus:ring-1 focus:ring-cf-accent focus:outline-none"
        />
      </label>
    </div>
  );
}

export function FacilityStatusCard({
  formData,
  onChange,
}: {
  formData: AdminFacilityForm;
  onChange: (event: AdminFormChangeEvent) => void;
  saving?: boolean;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer rounded-xl border border-cf-border/60 bg-cf-surface-soft/10 p-3 hover:bg-cf-surface-soft/20 transition">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-cf-text">Facility Status</span>
        <span className="text-[10px] text-cf-text-muted">
          Control whether this facility is open for scheduling and access
        </span>
      </div>
      <input
        type="checkbox"
        name="is_active"
        checked={formData.is_active}
        onChange={onChange}
        className="h-4 w-4 accent-[var(--color-cf-accent)] cursor-pointer"
      />
    </label>
  );
}

type FacilityFormPanelProps = {
  formData: AdminFacilityForm;
  onChange: (event: AdminFormChangeEvent) => void;
  onAddressChange: (event: AdminFormChangeEvent) => void;
  onDayToggle: (day: number) => void;
  onCustomHoursChange: (
    customHours: AdminCustomOperatingHours[] | null
  ) => void;
  saving?: boolean;
};

export function FacilityFormPanel({
  formData,
  onChange,
  onAddressChange,
  onDayToggle,
  onCustomHoursChange,
  saving = false,
}: FacilityFormPanelProps) {
  return (
    <div className="space-y-6">
      <FacilityIdentityCard
        formData={formData}
        onChange={onChange}
        saving={saving}
      />
      <div className="border-t border-cf-border/50 pt-5">
        <FacilityContactCard
          formData={formData}
          onChange={onChange}
          saving={saving}
        />
      </div>
      <div className="border-t border-cf-border/50 pt-5">
        <FacilityAddressCard
          address={formData.address}
          onChange={onAddressChange}
          saving={saving}
        />
      </div>
      <div className="border-t border-cf-border/50 pt-5">
        <FacilityHoursCard
          formData={formData}
          onChange={onChange}
          onDayToggle={onDayToggle}
          onCustomHoursChange={onCustomHoursChange}
          saving={saving}
        />
      </div>
      <div className="border-t border-cf-border/50 pt-5">
        <FacilityNotesCard
          formData={formData}
          onChange={onChange}
          saving={saving}
        />
      </div>
      <FacilityStatusCard
        formData={formData}
        onChange={onChange}
        saving={saving}
      />
    </div>
  );
}
