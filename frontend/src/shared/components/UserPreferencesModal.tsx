import {
  BadgeCheck,
  CalendarDays,
  History,
  PanelLeftOpen,
  Sun,
} from "lucide-react";

import {
  DEFAULT_USER_PREFERENCES,
  useUserPreferences,
} from "../context/UserPreferencesProvider";
import { useTheme } from "../context/ThemeProvider";
import {
  APPOINTMENT_BLOCK_COLOR_MODE_OPTIONS,
  APPOINTMENT_BLOCK_DISPLAY_OPTIONS,
} from "../constants/appointmentBlockDisplay";
import { Button, ModalShell } from "./ui";

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

type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
};

type SegmentedControlProps<TValue extends string> = {
  options: SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  columns?: string;
};

function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  columns = "grid-cols-2",
}: SegmentedControlProps<TValue>) {
  return (
    <div className={["grid gap-2", columns].join(" ")}>
      {options.map(({ label, value: optionValue }) => {
        const isActive = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={[
              "flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
              isActive
                ? "border-cf-accent bg-cf-accent text-cf-page-bg shadow-sm"
                : "border-cf-border bg-cf-surface-muted text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
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
    <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-cf-border bg-cf-surface-muted px-3 py-2.5">
      <div className="truncate text-sm font-medium text-cf-text">{title}</div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "inline-flex h-6 w-11 shrink-0 rounded-full p-1 transition",
          checked ? "bg-cf-accent" : "bg-cf-border-strong",
        ].join(" ")}
        aria-pressed={checked}
        aria-label={title}
      >
        <span
          className={[
            "h-4 w-4 rounded-full bg-cf-page-bg shadow-sm ring-1 ring-cf-border/70 transition",
            checked ? "translate-x-5" : "translate-x-0",
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
    <div className="rounded-xl border border-cf-border bg-cf-surface-muted p-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        {APPOINTMENT_BLOCK_COLOR_MODE_OPTIONS.map((option) => {
          const isActive = value.colorMode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateValue({ colorMode: option.value })}
              className={[
                "flex min-h-10 items-center justify-between rounded-lg border px-3 text-left transition",
                isActive
                  ? "border-cf-accent bg-cf-accent text-cf-page-bg shadow-sm"
                  : "border-cf-border bg-cf-surface text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
              ].join(" ")}
              aria-pressed={isActive}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-[11px] font-semibold opacity-75">
                {option.chipLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {APPOINTMENT_BLOCK_DISPLAY_OPTIONS.map((option) => {
          const optionKey = option.key as keyof AppointmentBlockDisplay;
          const isActive = Boolean(value?.[optionKey]);

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => updateValue({ [optionKey]: !isActive })}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                isActive
                  ? "border-cf-accent bg-cf-accent text-cf-page-bg shadow-sm"
                  : "border-cf-border bg-cf-surface text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
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
            columns="grid-cols-2"
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
                  columns="grid-cols-2"
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
                  columns="grid-cols-2"
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

        <Section icon={BadgeCheck} title="Environment">
          <ToggleRow
            title="Show demo badge"
            checked={preferences.showDemoBadge}
            onChange={(nextValue) =>
              updatePreferences({ showDemoBadge: nextValue })
            }
          />
        </Section>
      </>
    </ModalShell>
  );
}
