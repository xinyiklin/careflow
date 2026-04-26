import {
  BadgeCheck,
  CalendarDays,
  History,
  List,
  Moon,
  NotebookText,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";

import { useUserPreferences } from "../context/UserPreferencesProvider";
import { useTheme } from "../context/ThemeProvider";
import { APPOINTMENT_BLOCK_DISPLAY_OPTIONS } from "../constants/appointmentBlockDisplay";
import { Badge, Button, ModalShell } from "./ui";

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-cf-border bg-cf-surface px-4 py-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        {title}
      </div>
      {children}
    </section>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
  columns = "grid-cols-2",
}) {
  return (
    <div className={["grid gap-2", columns].join(" ")}>
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
              isActive
                ? "border-cf-border-strong bg-cf-accent text-white shadow-sm"
                : "border-cf-border bg-cf-surface-muted text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
            ].join(" ")}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({ icon: Icon, title, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-cf-border bg-cf-surface-muted px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-cf-text-subtle" />
        ) : null}
        <div className="truncate text-sm font-medium text-cf-text">{title}</div>
      </div>

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
            "h-4 w-4 rounded-full bg-white shadow-sm transition",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function BlockDisplayToggleGrid({ value, onChange }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {APPOINTMENT_BLOCK_DISPLAY_OPTIONS.map((option) => {
        const isActive = Boolean(value?.[option.key]);

        return (
          <button
            key={option.key}
            type="button"
            onClick={() =>
              onChange({
                ...value,
                [option.key]: !isActive,
              })
            }
            className={[
              "rounded-lg border px-3 py-2 text-left text-sm font-medium transition",
              isActive
                ? "border-cf-border-strong bg-cf-accent text-white shadow-sm"
                : "border-cf-border bg-cf-surface-muted text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
            ].join(" ")}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function UserPreferencesModal({ isOpen, onClose }) {
  const { preferences, updatePreferences, resetPreferences } =
    useUserPreferences();
  const { setTheme } = useTheme();

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    updatePreferences({ theme: nextTheme });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Workspace"
      maxWidth="2xl"
      zIndex={82}
      bodyClassName="pt-4"
      footerClassName="justify-between"
      footer={
        <>
          <Button
            type="button"
            variant="default"
            onClick={() => resetPreferences()}
          >
            Reset
          </Button>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Section title="Appearance">
          <SegmentedControl
            value={preferences.theme}
            onChange={handleThemeChange}
            columns="grid-cols-2"
            options={[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
            ]}
          />
        </Section>

        <Section title="Schedule">
          <div className="grid gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cf-text">
                <CalendarDays className="h-4 w-4 text-cf-text-subtle" />
                Start schedule in
              </div>
              <SegmentedControl
                value={preferences.scheduleStartMode}
                onChange={(value) =>
                  updatePreferences({ scheduleStartMode: value })
                }
                columns="grid-cols-2"
                options={[
                  { value: "resources", label: "Resource", icon: CalendarDays },
                  { value: "days", label: "Multi-day", icon: List },
                ]}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cf-text">
                <CalendarDays className="h-4 w-4 text-cf-text-subtle" />
                Default schedule view
              </div>
              <SegmentedControl
                value={preferences.scheduleViewMode}
                onChange={(value) =>
                  updatePreferences({ scheduleViewMode: value })
                }
                columns="grid-cols-2"
                options={[
                  { value: "slot", label: "Slot", icon: CalendarDays },
                  { value: "agenda", label: "Agenda", icon: List },
                ]}
              />
            </div>
            <ToggleRow
              icon={CalendarDays}
              title="Show slot grid lines"
              checked={preferences.showScheduleSlotDividers}
              onChange={(nextValue) =>
                updatePreferences({ showScheduleSlotDividers: nextValue })
              }
            />
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-cf-text">
                <CalendarDays className="h-4 w-4 text-cf-text-subtle" />
                Appointment block details
              </div>
              <p className="mb-2 text-xs text-cf-text-muted">
                Time and patient stay visible. Choose the extra details shown on
                each block.
              </p>
              <BlockDisplayToggleGrid
                value={preferences.appointmentBlockDisplay}
                onChange={(appointmentBlockDisplay) =>
                  updatePreferences({ appointmentBlockDisplay })
                }
              />
            </div>
          </div>
        </Section>

        <Section title="Layout">
          <div className="grid gap-3">
            <ToggleRow
              icon={
                preferences.sidebarCollapsed ? PanelLeftClose : PanelLeftOpen
              }
              title="Start with sidebar collapsed"
              checked={preferences.sidebarCollapsed}
              onChange={(nextValue) =>
                updatePreferences({ sidebarCollapsed: nextValue })
              }
            />
          </div>
        </Section>

        <Section title="Privacy">
          <div className="grid gap-3">
            <ToggleRow
              icon={History}
              title="Clear recent patients on logout"
              checked={preferences.clearRecentPatientsOnLogout}
              onChange={(nextValue) =>
                updatePreferences({ clearRecentPatientsOnLogout: nextValue })
              }
            />

            <ToggleRow
              icon={NotebookText}
              title="Clear personal notes on logout"
              checked={preferences.clearPersonalNotesOnLogout}
              onChange={(nextValue) =>
                updatePreferences({ clearPersonalNotesOnLogout: nextValue })
              }
            />
          </div>
        </Section>

        <Section title="Environment">
          <div className="grid gap-3">
            <ToggleRow
              icon={BadgeCheck}
              title="Show demo badge"
              checked={preferences.showDemoBadge}
              onChange={(nextValue) =>
                updatePreferences({ showDemoBadge: nextValue })
              }
            />
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{preferences.theme}</Badge>
              <Badge variant="outline">
                {preferences.scheduleStartMode === "days"
                  ? "Multi-day"
                  : "Resource"}
              </Badge>
              <Badge variant="outline">{preferences.scheduleViewMode}</Badge>
              <Badge variant="outline">
                Grid {preferences.showScheduleSlotDividers ? "on" : "off"}
              </Badge>
              <Badge variant="outline">
                Block{" "}
                {
                  Object.values(
                    preferences.appointmentBlockDisplay || {}
                  ).filter(Boolean).length
                }{" "}
                details
              </Badge>
              <Badge variant="outline">
                Recent{" "}
                {preferences.clearRecentPatientsOnLogout ? "resets" : "stays"}
              </Badge>
              <Badge variant="outline">
                Notes{" "}
                {preferences.clearPersonalNotesOnLogout ? "reset" : "stay"}
              </Badge>
            </div>
          </div>
        </Section>
      </div>
    </ModalShell>
  );
}
