import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import AppNavbar from "../shared/components/AppNavbar";
import AppSidebar from "../shared/components/AppSidebar";
import QuickActionsPalette from "../shared/components/QuickActionsPalette";
import PersonalNotesModal from "../shared/components/PersonalNotesModal";
import UserPreferencesModal from "../shared/components/UserPreferencesModal";
import useFacilityConfig from "../features/facilities/hooks/useFacilityConfig";
import useFacility from "../features/facilities/hooks/useFacility";
import useAdminPermissions from "../features/admin/hooks/shared/useAdminPermissions";
import {
  PatientFlowProvider,
  usePatientFlowContext,
} from "../features/patients/PatientFlowProvider";
import { useAuth } from "../features/auth/AuthProvider";

import { DEMO_MODE } from "../shared/config/appConfig";
import { useUserPreferences } from "../shared/context/UserPreferencesProvider";
import { useTheme } from "../shared/context/ThemeProvider";
import { updateUserPreferences } from "../features/auth/api/users";
import {
  buildQuickActions,
  getMatchingQuickActionSlot,
  getStoredQuickActionAssignments,
  SCHEDULE_QUICK_ACTION_EVENT,
  SCHEDULE_QUICK_ACTION_STORAGE_KEY,
} from "../shared/constants/quickActions";
import { useBootReadiness } from "./BootReadinessContext";

const RECENT_PATIENTS_VISIBLE_COUNT = 6;

function getPersonalNotesKey(user) {
  if (!user) return null;
  return `cf-personal-notes:${user.id || user.username || "user"}`;
}

function AppNavbarContainer({
  onOpenPatientSearch,
  onOpenQuickActions,
  onOpenNotes,
  onOpenPreferences,
  recentPatients,
  onOpenRecentPatient,
}) {
  const { logout, user } = useAuth();

  return (
    <AppNavbar
      onLogout={logout}
      user={user}
      onOpenQuickActions={onOpenQuickActions}
      onOpenNotes={onOpenNotes}
      onOpenPreferences={onOpenPreferences}
      onOpenPatientSearch={() => onOpenPatientSearch("navbar")}
      recentPatients={recentPatients}
      onOpenRecentPatient={onOpenRecentPatient}
    />
  );
}

function AppShellLayout({ isSidebarCollapsed, setIsSidebarCollapsed }) {
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isDemoBadgeDocked, setIsDemoBadgeDocked] = useState(false);
  const { recentPatients, openPatientSearch, openRecentPatient, patientFlow } =
    usePatientFlowContext();
  const {
    canAccessFacilityAdmin,
    canAccessOrganizationAdmin,
    hasAnyAdminAccess,
  } = useAdminPermissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, updatePreferences } = useUserPreferences();
  const { theme, setTheme } = useTheme();
  const personalNotesKey = useMemo(() => getPersonalNotesKey(user), [user]);
  const personalNote = preferences.personalNotes || "";

  const dispatchScheduleQuickAction = useCallback(
    (type) => {
      sessionStorage.setItem(SCHEDULE_QUICK_ACTION_STORAGE_KEY, type);
      navigate("/schedule");
      window.dispatchEvent(
        new CustomEvent(SCHEDULE_QUICK_ACTION_EVENT, { detail: { type } })
      );
    },
    [navigate]
  );

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((currentValue) => !currentValue);
  }, [setIsSidebarCollapsed]);

  const handleToggleDemoBadge = useCallback(() => {
    updatePreferences((current) => ({
      showDemoBadge: !current.showDemoBadge,
    }));
  }, [updatePreferences]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    updatePreferences({ theme: nextTheme });
  }, [setTheme, theme, updatePreferences]);

  const quickActions = useMemo(
    () =>
      buildQuickActions({
        canAccessFacilityAdmin,
        canAccessOrganizationAdmin,
        onClose: () => setIsQuickActionsOpen(false),
        onCreatePatient: () => patientFlow.modal.open({ mode: "create" }),
        onNewAppointment: () => dispatchScheduleQuickAction("new-appointment"),
        onNavigate: navigate,
        onOpenNotes: () => setIsNotesOpen(true),
        onOpenPatientSearch: openPatientSearch,
        onOpenPreferences: () => setIsPreferencesOpen(true),
        onSetScheduleView: (view) =>
          dispatchScheduleQuickAction(`view:${view}`),
        onShowScheduleToday: () => dispatchScheduleQuickAction("today"),
        onToggleDemoBadge: handleToggleDemoBadge,
        onToggleSidebar: handleToggleSidebar,
        onToggleTheme: handleToggleTheme,
        preferences,
        showDemoActions: DEMO_MODE,
      }),
    [
      canAccessFacilityAdmin,
      canAccessOrganizationAdmin,
      dispatchScheduleQuickAction,
      handleToggleDemoBadge,
      handleToggleSidebar,
      handleToggleTheme,
      navigate,
      openPatientSearch,
      patientFlow,
      preferences,
    ]
  );

  const visibleRecentPatients = recentPatients.slice(
    0,
    RECENT_PATIENTS_VISIBLE_COUNT
  );

  useEffect(() => {
    if (preferences.theme === theme) return;
    setTheme(preferences.theme);
  }, [preferences.theme, setTheme, theme]);

  useEffect(() => {
    if (!personalNotesKey) {
      return;
    }

    const legacyNote = localStorage.getItem(personalNotesKey);
    if (!legacyNote || personalNote) return;

    updatePreferences({ personalNotes: legacyNote });
    localStorage.removeItem(personalNotesKey);
  }, [personalNote, personalNotesKey, updatePreferences]);

  useEffect(() => {
    if (!personalNotesKey) return undefined;

    const handleLogout = () => {
      if (!preferences.clearPersonalNotesOnLogout) return;
      localStorage.removeItem(personalNotesKey);
      const nextPreferences = {
        ...preferences,
        personalNotes: "",
      };
      updatePreferences(nextPreferences);
      updateUserPreferences(nextPreferences).catch((error) => {
        console.error("Failed to clear personal notes on logout.", error);
      });
    };

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [personalNotesKey, preferences, updatePreferences]);

  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!(target instanceof HTMLElement)) return false;

      const tagName = target.tagName.toLowerCase();
      return (
        target.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return;

      const normalizedKey = event.key.toLowerCase();

      if (
        normalizedKey === "k" &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey
      ) {
        event.preventDefault();
        setIsQuickActionsOpen(true);
        return;
      }

      const matchedSlot = getMatchingQuickActionSlot(event);
      if (!matchedSlot) return;

      const actionKey = getStoredQuickActionAssignments(preferences).find(
        (entry) => entry.code === matchedSlot.code
      )?.actionKey;
      const action = quickActions.find((item) => item.key === actionKey);

      if (!action) return;

      event.preventDefault();
      action.onClick?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openPatientSearch, preferences, quickActions]);

  return (
    <div className="cf-app-shell relative flex h-full w-full overflow-hidden bg-cf-page-bg">
      {DEMO_MODE && preferences.showDemoBadge && (
        <div className="fixed bottom-5 right-0 z-40 sm:bottom-6">
          <button
            type="button"
            onClick={() => setIsDemoBadgeDocked((prev) => !prev)}
            aria-label={
              isDemoBadgeDocked
                ? "Show demo mode badge"
                : "Hide demo mode badge"
            }
            title={
              isDemoBadgeDocked
                ? "Show demo mode badge"
                : "Hide demo mode badge"
            }
            className={[
              "group flex items-center gap-3 rounded-l-2xl border border-r-0 border-cf-border bg-cf-surface/92 px-3 py-3 text-cf-text shadow-[var(--shadow-panel-lg)] backdrop-blur-md transition-transform duration-200 hover:bg-cf-surface",
              isDemoBadgeDocked
                ? "translate-x-[calc(100%-3.5rem)]"
                : "translate-x-0",
            ].join(" ")}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-muted text-cf-text-subtle">
              <Sparkles className="h-4.5 w-4.5" />
            </div>

            <div
              className={[
                "min-w-0 text-left transition-opacity duration-150",
                isDemoBadgeDocked
                  ? "pointer-events-none opacity-0"
                  : "opacity-100",
              ].join(" ")}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                Environment
              </div>
              <div className="text-sm font-semibold tracking-tight text-cf-text">
                Demo Mode
              </div>
            </div>

            <div className="flex h-10 w-7 shrink-0 items-center justify-center text-cf-text-subtle transition group-hover:text-cf-text">
              {isDemoBadgeDocked ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </button>
        </div>
      )}

      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppNavbarContainer
          onOpenPatientSearch={openPatientSearch}
          onOpenQuickActions={() => setIsQuickActionsOpen(true)}
          onOpenNotes={() => setIsNotesOpen(true)}
          onOpenPreferences={() => setIsPreferencesOpen(true)}
          recentPatients={visibleRecentPatients}
          onOpenRecentPatient={openRecentPatient}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>

      <QuickActionsPalette
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        hasAnyAdminAccess={hasAnyAdminAccess}
        canAccessFacilityAdmin={canAccessFacilityAdmin}
        canAccessOrganizationAdmin={canAccessOrganizationAdmin}
        onOpenPatientSearch={openPatientSearch}
        onCreatePatient={() => patientFlow.modal.open({ mode: "create" })}
        onNewAppointment={() => dispatchScheduleQuickAction("new-appointment")}
        onNavigate={navigate}
        onOpenNotes={() => setIsNotesOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onSetScheduleView={(view) =>
          dispatchScheduleQuickAction(`view:${view}`)
        }
        onShowScheduleToday={() => dispatchScheduleQuickAction("today")}
        onToggleDemoBadge={handleToggleDemoBadge}
        onToggleSidebar={handleToggleSidebar}
        onToggleTheme={handleToggleTheme}
        showDemoActions={DEMO_MODE}
      />

      <PersonalNotesModal
        isOpen={isNotesOpen}
        note={personalNote}
        onChangeNote={(nextNote) =>
          updatePreferences({ personalNotes: nextNote })
        }
        onClearNote={() => updatePreferences({ personalNotes: "" })}
        onClose={() => setIsNotesOpen(false)}
      />

      <UserPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </div>
  );
}

export default function AppShell() {
  const { selectedFacilityId } = useFacility();
  const { user } = useAuth();
  const { preferences, isHydrated } = useUserPreferences();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const initialSidebarUserIdRef = useRef(null);
  const {
    genderOptions,
    careProviders,
    pharmacies,
    isLoading: isFacilityConfigLoading,
  } = useFacilityConfig();
  const { setShellReady } = useBootReadiness();

  useEffect(() => {
    if (!selectedFacilityId || isFacilityConfigLoading) return;
    setShellReady(true);
  }, [isFacilityConfigLoading, selectedFacilityId, setShellReady]);

  useEffect(() => {
    const userKey = user?.id || user?.username || "anonymous";
    if (!isHydrated || initialSidebarUserIdRef.current === userKey) return;

    setIsSidebarCollapsed(preferences.sidebarCollapsed);
    initialSidebarUserIdRef.current = userKey;
  }, [isHydrated, preferences.sidebarCollapsed, user?.id, user?.username]);

  return (
    <div className="h-full w-full overflow-hidden">
      <PatientFlowProvider
        facilityId={selectedFacilityId}
        genderOptions={genderOptions}
        careProviders={careProviders}
        pharmacies={pharmacies}
        onSelectPatient={null}
      >
        <AppShellLayout
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />
      </PatientFlowProvider>
    </div>
  );
}
