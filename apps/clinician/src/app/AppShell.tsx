import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import AppNavbar from "./components/AppNavbar";
import AppSidebar from "./components/AppSidebar";
import QuickActionsPalette from "../shared/components/QuickActionsPalette";
import PersonalNotesModal from "../shared/components/PersonalNotesModal";
import UserPreferencesModal from "../shared/components/UserPreferencesModal";
import useFacilityConfig from "../features/facilities/hooks/useFacilityConfig";
import useFacility from "../features/facilities/hooks/useFacility";
import useAdminPermissions from "../features/admin/hooks/shared/useAdminPermissions";
import { AppointmentFlowProvider } from "../features/appointments/AppointmentFlowProvider";
import {
  PatientFlowProvider,
  usePatientFlowContext,
} from "../features/patients/PatientFlowProvider";
import { useAuth } from "../features/auth/AuthProvider";

import { useUserPreferences } from "./context/UserPreferencesProvider";
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

import type { Dispatch, SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { PatientLike, UserProfile } from "../shared/types/domain";

const RECENT_PATIENTS_VISIBLE_COUNT = 6;

function getPersonalNotesKey(user: UserProfile | null) {
  if (!user) return null;
  return `cf-personal-notes:${user.id || user.username || "user"}`;
}

type AppNavbarContainerProps = {
  onOpenPatientSearch: (source: string) => void;
  onOpenQuickActions: () => void;
  onOpenNotes: () => void;
  onOpenPreferences: () => void;
  recentPatients: PatientLike[];
  onOpenRecentPatient: (patient: PatientLike) => void;
};

// Paths whose only job is to <Navigate replace /> elsewhere (e.g.
// /admin resolves to /admin/organization or /admin/facility based on
// the user's permissions). Skipping the fade on these prevents the
// double-flicker that a transient mount + redirect would otherwise
// produce.
const TRANSIENT_REDIRECT_PATHS = new Set(["/admin"]);

function AppNavbarContainer({
  onOpenPatientSearch,
  onOpenQuickActions,
  onOpenNotes,
  onOpenPreferences,
  recentPatients,
  onOpenRecentPatient,
}: AppNavbarContainerProps) {
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

type AppShellLayoutProps = {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
};

function AppShellLayout({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
}: AppShellLayoutProps) {
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
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
    (type: string) => {
      sessionStorage.setItem(SCHEDULE_QUICK_ACTION_STORAGE_KEY, type);
      navigate("/schedule");
      window.dispatchEvent(
        new CustomEvent(SCHEDULE_QUICK_ACTION_EVENT, { detail: { type } })
      );
    },
    [navigate]
  );

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((currentValue: boolean) => !currentValue);
  }, [setIsSidebarCollapsed]);

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
        onNavigate: navigate as NavigateFunction,
        onOpenNotes: () => setIsNotesOpen(true),
        onOpenPatientSearch: openPatientSearch,
        onOpenPreferences: () => setIsPreferencesOpen(true),
        onSetScheduleView: (view) =>
          dispatchScheduleQuickAction(`view:${view}`),
        onShowScheduleToday: () => dispatchScheduleQuickAction("today"),
        onToggleSidebar: handleToggleSidebar,
        onToggleTheme: handleToggleTheme,
        preferences,
      }),
    [
      canAccessFacilityAdmin,
      canAccessOrganizationAdmin,
      dispatchScheduleQuickAction,
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
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;

      const tagName = target.tagName.toLowerCase();
      return (
        target.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
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

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-0 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 xl:px-7 xl:pb-7">
          <div
            key={location.pathname}
            className={`cf-route-frame min-h-0 flex-1 overflow-hidden ${
              // Routes whose sole job is to <Navigate replace /> elsewhere
              // (e.g. /admin → /admin/organization or /admin/facility based
              // on permissions) shouldn't fire the page fade — otherwise
              // the user sees two fades in rapid succession.
              TRANSIENT_REDIRECT_PATHS.has(location.pathname)
                ? ""
                : "cf-page-fade-in"
            }`}
          >
            <Outlet />
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
        onToggleSidebar={handleToggleSidebar}
        onToggleTheme={handleToggleTheme}
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
  const initialSidebarUserIdRef = useRef<string | number | null>(null);
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
        <AppointmentFlowProvider>
          <AppShellLayout
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
          />
        </AppointmentFlowProvider>
      </PatientFlowProvider>
    </div>
  );
}
