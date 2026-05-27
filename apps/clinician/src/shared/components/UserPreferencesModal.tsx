import { CalendarDays, History, PanelLeftOpen, Sun } from "lucide-react";

import {
  DEFAULT_USER_PREFERENCES,
  useUserPreferences,
} from "../../app/context/UserPreferencesProvider";
import { useTheme } from "../context/ThemeProvider";
import {
  APPOINTMENT_BLOCK_COLOR_MODE_OPTIONS,
  APPOINTMENT_BLOCK_DISPLAY_OPTIONS,
} from "../constants/appointmentBlockDisplay";
import { Button, ModalShell, SegmentedControl } from "./ui";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
  AppointmentBlockDisplay,
  AppointmentBlockDisplay as AppointmentBlockDisplayValue,
} from "../constants/appointmentBlockDisplay";
import type { UserPreferences } from "../types/domain";

type SectionProps = {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
};

function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <section className="border-b border-cf-border px-5 py-4 last:border-b-0">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function SettingGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  checked,
  onChange,
}: {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-cf-border bg-cf-surface-muted/50 px-3.5 py-2.5 transition-all hover:bg-cf-surface-muted">
      <div className="truncate text-sm font-semibold text-cf-text">{title}</div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-cf-accent-soft",
          checked ? "bg-cf-accent" : "bg-cf-border-strong/75",
        ].join(" ")}
        aria-pressed={checked}
        aria-label={title}
      >
        <span
          className={[
            "pointer-events-none block h-5 w-5 rounded-full bg-cf-surface shadow-xs transition-transform duration-200 ease-in-out",
            checked ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function AppointmentBlockDetailsControl({
  value,
  onChange,
}: {
  value: AppointmentBlockDisplay;
  onChange: (value: AppointmentBlockDisplay) => void;
}) {
  const updateValue = (nextValue: Partial<AppointmentBlockDisplayValue>) =>
    onChange({ ...value, ...nextValue });

  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface-muted/50 p-3 space-y-3">
      <SegmentedControl
        value={value.colorMode}
        onChange={(colorMode) => updateValue({ colorMode })}
        options={APPOINTMENT_BLOCK_COLOR_MODE_OPTIONS}
      />

      <div className="flex flex-wrap gap-1.5">
        {APPOINTMENT_BLOCK_DISPLAY_OPTIONS.map((option) => {
          const optionKey = option.key as keyof AppointmentBlockDisplay;
          const isActive = Boolean(value?.[optionKey]);

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => updateValue({ [optionKey]: !isActive })}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                isActive
                  ? "border-cf-accent bg-cf-accent text-cf-surface shadow-xs scale-[1.02]"
                  : "border-cf-border bg-cf-surface text-cf-text-subtle hover:border-cf-border-strong hover:text-cf-text",
              ].join(" ")}
              aria-pressed={isActive}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function UserPreferencesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { preferences, updatePreferences, resetPreferences } =
    useUserPreferences();
  const { setTheme } = useTheme();

  const handleThemeChange = (nextTheme: UserPreferences["theme"]) => {
    setTheme(nextTheme);
    updatePreferences({ theme: nextTheme });
  };

  const handleResetPreferences = () => {
    setTheme(DEFAULT_USER_PREFERENCES.theme);
    resetPreferences();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Workspace"
      maxWidth="2xl"
      bodyClassName="px-0 py-0"
      footerClassName="justify-between bg-cf-surface"
      footer={
        <>
          <Button
            type="button"
            variant="default"
            onClick={handleResetPreferences}
          >
            Reset
          </Button>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <>
        <Section icon={Sun} title="Appearance">
          <SegmentedControl
            value={preferences.theme}
            onChange={handleThemeChange}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Section>

        <Section icon={CalendarDays} title="Schedule">
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingGroup title="Start schedule in">
                <SegmentedControl
                  value={preferences.scheduleStartMode}
                  onChange={(value) =>
                    updatePreferences({ scheduleStartMode: value })
                  }
                  options={[
                    { value: "resources", label: "Resource" },
                    { value: "days", label: "Multi-day" },
                  ]}
                />
              </SettingGroup>

              <SettingGroup title="Default view">
                <SegmentedControl
                  value={preferences.scheduleViewMode}
                  onChange={(value) =>
                    updatePreferences({ scheduleViewMode: value })
                  }
                  options={[
                    { value: "slot", label: "Slot" },
                    { value: "agenda", label: "Agenda" },
                  ]}
                />
              </SettingGroup>
            </div>

            <ToggleRow
              title="Show slot grid lines"
              checked={preferences.showScheduleSlotDividers}
              onChange={(nextValue) =>
                updatePreferences({ showScheduleSlotDividers: nextValue })
              }
            />

            <SettingGroup title="Appointment block details">
              <AppointmentBlockDetailsControl
                value={preferences.appointmentBlockDisplay}
                onChange={(appointmentBlockDisplay) =>
                  updatePreferences({ appointmentBlockDisplay })
                }
              />
            </SettingGroup>

            <ToggleRow
              title="Show calendar heatmap"
              checked={preferences.showScheduleHeatmap}
              onChange={(nextValue) =>
                updatePreferences({ showScheduleHeatmap: nextValue })
              }
            />

            {preferences.showScheduleHeatmap ? (
              <SettingGroup title="Heatmap scale">
                <SegmentedControl
                  value={preferences.scheduleHeatmapMode}
                  onChange={(value) =>
                    updatePreferences({ scheduleHeatmapMode: value })
                  }
                  options={[
                    { value: "auto", label: "Auto" },
                    { value: "target", label: "Daily target" },
                  ]}
                />
                {preferences.scheduleHeatmapMode === "target" ? (
                  <div className="flex items-center gap-3 rounded-xl border border-cf-border bg-cf-surface-muted/50 px-3.5 py-2.5">
                    <label
                      htmlFor="heatmap-daily-target"
                      className="shrink-0 text-sm font-semibold text-cf-text"
                    >
                      Appointments per day
                    </label>
                    <input
                      id="heatmap-daily-target"
                      type="number"
                      min={1}
                      max={200}
                      value={preferences.scheduleHeatmapDailyTarget}
                      onChange={(event) => {
                        const parsed = parseInt(event.target.value, 10);
                        if (parsed > 0 && parsed <= 200) {
                          updatePreferences({
                            scheduleHeatmapDailyTarget: parsed,
                          });
                        }
                      }}
                      className="w-20 rounded-lg border border-cf-border bg-cf-surface px-2.5 py-1.5 text-center text-sm font-semibold text-cf-text outline-none transition focus:border-cf-accent focus:ring-1 focus:ring-cf-accent-soft"
                    />
                  </div>
                ) : null}
              </SettingGroup>
            ) : null}
          </div>
        </Section>

        <Section icon={PanelLeftOpen} title="Layout">
          <ToggleRow
            title="Start with sidebar collapsed"
            checked={preferences.sidebarCollapsed}
            onChange={(nextValue) =>
              updatePreferences({ sidebarCollapsed: nextValue })
            }
          />
        </Section>

        <Section icon={History} title="Privacy">
          <div className="grid gap-3">
            <ToggleRow
              title="Clear recent patients on logout"
              checked={preferences.clearRecentPatientsOnLogout}
              onChange={(nextValue) =>
                updatePreferences({ clearRecentPatientsOnLogout: nextValue })
              }
            />

            <ToggleRow
              title="Clear personal notes on logout"
              checked={preferences.clearPersonalNotesOnLogout}
              onChange={(nextValue) =>
                updatePreferences({ clearPersonalNotesOnLogout: nextValue })
              }
            />
          </div>
        </Section>
      </>
    </ModalShell>
  );
}
