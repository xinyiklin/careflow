import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Keyboard,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import ModalShell from "./ui/ModalShell";
import { useUserPreferences } from "../../app/context/UserPreferencesProvider";
import { useTheme } from "../context/ThemeProvider";
import { useModalPresence } from "../hooks/useModalPresence";
import {
  buildQuickActions,
  type BuiltQuickAction,
  getStoredQuickActionAssignments,
  isAllowedQuickActionCode,
  isAllowedQuickActionKey,
  QUICK_ACTION_SLOTS,
} from "../constants/quickActions";

import type { DragEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { UserPreferences } from "../types/domain";

const DELETE_DROP_ZONE = "delete-drop-zone";

type QuickActionsPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  canAccessFacilityAdmin?: boolean;
  canAccessOrganizationAdmin?: boolean;
  hasAnyAdminAccess?: boolean;
  onOpenPatientSearch?: (source: string) => void;
  onCreatePatient?: () => void;
  onNewAppointment?: () => void;
  onNavigate?: NavigateFunction | ((path: string) => void);
  onOpenNotes?: () => void;
  onOpenPreferences?: () => void;
  onSetScheduleView?: (view: UserPreferences["scheduleViewMode"]) => void;
  onShowScheduleToday?: () => void;
  onToggleSidebar?: () => void;
  onToggleTheme?: () => void;
};

function matchesActionQuery(action: BuiltQuickAction, normalizedQuery: string) {
  if (!normalizedQuery) return true;

  return [action.label, action.keywords, action.meta]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export default function QuickActionsPalette({
  isOpen,
  onClose,
  canAccessFacilityAdmin,
  canAccessOrganizationAdmin,
  hasAnyAdminAccess,
  onOpenPatientSearch,
  onCreatePatient,
  onNewAppointment,
  onNavigate,
  onOpenNotes,
  onOpenPreferences,
  onSetScheduleView,
  onShowScheduleToday,
  onToggleSidebar,
  onToggleTheme,
}: QuickActionsPaletteProps) {
  const [query, setQuery] = useState("");
  const [editingSlotCode, setEditingSlotCode] = useState<string | null>(null);
  const [draftActionKey, setDraftActionKey] = useState("");
  const [draggedSlotCode, setDraggedSlotCode] = useState<string | null>(null);
  const [dropTargetCode, setDropTargetCode] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const suppressOpenRef = useRef(false);
  const { shouldRender } = useModalPresence(isOpen);
  const { preferences, updatePreferences } = useUserPreferences();
  const { toggleTheme } = useTheme();
  const handleToggleTheme = onToggleTheme || toggleTheme;

  const quickActionAccess = useMemo(
    () => ({
      canAccessFacilityAdmin,
      canAccessOrganizationAdmin,
      hasAnyAdminAccess,
    }),
    [canAccessFacilityAdmin, canAccessOrganizationAdmin, hasAnyAdminAccess]
  );

  const resetTransientState = useCallback(() => {
    setEditingSlotCode(null);
    setDraftActionKey("");
  }, []);

  const finishDragInteraction = useCallback(() => {
    setDraggedSlotCode(null);
    setDropTargetCode(null);
    window.setTimeout(() => {
      suppressOpenRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (shouldRender) return;
    setQuery("");
    resetTransientState();
    setDraggedSlotCode(null);
    setDropTargetCode(null);
  }, [resetTransientState, shouldRender]);

  const actions = useMemo(
    () =>
      buildQuickActions({
        canAccessFacilityAdmin,
        canAccessOrganizationAdmin,
        hasAnyAdminAccess,
        onClose,
        onCreatePatient,
        onNewAppointment,
        onNavigate,
        onOpenNotes,
        onOpenPatientSearch,
        onOpenPreferences,
        onSetScheduleView,
        onShowScheduleToday,
        onToggleSidebar,
        onToggleTheme: handleToggleTheme,
        preferences,
      }),
    [
      canAccessFacilityAdmin,
      canAccessOrganizationAdmin,
      hasAnyAdminAccess,
      onClose,
      onCreatePatient,
      onNewAppointment,
      onNavigate,
      onOpenNotes,
      onOpenPatientSearch,
      onOpenPreferences,
      onSetScheduleView,
      onShowScheduleToday,
      onToggleSidebar,
      handleToggleTheme,
      preferences,
    ]
  );

  const actionsByKey = useMemo(
    () => new Map(actions.map((action) => [action.key, action])),
    [actions]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredActionOptions = useMemo(
    () =>
      actions.filter((action) => matchesActionQuery(action, normalizedQuery)),
    [actions, normalizedQuery]
  );

  // Reset activeIndex when query or list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query, filteredActionOptions]);

  const slotCards = useMemo(() => {
    const assignmentsByCode = new Map(
      getStoredQuickActionAssignments(preferences).map((entry) => [
        entry.code,
        entry,
      ])
    );

    return QUICK_ACTION_SLOTS.map((slot) => {
      const assignment = assignmentsByCode.get(slot.code) || null;
      const action = assignment
        ? actionsByKey.get(assignment.actionKey) || null
        : null;

      return {
        slot,
        action,
      };
    });
  }, [actionsByKey, preferences]);

  const availableActionsForSlot = useMemo(() => {
    if (!editingSlotCode) return [];
    const assignedKeys = new Set(
      getStoredQuickActionAssignments(preferences)
        .filter((entry) => entry.code !== editingSlotCode)
        .map((entry) => entry.actionKey)
    );
    return actions.filter((action) => !assignedKeys.has(action.key));
  }, [actions, editingSlotCode, preferences]);

  const handleAssignShortcut = useCallback(
    (actionKey: string, shortcutCode: string) => {
      if (!isAllowedQuickActionCode(shortcutCode)) return;
      if (!isAllowedQuickActionKey(actionKey, quickActionAccess)) return;

      updatePreferences((current) => {
        const currentAssignments = getStoredQuickActionAssignments(current);
        return {
          quickActionAssignments: [
            ...currentAssignments.filter(
              (entry) =>
                entry.code !== shortcutCode && entry.actionKey !== actionKey
            ),
            { code: shortcutCode, actionKey },
          ],
        };
      });

      resetTransientState();
    },
    [quickActionAccess, resetTransientState, updatePreferences]
  );

  const handleRemoveAction = useCallback(
    (slotCode: string) => {
      updatePreferences((current) => ({
        quickActionAssignments: getStoredQuickActionAssignments(current).filter(
          (entry) => entry.code !== slotCode
        ),
      }));

      resetTransientState();
    },
    [resetTransientState, updatePreferences]
  );

  const handleMoveOrSwapAction = useCallback(
    (sourceCode: string | null, targetCode: string | null) => {
      if (!sourceCode || !targetCode || sourceCode === targetCode) return;

      updatePreferences((current) => {
        const currentAssignments = getStoredQuickActionAssignments(current);
        const sourceAssignment = currentAssignments.find(
          (entry) => entry.code === sourceCode
        );
        const targetAssignment = currentAssignments.find(
          (entry) => entry.code === targetCode
        );

        if (!sourceAssignment) {
          return current;
        }

        const nextAssignments = currentAssignments.filter(
          (entry) => entry.code !== sourceCode && entry.code !== targetCode
        );

        nextAssignments.push({
          code: targetCode,
          actionKey: sourceAssignment.actionKey,
        });

        if (targetAssignment) {
          nextAssignments.push({
            code: sourceCode,
            actionKey: targetAssignment.actionKey,
          });
        }

        return {
          quickActionAssignments: nextAssignments,
        };
      });
    },
    [updatePreferences]
  );

  const handleDropOnDeleteRail = useCallback(
    (sourceCode: string | null) => {
      if (!sourceCode) return;
      handleRemoveAction(sourceCode);
    },
    [handleRemoveAction]
  );

  // Key navigation for search input
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev < filteredActionOptions.length - 1 ? prev + 1 : prev
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (event.key === "Enter") {
      if (filteredActionOptions[activeIndex]) {
        event.preventDefault();
        filteredActionOptions[activeIndex].onClick();
      }
    }
  };

  const handleStartEditing = (slotCode: string, currentActionKey: string) => {
    setEditingSlotCode(slotCode);
    setDraftActionKey(currentActionKey);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Actions Command Center"
      maxWidth="4xl"
      zIndex={80}
      panelClassName="relative"
      bodyClassName="relative"
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 min-h-[420px]">
        {/* Left Pane: Search & Run Actions (3 cols) */}
        <div className="md:col-span-3 flex flex-col space-y-4 md:border-r md:border-cf-border md:pr-6">
          <div className="flex items-center gap-3 rounded-xl border border-cf-border bg-cf-surface-muted/60 px-3.5 py-2.5 transition-all focus-within:border-cf-border-strong focus-within:bg-cf-surface focus-within:ring-2 focus-within:ring-cf-accent-soft/70">
            <Search className="h-4.5 w-4.5 text-cf-text-subtle" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search actions or type a command..."
              className="w-full border-0 bg-transparent p-0 text-sm placeholder:text-cf-text-subtle focus:ring-0 focus:outline-hidden text-cf-text"
            />
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle flex items-center gap-1.5 px-1">
            <Sparkles className="h-3 w-3" />
            <span>Available Commands</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1 max-h-[350px]">
            {filteredActionOptions.length ? (
              filteredActionOptions.map((action, index) => {
                const Icon = action.icon;
                const isActive = index === activeIndex;

                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={action.onClick}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={[
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all duration-150 group",
                      isActive
                        ? "bg-cf-accent text-cf-surface shadow-xs scale-[1.005]"
                        : "hover:bg-cf-surface-soft text-cf-text",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "flex h-8.5 w-8.5 items-center justify-center rounded-lg border transition-colors",
                          isActive
                            ? "border-cf-surface/20 bg-cf-surface/10 text-cf-surface"
                            : "border-cf-border bg-cf-surface-muted text-cf-text-subtle group-hover:border-cf-border-strong group-hover:bg-cf-surface",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div
                          className={[
                            "text-sm font-semibold",
                            isActive ? "text-cf-surface" : "text-cf-text",
                          ].join(" ")}
                        >
                          {action.label}
                        </div>
                        <div
                          className={[
                            "text-[10px] truncate max-w-[200px]",
                            isActive
                              ? "text-cf-surface/75"
                              : "text-cf-text-subtle",
                          ].join(" ")}
                        >
                          {action.keywords.split(" ").slice(0, 4).join(", ")}
                        </div>
                      </div>
                    </div>
                    {action.assignedShortcut ? (
                      <kbd
                        className={[
                          "inline-flex h-5 items-center rounded border px-1.5 font-mono text-[9px] font-bold shadow-xs",
                          isActive
                            ? "border-cf-surface/30 bg-cf-surface/20 text-cf-surface"
                            : "border-cf-border bg-cf-surface-muted text-cf-text-subtle",
                        ].join(" ")}
                      >
                        {action.assignedShortcut.label}
                      </kbd>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-cf-text-muted">
                <Sparkles className="h-8 w-8 text-cf-text-subtle/30 mb-2" />
                <p className="text-sm font-medium">
                  No actions found matching "{query}"
                </p>
                <p className="text-xs text-cf-text-subtle mt-0.5">
                  Try searching "documents" or "theme"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Shortcuts Manager (2 cols) */}
        <div className="md:col-span-2 flex flex-col space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle flex items-center gap-1.5">
              <Keyboard className="h-3 w-3" />
              <span>Keyboard Map</span>
            </div>
            <span className="text-[9px] font-bold text-cf-text-subtle bg-cf-surface-soft px-2 py-0.5 rounded-full">
              {slotCards.filter((c) => c.action).length} / {slotCards.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[390px]">
            {slotCards.map(({ slot, action }) => {
              const isEditing = editingSlotCode === slot.code;
              const isDragged = draggedSlotCode === slot.code;
              const isDropTarget =
                Boolean(draggedSlotCode) &&
                dropTargetCode === slot.code &&
                draggedSlotCode !== slot.code;

              if (isEditing) {
                return (
                  <div
                    key={slot.code}
                    className="flex flex-col gap-2 rounded-xl border border-cf-border bg-cf-surface-muted/50 p-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <kbd className="inline-flex h-5.5 min-w-[52px] items-center justify-center rounded border border-cf-border bg-cf-surface px-1.5 font-mono text-[10px] font-bold text-cf-text shadow-xs">
                        {slot.label}
                      </kbd>
                      <span className="text-xs font-bold text-cf-text">
                        Assign Shortcut
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={draftActionKey}
                        onChange={(e) => setDraftActionKey(e.target.value)}
                        className="flex-1 min-h-8 rounded-lg border border-cf-border bg-cf-surface px-2.5 py-1 text-xs font-semibold text-cf-text focus:border-cf-accent focus:ring-1 focus:ring-cf-accent"
                      >
                        <option value="" disabled>
                          Select an action...
                        </option>
                        {availableActionsForSlot.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          handleAssignShortcut(draftActionKey, slot.code)
                        }
                        disabled={!draftActionKey}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cf-accent text-cf-surface transition-colors hover:bg-cf-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Confirm assignment"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={resetTransientState}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle transition-colors hover:bg-cf-surface-soft hover:text-cf-text"
                        aria-label="Cancel assignment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={slot.code}
                  draggable={Boolean(action)}
                  onDragStart={(event: DragEvent<HTMLDivElement>) => {
                    if (!action) return;
                    suppressOpenRef.current = true;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", slot.code);
                    setDraggedSlotCode(slot.code);
                    setDropTargetCode(slot.code);
                  }}
                  onDragOver={(event: DragEvent<HTMLDivElement>) => {
                    if (!draggedSlotCode || draggedSlotCode === slot.code)
                      return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropTargetCode(slot.code);
                  }}
                  onDrop={(event: DragEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    const sourceCode =
                      event.dataTransfer.getData("text/plain") ||
                      draggedSlotCode;
                    handleMoveOrSwapAction(sourceCode, slot.code);
                    finishDragInteraction();
                  }}
                  onDragEnd={() => {
                    finishDragInteraction();
                  }}
                  className={[
                    "flex items-center justify-between rounded-xl border px-3 py-2 transition-all duration-150",
                    action
                      ? "border-cf-border bg-cf-surface hover:border-cf-border-strong cursor-grab active:cursor-grabbing"
                      : "border-dashed border-cf-border bg-cf-surface-muted/20 hover:bg-cf-surface-muted/40",
                    isDragged ? "opacity-40" : "",
                    isDropTarget ? "ring-2 ring-cf-accent ring-offset-2" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <kbd className="inline-flex h-5.5 min-w-[52px] items-center justify-center rounded border border-cf-border bg-cf-surface px-1.5 font-mono text-[10px] font-bold text-cf-text shadow-xs">
                      {slot.label}
                    </kbd>
                    <div className="truncate">
                      {action ? (
                        <span className="text-xs font-semibold text-cf-text">
                          {action.label}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-cf-text-subtle italic">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {action ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleStartEditing(slot.code, action.key)
                          }
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle transition-colors hover:bg-cf-surface-soft hover:text-cf-text"
                          title="Reassign shortcut"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(slot.code)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle transition-colors hover:bg-cf-danger-bg hover:text-cf-danger-text hover:border-cf-danger-text/25"
                          title="Remove assignment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEditing(slot.code, "")}
                        className="inline-flex h-7 px-2 items-center gap-1 rounded-lg border border-dashed border-cf-border bg-cf-surface text-[10px] font-bold text-cf-text-subtle transition-colors hover:bg-cf-surface-soft hover:text-cf-text"
                      >
                        <Plus className="h-3 w-3" />
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {draggedSlotCode ? (
            <div
              onDragOver={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetCode(DELETE_DROP_ZONE);
              }}
              onDragLeave={() => {
                setDropTargetCode((current) =>
                  current === DELETE_DROP_ZONE ? null : current
                );
              }}
              onDrop={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                const sourceCode =
                  event.dataTransfer.getData("text/plain") || draggedSlotCode;
                handleDropOnDeleteRail(sourceCode);
                finishDragInteraction();
              }}
              className={[
                "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs font-semibold transition-all duration-150",
                dropTargetCode === DELETE_DROP_ZONE
                  ? "border-cf-danger-text bg-cf-danger-bg text-cf-danger-text scale-[1.01]"
                  : "border-cf-border bg-cf-surface-muted/50 text-cf-text-muted",
              ].join(" ")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Drop here to remove shortcut
            </div>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}
