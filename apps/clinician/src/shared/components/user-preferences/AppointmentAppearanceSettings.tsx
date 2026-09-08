import AppointmentBlock from "../../../features/appointments/components/AppointmentBlock";
import { APPOINTMENT_BLOCK_DISPLAY_OPTIONS } from "../../constants/appointmentBlockDisplay";
import { SegmentedControl } from "../ui";
import { PreferenceGroup } from "./PreferenceFields";
import type { AppointmentBlockDisplay } from "../../constants/appointmentBlockDisplay";
import type { AppointmentLike } from "../../types/domain";

const SAMPLE_APPOINTMENT: AppointmentLike = {
  id: "workspace-preview",
  patient_name: "Sample patient",
  time: "09:00",
  end_time_str: "09:30",
  appointment_type_name: "Follow-up",
  appointment_type_color: "#4f7f89",
  status_name: "Confirmed",
  status_color: "#8e723f",
  room: "1",
  resource_name: "Exam room",
  rendering_provider_name: "Sample provider",
  patient_date_of_birth: "2000-01-01",
  patient_chart_number: "SAMPLE",
  reason: "Follow-up visit",
  notes: "Sample note",
};
const DETAIL_GROUPS = [
  {
    title: "Visit",
    keys: [
      "showStatusChip",
      "showVisitType",
      "showAppointmentStatus",
      "showTimeRange",
    ],
  },
  { title: "Assignment", keys: ["showRoom", "showResource", "showProvider"] },
  {
    title: "Patient details",
    keys: ["showDob", "showChartNumber", "showReason", "showNotes"],
  },
];

export default function AppointmentAppearanceSettings({
  value,
  onChange,
}: {
  value: AppointmentBlockDisplay;
  onChange: (value: AppointmentBlockDisplay) => void;
}) {
  return (
    <div className="grid gap-4 border-t border-cf-border pt-4">
      <PreferenceGroup title="Color appointments by">
        <SegmentedControl
          aria-label="Color appointments by"
          value={value.colorMode}
          onChange={(colorMode) => onChange({ ...value, colorMode })}
          options={[
            { value: "visitBlockStatusChip", label: "Visit type" },
            { value: "statusBlockVisitChip", label: "Status" },
          ]}
        />
      </PreferenceGroup>
      <div className="grid gap-3 sm:grid-cols-3">
        {DETAIL_GROUPS.map((group) => (
          <PreferenceGroup key={group.title} title={group.title}>
            <div className="grid gap-2">
              {APPOINTMENT_BLOCK_DISPLAY_OPTIONS.filter((option) =>
                group.keys.includes(option.key)
              ).map((option) => {
                const key = option.key as Exclude<
                  keyof AppointmentBlockDisplay,
                  "colorMode"
                >;
                return (
                  <label
                    key={key}
                    className="flex min-h-7 cursor-pointer items-center gap-2 text-xs text-cf-text"
                  >
                    <input
                      type="checkbox"
                      checked={value[key]}
                      onChange={(event) =>
                        onChange({ ...value, [key]: event.target.checked })
                      }
                      className="h-4 w-4 shrink-0 accent-cf-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-accent"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </PreferenceGroup>
        ))}
      </div>
      <figure className="min-w-0">
        <figcaption className="mb-2 text-xs text-cf-text-muted">
          Sample appointment
        </figcaption>
        <div className="h-24">
          <AppointmentBlock
            appointment={SAMPLE_APPOINTMENT}
            displayOptions={value}
            fullWidth
            isPreview
            style={{ opacity: 1, boxShadow: "none" }}
          />
        </div>
      </figure>
    </div>
  );
}
