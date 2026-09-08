import {
  buildQuickActionAssignmentsFromLegacy,
  DEFAULT_QUICK_ACTION_ASSIGNMENTS,
  sanitizeQuickActionAssignments,
} from "../../shared/constants/quickActions";
import {
  DEFAULT_APPOINTMENT_BLOCK_DISPLAY,
  sanitizeAppointmentBlockDisplay,
} from "../../shared/constants/appointmentBlockDisplay";

import type { UserPreferences, UserProfile } from "../../shared/types/domain";

type RawPreferences = Partial<UserPreferences> & {
  customQuickActionShortcuts?: unknown;
  [key: string]: unknown;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultLandingPage: "schedule",
  lastFacilityId: "",
  sidebarCollapsed: false,
  overviewDensity: "balanced",
  scheduleStartMode: "resources",
  scheduleViewMode: "slot",
  showScheduleSlotDividers: true,
  appointmentBlockDisplay: DEFAULT_APPOINTMENT_BLOCK_DISPLAY,
  theme: "system",
  clearRecentPatientsOnLogout: true,
  recentPatients: [],
  clearPersonalNotesOnLogout: false,
  personalNotes: "",
  showDemoBadge: true,
  quickActionAssignments: DEFAULT_QUICK_ACTION_ASSIGNMENTS,
  showScheduleHeatmap: true,
  scheduleHeatmapMode: "auto",
  scheduleHeatmapDailyTarget: 20,
};

function isRawPreferences(value: unknown): value is RawPreferences {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeScheduleViewMode(value: unknown) {
  return value === "agenda"
    ? "agenda"
    : DEFAULT_USER_PREFERENCES.scheduleViewMode;
}

function sanitizeScheduleStartMode(value: unknown) {
  return value === "days" ? "days" : DEFAULT_USER_PREFERENCES.scheduleStartMode;
}

function sanitizeLandingPage(value: unknown) {
  return value === "admin"
    ? "admin"
    : DEFAULT_USER_PREFERENCES.defaultLandingPage;
}

function sanitizeFacilityId(value: unknown) {
  if (value == null || value === "")
    return DEFAULT_USER_PREFERENCES.lastFacilityId;
  return String(value);
}

export function normalizeLastFacilityForUser(
  preferences: UserPreferences,
  user: UserProfile | null
): UserPreferences {
  const memberships = Array.isArray(user?.memberships) ? user.memberships : [];
  const facilityIds = memberships
    .map((membership) => membership?.facility?.id)
    .filter((facilityId) => facilityId != null)
    .map(String);

  if (!facilityIds.length) {
    const { defaultFacilityId: _legacyDefaultFacilityId, ...rest } =
      preferences;
    return {
      ...rest,
      lastFacilityId: DEFAULT_USER_PREFERENCES.lastFacilityId,
    };
  }

  const currentFacilityId = preferences.lastFacilityId
    ? String(preferences.lastFacilityId)
    : preferences.defaultFacilityId
      ? String(preferences.defaultFacilityId)
      : "";
  const { defaultFacilityId: _legacyDefaultFacilityId, ...rest } = preferences;

  return {
    ...rest,
    lastFacilityId: facilityIds.includes(currentFacilityId)
      ? currentFacilityId
      : facilityIds[0],
  };
}

function sanitizeTheme(value: unknown) {
  if (value === "dark" || value === "light" || value === "system") {
    return value;
  }
  return DEFAULT_USER_PREFERENCES.theme;
}

export function sanitizePreferences(value: unknown): UserPreferences {
  const nextPreferences = isRawPreferences(value) ? value : {};
  const nextQuickActionAssignments = Array.isArray(
    nextPreferences.quickActionAssignments
  )
    ? sanitizeQuickActionAssignments(nextPreferences.quickActionAssignments)
    : buildQuickActionAssignmentsFromLegacy(
        nextPreferences.customQuickActionShortcuts
      );

  return {
    ...DEFAULT_USER_PREFERENCES,
    defaultLandingPage: sanitizeLandingPage(nextPreferences.defaultLandingPage),
    lastFacilityId: sanitizeFacilityId(
      nextPreferences.lastFacilityId || nextPreferences.defaultFacilityId
    ),
    sidebarCollapsed: Boolean(nextPreferences.sidebarCollapsed),
    overviewDensity:
      nextPreferences.overviewDensity ||
      DEFAULT_USER_PREFERENCES.overviewDensity,
    scheduleStartMode: sanitizeScheduleStartMode(
      nextPreferences.scheduleStartMode
    ),
    scheduleViewMode: sanitizeScheduleViewMode(
      nextPreferences.scheduleViewMode
    ),
    showScheduleSlotDividers:
      typeof nextPreferences.showScheduleSlotDividers === "boolean"
        ? nextPreferences.showScheduleSlotDividers
        : DEFAULT_USER_PREFERENCES.showScheduleSlotDividers,
    appointmentBlockDisplay: sanitizeAppointmentBlockDisplay(
      nextPreferences.appointmentBlockDisplay
    ),
    theme: sanitizeTheme(nextPreferences.theme),
    clearRecentPatientsOnLogout:
      typeof nextPreferences.clearRecentPatientsOnLogout === "boolean"
        ? nextPreferences.clearRecentPatientsOnLogout
        : DEFAULT_USER_PREFERENCES.clearRecentPatientsOnLogout,
    recentPatients: Array.isArray(nextPreferences.recentPatients)
      ? nextPreferences.recentPatients.slice(0, 10)
      : DEFAULT_USER_PREFERENCES.recentPatients,
    clearPersonalNotesOnLogout:
      typeof nextPreferences.clearPersonalNotesOnLogout === "boolean"
        ? nextPreferences.clearPersonalNotesOnLogout
        : DEFAULT_USER_PREFERENCES.clearPersonalNotesOnLogout,
    personalNotes:
      typeof nextPreferences.personalNotes === "string"
        ? nextPreferences.personalNotes
        : DEFAULT_USER_PREFERENCES.personalNotes,
    showDemoBadge:
      typeof nextPreferences.showDemoBadge === "boolean"
        ? nextPreferences.showDemoBadge
        : DEFAULT_USER_PREFERENCES.showDemoBadge,
    quickActionAssignments: nextQuickActionAssignments.length
      ? nextQuickActionAssignments
      : DEFAULT_USER_PREFERENCES.quickActionAssignments,
    showScheduleHeatmap:
      typeof nextPreferences.showScheduleHeatmap === "boolean"
        ? nextPreferences.showScheduleHeatmap
        : DEFAULT_USER_PREFERENCES.showScheduleHeatmap,
    scheduleHeatmapMode:
      nextPreferences.scheduleHeatmapMode === "target"
        ? "target"
        : DEFAULT_USER_PREFERENCES.scheduleHeatmapMode,
    scheduleHeatmapDailyTarget:
      typeof nextPreferences.scheduleHeatmapDailyTarget === "number" &&
      nextPreferences.scheduleHeatmapDailyTarget > 0
        ? Math.round(nextPreferences.scheduleHeatmapDailyTarget)
        : DEFAULT_USER_PREFERENCES.scheduleHeatmapDailyTarget,
  };
}
