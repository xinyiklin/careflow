import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_USER_PREFERENCES,
  normalizeLastFacilityForUser,
  resetWorkspaceAppearance,
  sanitizePreferences,
} from "./userPreferences.ts";
import {
  getInitialNavigationCollapsed,
  selectNavigationMode,
  toggleNavigation,
} from "./mainNavigationPreference.ts";

test("existing binary startup choices and missing/invalid new fields preserve safe defaults", () => {
  for (const legacy of [true, false]) {
    const prefs = sanitizePreferences({ sidebarCollapsed: legacy });
    assert.equal(prefs.sidebarStartupMode, legacy ? "collapsed" : "expanded");
    assert.equal(getInitialNavigationCollapsed(prefs), legacy);
    assert.equal(prefs.showScheduleFullDay, false);
    assert.equal(prefs.blockedSlotAppearance, "patterned");
  }
  for (const input of [
    {},
    null,
    [],
    "bad",
    {
      sidebarCollapsed: "false",
      sidebarStartupMode: "bad",
      showScheduleFullDay: "true",
      blockedSlotAppearance: "hidden",
    },
  ]) {
    const prefs = sanitizePreferences(input);
    assert.equal(prefs.sidebarStartupMode, "remember");
    assert.equal(prefs.showScheduleFullDay, false);
    assert.equal(prefs.blockedSlotAppearance, "patterned");
  }
});

test("current saved controls round trip and take precedence over the legacy mirror", () => {
  const prefs = sanitizePreferences({
    sidebarCollapsed: true,
    sidebarStartupMode: "expanded",
    sidebarLastCollapsed: true,
    showScheduleFullDay: true,
    blockedSlotAppearance: "solid",
  });
  assert.equal(prefs.sidebarCollapsed, false);
  assert.deepEqual(
    sanitizePreferences(JSON.parse(JSON.stringify(prefs))),
    prefs
  );
});

test("fixed modes apply immediately but manual toggles do not alter the next startup", () => {
  for (const mode of ["expanded", "collapsed"]) {
    const selected = selectNavigationMode(mode, mode === "expanded");
    assert.equal(selected.collapsed, mode === "collapsed");
    const toggled = toggleNavigation(mode, selected.collapsed);
    assert.equal(toggled.collapsed, !selected.collapsed);
    assert.deepEqual(toggled.preferences, {});
    assert.equal(
      getInitialNavigationCollapsed(sanitizePreferences(selected.preferences)),
      selected.collapsed
    );
  }
});

test("remember captures the visible state and persists each manual toggle for reload", () => {
  for (const visible of [true, false]) {
    const selected = selectNavigationMode("remember", visible);
    assert.equal(selected.collapsed, visible);
    let prefs = sanitizePreferences(selected.preferences);
    const toggle = toggleNavigation("remember", selected.collapsed);
    prefs = sanitizePreferences({ ...prefs, ...toggle.preferences });
    assert.equal(getInitialNavigationCollapsed(prefs), !visible);
    assert.equal(prefs.sidebarCollapsed, !visible);
  }
});

test("appearance reset retains all non-display content and leaves its input untouched", () => {
  const before = sanitizePreferences({
    personalNotes: "private sentinel",
    recentPatients: [{ id: "history-sentinel" }],
    clearRecentPatientsOnLogout: false,
    clearPersonalNotesOnLogout: true,
    lastFacilityId: "facility-sentinel",
    defaultLandingPage: "admin",
    quickActionAssignments: [
      ...DEFAULT_USER_PREFERENCES.quickActionAssignments,
    ].reverse(),
    theme: "dark",
    sidebarStartupMode: "remember",
    sidebarLastCollapsed: true,
    showScheduleFullDay: true,
    blockedSlotAppearance: "solid",
    scheduleStartMode: "days",
    scheduleViewMode: "agenda",
    showScheduleSlotDividers: false,
    showScheduleHeatmap: false,
    scheduleHeatmapMode: "target",
    scheduleHeatmapDailyTarget: 99,
    appointmentBlockDisplay: { showDob: true, showNotes: true },
  });
  const frozen = JSON.parse(JSON.stringify(before));
  const after = resetWorkspaceAppearance(before);
  for (const key of [
    "personalNotes",
    "recentPatients",
    "clearRecentPatientsOnLogout",
    "clearPersonalNotesOnLogout",
    "lastFacilityId",
    "defaultLandingPage",
    "quickActionAssignments",
  ]) {
    assert.deepEqual(after[key], before[key], key);
  }
  for (const key of [
    "theme",
    "sidebarStartupMode",
    "showScheduleFullDay",
    "blockedSlotAppearance",
    "scheduleStartMode",
    "scheduleViewMode",
    "showScheduleSlotDividers",
    "showScheduleHeatmap",
    "scheduleHeatmapMode",
    "scheduleHeatmapDailyTarget",
    "appointmentBlockDisplay",
  ]) {
    assert.deepEqual(after[key], DEFAULT_USER_PREFERENCES[key], key);
  }
  assert.equal(after.sidebarLastCollapsed, true);
  assert.equal(after.sidebarCollapsed, true);
  assert.deepEqual(before, frozen);
});

test("facility normalization does not import another user's content", () => {
  const prefs = sanitizePreferences({
    lastFacilityId: "previous-facility",
    personalNotes: "current user's note",
  });
  const next = normalizeLastFacilityForUser(prefs, {
    id: "current",
    memberships: [{ facility: { id: "assigned" } }],
  });
  assert.equal(next.lastFacilityId, "assigned");
  assert.equal(next.personalNotes, prefs.personalNotes);
  assert.equal(normalizeLastFacilityForUser(prefs, null).lastFacilityId, "");
});

test("reset remembers the visible sidebar even after toggling a fixed startup mode", () => {
  for (const mode of ["expanded", "collapsed", "remember"]) {
    for (const visible of [true, false]) {
      const before = sanitizePreferences({
        sidebarStartupMode: mode,
        sidebarLastCollapsed: !visible,
      });
      const after = resetWorkspaceAppearance(before, visible);
      assert.equal(after.sidebarStartupMode, "remember");
      assert.equal(
        getInitialNavigationCollapsed(sanitizePreferences(after)),
        visible
      );
      const toggled = toggleNavigation(after.sidebarStartupMode, visible);
      assert.equal(
        getInitialNavigationCollapsed(
          sanitizePreferences({
            ...after,
            ...toggled.preferences,
          })
        ),
        !visible
      );
    }
  }
});
