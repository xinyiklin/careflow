import {
  DEFAULT_USER_PREFERENCES,
  useUserPreferences,
} from "../../app/context/UserPreferencesProvider";
import { useTheme } from "../context/ThemeProvider";
import { Button, ModalShell, SegmentedControl } from "./ui";
import {
  PreferenceGroup,
  PreferenceSection,
  PreferenceToggle,
} from "./user-preferences/PreferenceFields";
import AppointmentAppearanceSettings from "./user-preferences/AppointmentAppearanceSettings";
import PreferenceSaveIndicator from "./user-preferences/PreferenceSaveIndicator";
import type { UserPreferences } from "../types/domain";

export default function UserPreferencesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    preferences,
    updatePreferences,
    resetPreferences,
    saveStatus,
    retrySave,
    setSidebarStartupMode,
  } = useUserPreferences();
  const { setTheme } = useTheme();
  const handleThemeChange = (theme: UserPreferences["theme"]) => {
    setTheme(theme);
    updatePreferences({ theme });
  };
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Workspace"
      maxWidth="2xl"
      panelClassName="h-[min(85dvh,760px)]"
      bodyClassName="px-0 py-0"
      footerClassName="justify-between gap-3 bg-cf-surface"
      footer={
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <Button
              type="button"
              variant="default"
              className="whitespace-normal text-left"
              title="Reset workspace appearance"
              aria-label="Reset workspace appearance"
              onClick={() => {
                setTheme(DEFAULT_USER_PREFERENCES.theme);
                resetPreferences();
              }}
            >
              Reset
            </Button>
            <div className="flex min-h-7 items-center gap-2 text-xs text-cf-text-muted">
              <PreferenceSaveIndicator status={saveStatus} />
              {saveStatus === "error" ? (
                <button
                  type="button"
                  onClick={retrySave}
                  className="rounded px-1 py-1 font-medium text-cf-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-accent"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <PreferenceSection title="Appearance">
        <PreferenceGroup title="Theme">
          <SegmentedControl
            aria-label="Theme"
            value={preferences.theme}
            onChange={handleThemeChange}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
          />
        </PreferenceGroup>
      </PreferenceSection>
      <PreferenceSection title="Navigation">
        <PreferenceGroup title="Main navigation on startup">
          <SegmentedControl
            aria-label="Main navigation on startup"
            wrapLabels
            value={preferences.sidebarStartupMode}
            onChange={setSidebarStartupMode}
            options={[
              { value: "collapsed", label: "Collapsed" },
              { value: "expanded", label: "Expanded" },
              { value: "remember", label: "Remember last state" },
            ]}
          />
        </PreferenceGroup>
      </PreferenceSection>
      <PreferenceSection title="Schedule">
        <div className="grid gap-4 sm:grid-cols-2">
          <PreferenceGroup title="Start schedule in">
            <SegmentedControl
              aria-label="Start schedule in"
              value={preferences.scheduleStartMode}
              onChange={(scheduleStartMode) =>
                updatePreferences({ scheduleStartMode })
              }
              options={[
                { value: "resources", label: "Resource" },
                { value: "days", label: "Multi-day" },
              ]}
            />
          </PreferenceGroup>
          <PreferenceGroup title="Default view">
            <SegmentedControl
              aria-label="Default view"
              value={preferences.scheduleViewMode}
              onChange={(scheduleViewMode) =>
                updatePreferences({ scheduleViewMode })
              }
              options={[
                { value: "slot", label: "Slot" },
                { value: "agenda", label: "Agenda" },
              ]}
            />
          </PreferenceGroup>
        </div>
        <PreferenceToggle
          title="Show full day"
          description="Off: business hours and existing appointments"
          checked={preferences.showScheduleFullDay}
          onChange={(showScheduleFullDay) =>
            updatePreferences({ showScheduleFullDay })
          }
        />
        <PreferenceGroup title="Blocked-slot appearance">
          <SegmentedControl
            aria-label="Blocked-slot appearance"
            value={preferences.blockedSlotAppearance}
            onChange={(blockedSlotAppearance) =>
              updatePreferences({ blockedSlotAppearance })
            }
            options={[
              { value: "patterned", label: "Patterned" },
              { value: "solid", label: "Solid" },
            ]}
          />
          <div className="mt-2 grid grid-cols-2 gap-2" aria-hidden="true">
            <div className="cf-blocked-slot relative overflow-hidden rounded-md px-3 py-3 text-xs text-cf-text-muted">
              <div className="cf-blocked-hatch absolute inset-0" />
              <span className="relative">Closed</span>
            </div>
            <div className="cf-blocked-slot rounded-md px-3 py-3 text-xs text-cf-text-muted">
              Closed
            </div>
          </div>
        </PreferenceGroup>
        <PreferenceToggle
          title="Show slot grid lines"
          checked={preferences.showScheduleSlotDividers}
          onChange={(showScheduleSlotDividers) =>
            updatePreferences({ showScheduleSlotDividers })
          }
        />
        <AppointmentAppearanceSettings
          value={preferences.appointmentBlockDisplay}
          onChange={(appointmentBlockDisplay) =>
            updatePreferences({ appointmentBlockDisplay })
          }
        />
        <div className="border-t border-cf-border pt-3">
          <PreferenceToggle
            title="Show calendar heatmap"
            checked={preferences.showScheduleHeatmap}
            onChange={(showScheduleHeatmap) =>
              updatePreferences({ showScheduleHeatmap })
            }
          />
          {preferences.showScheduleHeatmap ? (
            <div className="mt-3 grid gap-3">
              <PreferenceGroup title="Heatmap scale">
                <SegmentedControl
                  aria-label="Heatmap scale"
                  value={preferences.scheduleHeatmapMode}
                  onChange={(scheduleHeatmapMode) =>
                    updatePreferences({ scheduleHeatmapMode })
                  }
                  options={[
                    { value: "auto", label: "Auto" },
                    { value: "target", label: "Daily target" },
                  ]}
                />
              </PreferenceGroup>
              {preferences.scheduleHeatmapMode === "target" ? (
                <label className="flex flex-wrap items-center justify-between gap-3 text-sm text-cf-text">
                  Appointments per day
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={preferences.scheduleHeatmapDailyTarget}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isInteger(value) && value >= 1 && value <= 200)
                        updatePreferences({
                          scheduleHeatmapDailyTarget: value,
                        });
                    }}
                    className="w-20 rounded-lg border border-cf-border bg-cf-surface px-2.5 py-1.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-cf-accent"
                  />
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      </PreferenceSection>
      <PreferenceSection title="Privacy">
        <PreferenceToggle
          title="Clear recent patients on logout"
          checked={preferences.clearRecentPatientsOnLogout}
          onChange={(clearRecentPatientsOnLogout) =>
            updatePreferences({ clearRecentPatientsOnLogout })
          }
        />
        <PreferenceToggle
          title="Clear personal notes on logout"
          checked={preferences.clearPersonalNotesOnLogout}
          onChange={(clearPersonalNotesOnLogout) =>
            updatePreferences({ clearPersonalNotesOnLogout })
          }
        />
      </PreferenceSection>
    </ModalShell>
  );
}
