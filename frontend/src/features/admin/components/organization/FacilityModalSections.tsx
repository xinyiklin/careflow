import { Input } from "../../../../shared/components/ui";
import { US_STATE_OPTIONS } from "../../../../shared/constants/usStates";
import {
  CompactCard,
  CompactField,
  CompactMetric,
  CompactModalLane,
  CompactPill,
  CompactRecordHeader,
  CompactToggle,
} from "../shared/AdminCompactModal";
import type { ChangeEvent } from "react";
import type { AdminFacilityForm } from "../../types";

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

type FacilityIdentityLaneProps = {
  formData: AdminFacilityForm;
  initials: string;
  daysLabel: string;
  onChange: (event: AdminFormChangeEvent) => void;
  onDayToggle: (day: number) => void;
};

type FacilityDetailsLaneProps = {
  formData: AdminFacilityForm;
  daysLabel: string;
  onChange: (event: AdminFormChangeEvent) => void;
  onAddressChange: (event: AdminFormChangeEvent) => void;
};

export function FacilityIdentityLane({
  formData,
  initials,
  daysLabel,
  onChange,
  onDayToggle,
}: FacilityIdentityLaneProps) {
  return (
    <CompactModalLane>
      <CompactCard>
        <CompactRecordHeader
          initials={initials}
          title={formData.name || "Unnamed facility"}
          meta={`${formData.facility_code || "No code"} · ${daysLabel}`}
          action={
            <CompactToggle
              label="Active"
              name="is_active"
              checked={formData.is_active}
              onChange={onChange}
            />
          }
        />
      </CompactCard>

      <CompactCard eyebrow="Identity">
        <div className="grid gap-3 sm:grid-cols-2">
          <CompactField label="Name">
            <Input
              name="name"
              value={formData.name}
              onChange={onChange}
              required
            />
          </CompactField>
          <CompactField label="Code">
            <Input
              name="facility_code"
              value={formData.facility_code}
              onChange={onChange}
            />
          </CompactField>
          <CompactField label="Timezone" className="sm:col-span-2">
            <Input
              name="timezone"
              value={formData.timezone}
              onChange={onChange}
              required
            />
          </CompactField>
        </div>
      </CompactCard>

      <CompactCard eyebrow="Schedule">
        <div className="grid gap-3 sm:grid-cols-2">
          <CompactField label="Start">
            <Input
              type="time"
              name="operating_start_time"
              value={formData.operating_start_time}
              onChange={onChange}
              required
            />
          </CompactField>
          <CompactField label="End">
            <Input
              type="time"
              name="operating_end_time"
              value={formData.operating_end_time}
              onChange={onChange}
              required
            />
          </CompactField>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {OPERATING_DAY_OPTIONS.map((day) => {
            const isSelected = formData.operating_days.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => onDayToggle(day.value)}
                className={[
                  "rounded-full border px-2 py-1.5 text-xs font-semibold transition",
                  isSelected
                    ? "border-cf-text bg-cf-text text-cf-page-bg"
                    : "border-cf-border bg-cf-surface-soft text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
                ].join(" ")}
                aria-pressed={isSelected}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </CompactCard>
    </CompactModalLane>
  );
}

export function FacilityDetailsLane({
  formData,
  daysLabel,
  onChange,
  onAddressChange,
}: FacilityDetailsLaneProps) {
  return (
    <CompactModalLane>
      <CompactCard eyebrow="Contact">
        <div className="grid gap-3 sm:grid-cols-3">
          <CompactField label="Phone">
            <Input
              name="phone_number"
              value={formData.phone_number}
              onChange={onChange}
            />
          </CompactField>
          <CompactField label="Fax">
            <Input
              name="fax_number"
              value={formData.fax_number}
              onChange={onChange}
            />
          </CompactField>
          <CompactField label="Email">
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={onChange}
            />
          </CompactField>
        </div>
      </CompactCard>

      <CompactCard eyebrow="Address">
        <div className="grid gap-3 sm:grid-cols-2">
          <CompactField label="Line 1" className="sm:col-span-2">
            <Input
              name="line_1"
              value={formData.address.line_1}
              onChange={onAddressChange}
            />
          </CompactField>
          <CompactField label="Line 2" className="sm:col-span-2">
            <Input
              name="line_2"
              value={formData.address.line_2}
              onChange={onAddressChange}
            />
          </CompactField>
          <CompactField label="City">
            <Input
              name="city"
              value={formData.address.city}
              onChange={onAddressChange}
            />
          </CompactField>
          <div className="grid gap-3 sm:grid-cols-2">
            <CompactField label="State">
              <Input
                as="select"
                name="state"
                value={formData.address.state}
                onChange={onAddressChange}
              >
                {US_STATE_OPTIONS.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Input>
            </CompactField>
            <CompactField label="ZIP">
              <Input
                name="zip_code"
                value={formData.address.zip_code}
                onChange={onAddressChange}
              />
            </CompactField>
          </div>
        </div>
      </CompactCard>

      <CompactCard eyebrow="Operations">
        <div className="grid grid-cols-3 gap-2">
          <CompactMetric label="Days" value={formData.operating_days.length} />
          <CompactMetric label="Opens" value={formData.operating_start_time} />
          <CompactMetric label="Closes" value={formData.operating_end_time} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <CompactPill tone={formData.is_active ? "success" : "muted"}>
            {formData.is_active ? "Active" : "Inactive"}
          </CompactPill>
          <CompactPill>{daysLabel}</CompactPill>
        </div>
        <div className="mt-3">
          <CompactField label="Notes">
            <Input
              as="textarea"
              name="notes"
              value={formData.notes}
              onChange={onChange}
              rows={3}
            />
          </CompactField>
        </div>
      </CompactCard>
    </CompactModalLane>
  );
}
