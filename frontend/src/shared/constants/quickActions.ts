import {
  Building2,
  CalendarDays,
  CalendarPlus,
  FileText,
  List,
  NotebookText,
  PanelLeft,
  Plus,
  Search,
  SlidersHorizontal,
  SunMoon,
  Users,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import type { QuickActionAssignment, UserPreferences } from "../types/domain";

export type QuickActionSlot = {
  label: string;
  code: string;
  shiftKey: boolean;
};

export type QuickActionAccess =
  | boolean
  | {
      hasAnyAdminAccess?: boolean;
      canAccessOrganizationAdmin?: boolean;
      canAccessFacilityAdmin?: boolean;
    }
  | null
  | undefined;

type QuickActionOption = {
  key: string;
  label: string;
  requiresAdmin?: boolean;
  requiresFacilityAdmin?: boolean;
  requiresOrganizationAdmin?: boolean;
};

type QuickActionKeyEvent = {
  code: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
};

type LegacyQuickActionAssignment = Partial<QuickActionAssignment> & {
  [key: string]: unknown;
};

type QuickActionPreferences =
  | Pick<UserPreferences, "quickActionAssignments">
  | Partial<Pick<UserPreferences, "quickActionAssignments">>
  | null
  | undefined;

export type BuiltQuickAction = {
  key: string;
  icon: LucideIcon;
  label: string;
  keywords: string;
  onClick: () => void;
  assignedShortcut: (QuickActionSlot & { actionKey: string }) | null;
  meta: string | null;
};

type BuildQuickActionsOptions = {
  hasAnyAdminAccess?: boolean;
  canAccessFacilityAdmin?: boolean;
  canAccessOrganizationAdmin?: boolean;
  onClose?: () => void;
  onCreatePatient?: () => void;
  onNewAppointment?: () => void;
  onNavigate?: (path: string) => void;
  onOpenNotes?: () => void;
  onOpenPatientSearch?: (source: string) => void;
  onOpenPreferences?: () => void;
  onSetScheduleView?: (viewMode: UserPreferences["scheduleViewMode"]) => void;
  onShowScheduleToday?: () => void;
  onToggleDemoBadge?: () => void;
  onToggleSidebar?: () => void;
  onToggleTheme?: () => void;
  preferences?: QuickActionPreferences;
  showDemoActions?: boolean;
};

export const QUICK_ACTION_SLOTS = [
  { label: "/", code: "Slash", shiftKey: false },
  { label: "Shift + N", code: "KeyN", shiftKey: true },
  { label: "Shift + A", code: "KeyA", shiftKey: true },
  { label: "Shift + 1", code: "Digit1", shiftKey: true },
  { label: "Shift + 2", code: "Digit2", shiftKey: true },
  { label: "Shift + 3", code: "Digit3", shiftKey: true },
  { label: "Shift + 4", code: "Digit4", shiftKey: true },
  { label: "Shift + 5", code: "Digit5", shiftKey: true },
  { label: "Shift + 6", code: "Digit6", shiftKey: true },
  { label: "Shift + 7", code: "Digit7", shiftKey: true },
  { label: "Shift + 8", code: "Digit8", shiftKey: true },
  { label: "Shift + 9", code: "Digit9", shiftKey: true },
] satisfies QuickActionSlot[];

export const DEFAULT_QUICK_ACTION_ASSIGNMENTS = [
  { code: "Slash", actionKey: "search-patients" },
  { code: "KeyN", actionKey: "new-patient" },
  { code: "KeyA", actionKey: "schedule-agenda-view" },
  { code: "Digit1", actionKey: "go-documents" },
  { code: "Digit3", actionKey: "customize-workspace" },
  { code: "Digit4", actionKey: "open-notes" },
  { code: "Digit5", actionKey: "toggle-theme" },
  { code: "Digit6", actionKey: "new-appointment" },
  { code: "Digit7", actionKey: "schedule-today" },
  { code: "Digit8", actionKey: "toggle-sidebar" },
] satisfies QuickActionAssignment[];

export const QUICK_ACTION_OPTIONS = [
  { key: "search-patients", label: "Search Patient", requiresAdmin: false },
  { key: "new-patient", label: "New Patient", requiresAdmin: false },
  {
    key: "new-appointment",
    label: "Schedule Appointment",
    requiresAdmin: false,
  },
  { key: "go-documents", label: "Open Documents", requiresAdmin: false },
  { key: "schedule-today", label: "Jump to Today", requiresAdmin: false },
  { key: "schedule-slot-view", label: "Use Slot View", requiresAdmin: false },
  {
    key: "schedule-agenda-view",
    label: "Use Agenda View",
    requiresAdmin: false,
  },
  { key: "open-notes", label: "Open Notes", requiresAdmin: false },
  {
    key: "customize-workspace",
    label: "Customize Workspace",
    requiresAdmin: false,
  },
  {
    key: "toggle-theme",
    label: "Toggle Light/Dark Mode",
    requiresAdmin: false,
  },
  { key: "toggle-sidebar", label: "Toggle Sidebar", requiresAdmin: false },
  {
    key: "toggle-demo-badge",
    label: "Toggle Demo Badge",
    requiresAdmin: false,
  },
  {
    key: "go-facility-admin",
    label: "Go to Facility Admin",
    requiresFacilityAdmin: true,
  },
  {
    key: "go-organization-admin",
    label: "Go to Organization Admin",
    requiresOrganizationAdmin: true,
  },
] satisfies QuickActionOption[];

export const SCHEDULE_QUICK_ACTION_EVENT = "careflow:schedule-quick-action";
export const SCHEDULE_QUICK_ACTION_STORAGE_KEY =
  "cf-pending-schedule-quick-action";

function normalizeQuickActionAccess(access: QuickActionAccess) {
  if (access && typeof access === "object") {
    const hasAnyAdminAccess = Boolean(access.hasAnyAdminAccess);
    const canAccessOrganizationAdmin = Boolean(
      access.canAccessOrganizationAdmin
    );
    const canAccessFacilityAdmin = Boolean(access.canAccessFacilityAdmin);

    return {
      hasAnyAdminAccess:
        hasAnyAdminAccess ||
        canAccessOrganizationAdmin ||
        canAccessFacilityAdmin,
      canAccessOrganizationAdmin,
      canAccessFacilityAdmin,
    };
  }

  const hasAnyAdminAccess = Boolean(access);
  return {
    hasAnyAdminAccess,
    canAccessOrganizationAdmin: hasAnyAdminAccess,
    canAccessFacilityAdmin: hasAnyAdminAccess,
  };
}

function canUseQuickActionOption(
  option: QuickActionOption,
  access: QuickActionAccess
) {
  const normalizedAccess = normalizeQuickActionAccess(access);

  if (option.requiresOrganizationAdmin) {
    return normalizedAccess.canAccessOrganizationAdmin;
  }

  if (option.requiresFacilityAdmin) {
    return normalizedAccess.canAccessFacilityAdmin;
  }

  if (option.requiresAdmin) {
    return normalizedAccess.hasAnyAdminAccess;
  }

  return true;
}

function dedupeAssignments(assignments: LegacyQuickActionAssignment[]) {
  const usedCodes = new Set();
  const usedActions = new Set();

  return assignments.filter((entry): entry is QuickActionAssignment => {
    if (!entry?.code || !entry?.actionKey) return false;
    if (usedCodes.has(entry.code) || usedActions.has(entry.actionKey))
      return false;
    usedCodes.add(entry.code);
    usedActions.add(entry.actionKey);
    return true;
  });
}

export function isAllowedQuickActionCode(code: unknown) {
  return QUICK_ACTION_SLOTS.some((slot) => slot.code === code);
}

export function getMatchingQuickActionSlot(event: QuickActionKeyEvent) {
  return (
    QUICK_ACTION_SLOTS.find(
      (slot) =>
        slot.code === event.code &&
        Boolean(slot.shiftKey) === Boolean(event.shiftKey) &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
    ) || null
  );
}

export function isKnownQuickActionKey(actionKey: unknown) {
  return QUICK_ACTION_OPTIONS.some((option) => option.key === actionKey);
}

export function isAllowedQuickActionKey(
  actionKey: unknown,
  access: QuickActionAccess
) {
  return getQuickActionOptions(access).some(
    (option) => option.key === actionKey
  );
}

export function sanitizeQuickActionAssignments(
  assignments: unknown
): QuickActionAssignment[] {
  const safeAssignments = Array.isArray(assignments) ? assignments : [];

  return dedupeAssignments(
    safeAssignments
      .map((entry) => entry as LegacyQuickActionAssignment)
      .filter(
        (entry) =>
          isAllowedQuickActionCode(entry?.code) &&
          isKnownQuickActionKey(entry?.actionKey)
      )
  );
}

export function buildQuickActionAssignmentsFromLegacy(
  legacyCustomShortcuts: unknown
): QuickActionAssignment[] {
  const migratedLegacyShortcuts = Array.isArray(legacyCustomShortcuts)
    ? legacyCustomShortcuts.map((entry) => {
        const legacyEntry = entry as LegacyQuickActionAssignment;
        if (typeof legacyEntry?.code !== "string") return legacyEntry;

        const legacyCodeMap = {
          Digit7: "Digit4",
          Digit8: "Digit5",
          Digit9: "Digit6",
          Digit0: "Digit6",
        } satisfies Record<string, string>;
        const mappedCode =
          legacyCodeMap[legacyEntry.code as keyof typeof legacyCodeMap];

        return {
          ...legacyEntry,
          code: mappedCode || legacyEntry.code,
        };
      })
    : [];

  return sanitizeQuickActionAssignments([
    ...DEFAULT_QUICK_ACTION_ASSIGNMENTS,
    ...migratedLegacyShortcuts,
  ]);
}

export function getQuickActionOptions(access: QuickActionAccess) {
  return QUICK_ACTION_OPTIONS.filter((option) =>
    canUseQuickActionOption(option, access)
  ).map(({ key, label }) => ({ key, label }));
}

export function getStoredQuickActionAssignments(
  preferences: QuickActionPreferences
) {
  return sanitizeQuickActionAssignments(preferences?.quickActionAssignments);
}

export function getAssignedQuickActionSlot(
  actionKey: string,
  preferences: QuickActionPreferences
) {
  const assignment = getStoredQuickActionAssignments(preferences).find(
    (entry) => entry.actionKey === actionKey
  );

  if (!assignment) return null;

  const slot = QUICK_ACTION_SLOTS.find(
    (candidate) => candidate.code === assignment.code
  );
  return slot ? { ...slot, actionKey } : null;
}

export function getAvailableQuickActionSlots(
  preferences: QuickActionPreferences,
  currentCode: string | null = null
) {
  const usedCodes = new Set(
    getStoredQuickActionAssignments(preferences)
      .map((entry) => entry.code)
      .filter((code) => code !== currentCode)
  );

  return QUICK_ACTION_SLOTS.filter((slot) => !usedCodes.has(slot.code));
}

export function getUnassignedQuickActionOptions(
  access: QuickActionAccess,
  preferences: QuickActionPreferences
) {
  const assignedActionKeys = new Set(
    getStoredQuickActionAssignments(preferences).map((entry) => entry.actionKey)
  );

  return getQuickActionOptions(access).filter(
    (option) => !assignedActionKeys.has(option.key)
  );
}

export function buildQuickActions({
  canAccessFacilityAdmin = false,
  canAccessOrganizationAdmin = false,
  onClose,
  onCreatePatient,
  onNewAppointment,
  onNavigate,
  onOpenNotes,
  onOpenPatientSearch,
  onOpenPreferences,
  onSetScheduleView,
  onShowScheduleToday,
  onToggleDemoBadge,
  onToggleSidebar,
  onToggleTheme,
  preferences,
  showDemoActions = false,
}: BuildQuickActionsOptions): BuiltQuickAction[] {
  const actionDefinitions = [
    {
      key: "search-patients",
      icon: Search,
      label: "Search Patient",
      keywords: "search patients global patient finder lookup hub chart",
      onClick: () => {
        onClose?.();
        onOpenPatientSearch?.("palette");
      },
    },
    {
      key: "new-patient",
      icon: Plus,
      label: "New Patient",
      keywords: "new patient create patient intake register",
      onClick: () => {
        onClose?.();
        onCreatePatient?.();
      },
    },
    {
      key: "new-appointment",
      icon: CalendarPlus,
      label: "Schedule Appointment",
      keywords: "new appointment create schedule booking visit",
      onClick: () => {
        onClose?.();
        onNewAppointment?.();
      },
    },
    {
      key: "go-documents",
      icon: FileText,
      label: "Open Documents",
      keywords: "documents files labs imaging referrals upload",
      onClick: () => {
        onClose?.();
        onNavigate?.("/documents");
      },
    },
    {
      key: "schedule-today",
      icon: CalendarDays,
      label: "Jump to Today",
      keywords: "today schedule appointments calendar current date",
      onClick: () => {
        onClose?.();
        onShowScheduleToday?.();
      },
    },
    {
      key: "schedule-slot-view",
      icon: CalendarDays,
      label: "Use Slot View",
      keywords: "schedule slot view calendar day columns appointments",
      onClick: () => {
        onClose?.();
        onSetScheduleView?.("slot");
      },
    },
    {
      key: "schedule-agenda-view",
      icon: List,
      label: "Use Agenda View",
      keywords: "schedule agenda list view appointments",
      onClick: () => {
        onClose?.();
        onSetScheduleView?.("agenda");
      },
    },
    {
      key: "open-notes",
      icon: NotebookText,
      label: "Open Notes",
      keywords: "notes note memo scratchpad personal workspace",
      onClick: () => {
        onClose?.();
        onOpenNotes?.();
      },
    },
    {
      key: "customize-workspace",
      icon: SlidersHorizontal,
      label: "Customize Workspace",
      keywords: "customize workspace preferences settings personalize shell",
      onClick: () => {
        onClose?.();
        onOpenPreferences?.();
      },
    },
    {
      key: "toggle-theme",
      icon: SunMoon,
      label: "Toggle Light/Dark Mode",
      keywords: "toggle theme dark light mode appearance display",
      onClick: () => {
        onClose?.();
        onToggleTheme?.();
      },
    },
    {
      key: "toggle-sidebar",
      icon: PanelLeft,
      label: "Toggle Sidebar",
      keywords: "sidebar collapse expand navigation workspace",
      onClick: () => {
        onClose?.();
        onToggleSidebar?.();
      },
    },
    ...(showDemoActions
      ? [
          {
            key: "toggle-demo-badge",
            icon: SlidersHorizontal,
            label: "Toggle Demo Badge",
            keywords: "demo badge environment show hide",
            onClick: () => {
              onClose?.();
              onToggleDemoBadge?.();
            },
          },
        ]
      : []),
    ...(canAccessFacilityAdmin
      ? [
          {
            key: "go-facility-admin",
            icon: Building2,
            label: "Go to Facility Admin",
            keywords:
              "admin facility configuration schedule resources staff statuses",
            onClick: () => {
              onClose?.();
              onNavigate?.("/admin/facility");
            },
          },
        ]
      : []),
    ...(canAccessOrganizationAdmin
      ? [
          {
            key: "go-organization-admin",
            icon: Users,
            label: "Go to Organization Admin",
            keywords: "admin organization users facilities pharmacies",
            onClick: () => {
              onClose?.();
              onNavigate?.("/admin/organization");
            },
          },
        ]
      : []),
  ] satisfies Omit<BuiltQuickAction, "assignedShortcut" | "meta">[];

  return actionDefinitions.map((action) => {
    const assignedShortcut = getAssignedQuickActionSlot(
      action.key,
      preferences
    );

    return {
      ...action,
      assignedShortcut,
      meta: assignedShortcut?.label || null,
    };
  });
}
