import { useEffect, useState } from "react";

import { AdminFormModal } from "../shared/AdminFormModal";
import { CompactModalGrid } from "../shared/AdminCompactModal";
import {
  DEFAULT_OPERATING_DAYS,
  FacilityFormPanel,
  FacilityPreviewPanel,
  OPERATING_DAY_OPTIONS,
} from "./FacilityModalSections";
import type { ChangeEvent, FormEvent } from "react";
import { Input } from "../../../../shared/components/ui";
import {
  formatPhoneInput,
  getPhoneInputDigits,
} from "../../../../shared/utils/phone";
import type {
  AdminAddress,
  AdminCustomOperatingHours,
  AdminFacility,
  AdminFacilityForm,
  AdminOrganizationFeeSchedule,
  AdminSavePayload,
} from "../../types";

const DEFAULT_FORM: AdminFacilityForm = {
  name: "",
  facility_code: "",
  timezone: "America/New_York",
  operating_start_time: "08:00",
  operating_end_time: "17:00",
  operating_days: DEFAULT_OPERATING_DAYS,
  custom_operating_hours: null,
  phone_number: "",
  fax_number: "",
  email: "",
  notes: "",
  is_active: true,
  address: { line_1: "", line_2: "", city: "", state: "NY", zip_code: "" },
  online_scheduling_disabled: false,
  online_cancellation_enabled: false,
  cancellation_cutoff_hours: 24,
};

type FacilityModalProps = {
  isOpen: boolean;
  mode?: "create" | "edit";
  initialValues?: AdminFacility | null;
  feeSchedules?: AdminOrganizationFeeSchedule[];
  saving?: boolean;
  onClose: () => void;
  onSubmit?: (values: AdminSavePayload["values"]) => void | Promise<void>;
};

function normalizeAddress(address: AdminAddress | null | undefined) {
  if (!address) return { ...DEFAULT_FORM.address };
  return {
    line_1: address.line_1 || "",
    line_2: address.line_2 || "",
    city: address.city || "",
    state: address.state || "NY",
    zip_code: address.zip_code || "",
  };
}

function normalizeTimeInput(
  value: string | null | undefined,
  fallback: string
) {
  return typeof value === "string" && value ? value.slice(0, 5) : fallback;
}

function normalizeOperatingDays(value: unknown) {
  if (!Array.isArray(value)) return [...DEFAULT_OPERATING_DAYS];
  const days = value
    .map((day) => Number(day))
    .filter(
      (day, index, allDays) =>
        day >= 1 && day <= 7 && allDays.indexOf(day) === index
    );
  return days.length ? days : [...DEFAULT_OPERATING_DAYS];
}

function getFacilityInitials(name: string) {
  return (
    name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "FC"
  );
}

function formatOperatingDays(days: unknown) {
  const normalizedDays = normalizeOperatingDays(days);
  if (normalizedDays.length === 7) return "Daily";
  if (normalizedDays.join(",") === "1,2,3,4,5") return "Mon-Fri";
  return OPERATING_DAY_OPTIONS.filter((option) =>
    normalizedDays.includes(option.value)
  )
    .map((option) => option.label)
    .join(", ");
}

export default function FacilityModal({
  isOpen,
  mode = "create",
  initialValues = null,
  feeSchedules = [],
  saving = false,
  onClose,
  onSubmit,
}: FacilityModalProps) {
  const [formData, setFormData] = useState<AdminFacilityForm>(DEFAULT_FORM);
  const [feeScheduleId, setFeeScheduleId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (initialValues) {
      setFormData({
        name: initialValues.name || "",
        facility_code: initialValues.facility_code || "",
        timezone: initialValues.timezone || "America/New_York",
        operating_start_time: normalizeTimeInput(
          initialValues.operating_start_time,
          "08:00"
        ),
        operating_end_time: normalizeTimeInput(
          initialValues.operating_end_time,
          "17:00"
        ),
        operating_days: normalizeOperatingDays(initialValues.operating_days),
        custom_operating_hours: initialValues.custom_operating_hours || null,
        phone_number: formatPhoneInput(initialValues.phone_number || ""),
        fax_number: formatPhoneInput(initialValues.fax_number || ""),
        email: initialValues.email || "",
        notes: initialValues.notes || "",
        is_active:
          typeof initialValues.is_active === "boolean"
            ? initialValues.is_active
            : true,
        address: normalizeAddress(initialValues.address),
        online_scheduling_disabled: Boolean(
          initialValues.online_scheduling_disabled
        ),
        online_cancellation_enabled: Boolean(
          initialValues.online_cancellation_enabled
        ),
        cancellation_cutoff_hours:
          typeof initialValues.cancellation_cutoff_hours === "number"
            ? initialValues.cancellation_cutoff_hours
            : 24,
      });
      setFeeScheduleId(String(initialValues.fee_schedule || ""));
    } else {
      setFormData({ ...DEFAULT_FORM, address: { ...DEFAULT_FORM.address } });
      setFeeScheduleId("");
    }
  }, [initialValues, isOpen]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddressChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };

  const handleOperatingDayToggle = (day: number) => {
    setFormData((prev) => {
      const currentDays = normalizeOperatingDays(prev.operating_days);
      const nextDays = currentDays.includes(day)
        ? currentDays.filter((currentDay) => currentDay !== day)
        : [...currentDays, day];

      return {
        ...prev,
        operating_days: nextDays.sort((left, right) => left - right),
      };
    });
  };

  const handleCustomHoursChange = (
    customHours: AdminCustomOperatingHours[] | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      custom_operating_hours: customHours,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.({
      ...formData,
      name: formData.name.trim(),
      facility_code: formData.facility_code.trim(),
      operating_start_time: formData.operating_start_time,
      operating_end_time: formData.operating_end_time,
      operating_days: normalizeOperatingDays(formData.operating_days),
      custom_operating_hours: formData.custom_operating_hours,
      phone_number: getPhoneInputDigits(formData.phone_number.trim()),
      fax_number: getPhoneInputDigits(formData.fax_number.trim()),
      email: formData.email.trim(),
      notes: formData.notes.trim(),
      fee_schedule: feeScheduleId ? Number(feeScheduleId) : null,
      address: formData.address.line_1.trim()
        ? {
            line_1: formData.address.line_1.trim(),
            line_2: formData.address.line_2.trim(),
            city: formData.address.city.trim(),
            state: formData.address.state,
            zip_code: formData.address.zip_code.trim(),
          }
        : null,
    });
  };

  return (
    <AdminFormModal
      isOpen={isOpen}
      onClose={onClose}
      scope="Organization Admin"
      title={mode === "edit" ? "Edit Facility Profile" : "Create New Facility"}
      maxWidth="4xl"
      formId="facility-form"
      saving={saving}
      bodyClassName="bg-cf-surface px-6 py-5 border-t border-b border-cf-border/60 !overflow-hidden flex flex-col md:max-h-[70vh] min-h-0 flex-1"
    >
      <form
        id="facility-form"
        onSubmit={handleSubmit}
        className="py-2 flex-1 flex flex-col min-h-0"
      >
        <CompactModalGrid className="flex-1 min-h-0">
          <FacilityPreviewPanel
            formData={formData}
            initials={getFacilityInitials(formData.name)}
            daysLabel={formatOperatingDays(formData.operating_days)}
          />
          <div className="overflow-y-auto pr-2 min-h-0">
            <FacilityFormPanel
              formData={formData}
              onChange={handleChange}
              onAddressChange={handleAddressChange}
              onDayToggle={handleOperatingDayToggle}
              onCustomHoursChange={handleCustomHoursChange}
              saving={saving}
            />
            {feeSchedules.length > 0 ? (
              <div className="border-t border-cf-border/50 pt-5 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
                    Fee schedule
                  </div>
                </div>
                <Input
                  as="select"
                  value={feeScheduleId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setFeeScheduleId(e.target.value)
                  }
                  disabled={saving}
                >
                  <option value="">Organization default</option>
                  {feeSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name}
                    </option>
                  ))}
                </Input>
              </div>
            ) : null}
          </div>
        </CompactModalGrid>
      </form>
    </AdminFormModal>
  );
}
