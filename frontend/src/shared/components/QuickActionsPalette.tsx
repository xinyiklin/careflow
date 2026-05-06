import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";

import ModalShell from "./ui/ModalShell";
import { Input } from "./ui";
import { ActionPickerOverlay, SlotCard } from "./QuickActionsPaletteParts";
import { useUserPreferences } from "../context/UserPreferencesProvider";
import { useTheme } from "../context/ThemeProvider";
import {
  buildQuickActions,
  type BuiltQuickAction,
  getStoredQuickActionAssignments,
  isAllowedQuickActionCode,
  isAllowedQuickActionKey,
  QUICK_ACTION_SLOTS,
} from "../constants/quickActions";

import type { DragEvent, MouseEvent } from "react";
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
  onToggleDemoBadge?: () => void;
  onToggleSidebar?: () => void;
  onToggleTheme?: () => void;
  showDemoActions?: boolean;
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
  onToggleDemoBadge,
  onToggleSidebar,
  onToggleTheme,
  showDemoActions,
}: QuickActionsPaletteProps) {
  const [query, setQuery] = useState("");
  const [editingSlotCode, setEditingSlotCode] = useState<string | null>(null);
  const [pickerSlotCode, setPickerSlotCode] = useState<string | null>(null);
  const [draftActionKey, setDraftActionKey] = useState("");
  const [draggedSlotCode, setDraggedSlotCode] = useState<string | null>(null);
  const [dropTargetCode, setDropTargetCode] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const suppressOpenRef = useRef(false);
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
    setPickerSlotCode(null);
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
    if (!isOpen) {
      setQuery("");
      resetTransientState();
      setDraggedSlotCode(null);
      setDropTargetCode(null);
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen, resetTransientState]);

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
        onToggleDemoBadge,
        onToggleSidebar,
        onToggleTheme: handleToggleTheme,
        preferences,
        showDemoActions,
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
      onToggleDemoBadge,
      onToggleSidebar,
      handleToggleTheme,
      preferences,
      showDemoActions,
    ]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const actionsByKey = useMemo(
    () => new Map(actions.map((action) => [action.key, action])),
    [actions]
  );

  const filteredActionOptions = useMemo(
    () =>
      actions.filter((action) => matchesActionQuery(action, normalizedQuery)),
    [actions, normalizedQuery]
  );

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

  const pickerSlot = useMemo(
    () =>
      QUICK_ACTION_SLOTS.find((slot) => slot.code === pickerSlotCode) || null,
    [pickerSlotCode]
  );

  const availablePickerActions = useMemo(() => {
    const assignedActionKeys = new Set(
      getStoredQuickActionAssignments(preferences).map(
        (entry) => entry.actionKey
      )
    );

    return filteredActionOptions.filter(
      (action) => !assignedActionKeys.has(action.key)
    );
  }, [filteredActionOptions, preferences]);

  useEffect(() => {
    if (!editingSlotCode) return;

    const activeCard = slotCards.find(
      (card) => card.slot.code === editingSlotCode
    );
    if (!activeCard) {
      resetTransientState();
      return;
    }

    setDraftActionKey((current) => {
      if (current && actionsByKey.has(current)) {
        return current;
      }

      if (activeCard.action?.key) {
        return activeCard.action.key;
      }

      return filteredActionOptions[0]?.key || "";
    });
  }, [
    actionsByKey,
    editingSlotCode,
    filteredActionOptions,
    resetTransientState,
    slotCards,
  ]);

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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Actions"
      maxWidth="3xl"
      zIndex={80}
      panelClassName="relative"
      bodyClassName="relative"
    >
      {pickerSlot ? (
        <ActionPickerOverlay
          slot={pickerSlot}
          availableActions={availablePickerActions}
          onAssignAction={(actionKey) =>
            handleAssignShortcut(actionKey, pickerSlot.code)
          }
          onClose={resetTransientState}
        />
      ) : null}

      <div
        ref={contentRef}
        className="space-y-4"
        onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
          if (!(event.target instanceof HTMLElement)) return;
          if (event.target.closest("button, input, select, textarea, a"))
            return;
          if (!editingSlotCode && !pickerSlotCode) return;
          resetTransientState();
        }}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-cf-border bg-cf-surface-soft px-4 py-3">
          <Sparkles className="h-4.5 w-4.5 text-cf-text-subtle" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions"
            className="border-0 bg-transparent px-0 py-0 shadow-none focus:border-0 focus:ring-0"
          />
        </div>

        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            Actions
          </div>

          <div className="relative">
            <div className="relative">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {slotCards.map(({ slot, action }) => {
                  const selectedAction =
                    filteredActionOptions.find(
                      (option) => option.key === draftActionKey
                    ) ||
                    actionsByKey.get(draftActionKey) ||
                    null;
                  const availableActions = selectedAction
                    ? [
                        selectedAction,
                        ...filteredActionOptions.filter(
                          (option) => option.key !== selectedAction.key
                        ),
                      ]
                    : filteredActionOptions;

                  return (
                    <SlotCard
                      key={slot.code}
                      slot={slot}
                      action={action}
                      isEditing={editingSlotCode === slot.code}
                      isDragged={draggedSlotCode === slot.code}
                      isDropTarget={
                        Boolean(draggedSlotCode) &&
                        dropTargetCode === slot.code &&
                        draggedSlotCode !== slot.code
                      }
                      draftActionKey={draftActionKey}
                      availableActions={availableActions}
                      onOpenAction={() => {
                        if (suppressOpenRef.current) return;
                        action?.onClick?.();
                      }}
                      onOpenPicker={() => {
                        setEditingSlotCode(null);
                        setPickerSlotCode(slot.code);
                      }}
                      onCancelEditing={resetTransientState}
                      onSelectAction={setDraftActionKey}
                      onConfirmAction={() => {
                        if (!draftActionKey) return;
                        handleAssignShortcut(draftActionKey, slot.code);
                      }}
                      onRemoveAction={() => handleRemoveAction(slot.code)}
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
                    />
                  );
                })}
              </div>
            </div>
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
                "flex min-h-14 items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm font-semibold transition",
                dropTargetCode === DELETE_DROP_ZONE
                  ? "border-cf-danger-text bg-cf-danger-bg text-cf-danger-text"
                  : "border-cf-border bg-cf-surface-soft text-cf-text-muted",
              ].join(" ")}
            >
              <div
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition",
                  dropTargetCode === DELETE_DROP_ZONE
                    ? "border-cf-danger-text/30 bg-cf-surface text-cf-danger-text"
                    : "border-cf-border bg-cf-surface text-cf-text-subtle",
                ].join(" ")}
              >
                <Trash2 className="h-4 w-4" />
              </div>
              Drop here to remove this shortcut
            </div>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}
