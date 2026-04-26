import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";

import ModalShell from "./ui/ModalShell";
import { Input } from "./ui";
import { ActionPickerOverlay, SlotCard } from "./QuickActionsPaletteParts";
import { useUserPreferences } from "../context/UserPreferencesProvider";
import { useTheme } from "../context/ThemeProvider";
import {
  buildQuickActions,
  getStoredQuickActionAssignments,
  isAllowedQuickActionCode,
  isAllowedQuickActionKey,
  QUICK_ACTION_SLOTS,
} from "../constants/quickActions";

const DELETE_DROP_ZONE = "delete-drop-zone";
const DELETE_SHELF_HEIGHT = 64;

function matchesActionQuery(action, normalizedQuery) {
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
}) {
  const [query, setQuery] = useState("");
  const [editingSlotCode, setEditingSlotCode] = useState(null);
  const [pickerSlotCode, setPickerSlotCode] = useState(null);
  const [draftActionKey, setDraftActionKey] = useState("");
  const [draggedSlotCode, setDraggedSlotCode] = useState(null);
  const [dropTargetCode, setDropTargetCode] = useState(null);
  const inputRef = useRef(null);
  const contentRef = useRef(null);
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
    (actionKey, shortcutCode) => {
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
    (slotCode) => {
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
    (sourceCode, targetCode) => {
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
    (sourceCode) => {
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
      panelClassName="relative !overflow-visible"
      bodyClassName="overflow-visible"
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

      {draggedSlotCode ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTargetCode(DELETE_DROP_ZONE);
          }}
          onDragLeave={() => {
            setDropTargetCode((current) =>
              current === DELETE_DROP_ZONE ? null : current
            );
          }}
          onDrop={(event) => {
            event.preventDefault();
            const sourceCode =
              event.dataTransfer.getData("text/plain") || draggedSlotCode;
            handleDropOnDeleteRail(sourceCode);
            finishDragInteraction();
          }}
          className={[
            "absolute top-full right-0 left-0 z-[90] flex items-center justify-center gap-3 rounded-b-2xl border-x border-b border-dashed px-4 text-sm font-semibold shadow-[var(--shadow-panel-lg)] backdrop-blur transition",
            dropTargetCode === DELETE_DROP_ZONE
              ? "border-cf-danger-text bg-cf-danger-bg text-cf-danger-text"
              : "border-cf-border bg-cf-surface/95 text-cf-text-muted",
          ].join(" ")}
          style={{ height: DELETE_SHELF_HEIGHT }}
        >
          <div
            className={[
              "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition",
              dropTargetCode === DELETE_DROP_ZONE
                ? "border-cf-danger-text/30 bg-cf-surface text-cf-danger-text"
                : "border-cf-border bg-cf-surface-soft text-cf-text-subtle",
            ].join(" ")}
          >
            <Trash2 className="h-4 w-4" />
          </div>
          Drop here to remove this shortcut
        </div>
      ) : null}

      <div
        ref={contentRef}
        className="space-y-4"
        onMouseDown={(event) => {
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
                      onDragStart={(event) => {
                        if (!action) return;
                        suppressOpenRef.current = true;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", slot.code);
                        setDraggedSlotCode(slot.code);
                        setDropTargetCode(slot.code);
                      }}
                      onDragOver={(event) => {
                        if (!draggedSlotCode || draggedSlotCode === slot.code)
                          return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropTargetCode(slot.code);
                      }}
                      onDrop={(event) => {
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
        </div>
      </div>
    </ModalShell>
  );
}
