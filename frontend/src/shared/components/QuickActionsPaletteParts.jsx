import { Check, Trash2, X } from "lucide-react";

import { Badge, Input } from "./ui";

export function ActionPickerOverlay({
  slot,
  availableActions,
  onAssignAction,
  onClose,
}) {
  return (
    <div className="absolute inset-0 z-30 rounded-2xl bg-cf-surface/85 backdrop-blur-sm">
      <div className="flex h-full flex-col rounded-2xl border border-cf-border bg-cf-surface shadow-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-cf-border px-6 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-cf-text">Add Action</div>
            <div className="mt-2">
              <Badge variant="outline">{slot.label}</Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle transition hover:text-cf-text"
            aria-label="Close action picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {availableActions.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {availableActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => onAssignAction(action.key)}
                    className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-cf-border bg-cf-surface-soft px-4 py-3 text-left transition hover:bg-cf-surface"
                  >
                    <div className="rounded-xl border border-cf-border bg-cf-surface p-2 text-cf-text-subtle">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-cf-text">
                        {action.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-cf-border bg-cf-surface-soft px-4 py-6 text-sm text-cf-text-muted">
              No matching actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SlotCard({
  slot,
  action,
  isEditing,
  isDragged,
  isDropTarget,
  draftActionKey,
  availableActions,
  onOpenAction,
  onOpenPicker,
  onCancelEditing,
  onSelectAction,
  onConfirmAction,
  onRemoveAction,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const Icon = action?.icon || null;
  const canConfirm =
    Boolean(draftActionKey) &&
    availableActions.some((option) => option.key === draftActionKey);

  return (
    <div
      draggable={Boolean(action) && !isEditing}
      onDragStart={action ? onDragStart : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={action ? onDragEnd : undefined}
      className={[
        "h-full rounded-2xl transition",
        action
          ? "border border-cf-border bg-cf-surface hover:border-cf-border-strong hover:bg-cf-surface-muted/70"
          : "border border-dashed border-cf-border bg-cf-surface-soft/40 hover:bg-cf-surface-soft/65",
        action && !isEditing ? "cursor-grab active:cursor-grabbing" : "",
        isDragged ? "opacity-60" : "",
        isDropTarget
          ? "ring-2 ring-cf-border-strong ring-offset-2 ring-offset-cf-surface-soft"
          : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => {
          if (action && !isEditing) {
            onOpenAction?.();
            return;
          }

          if (!action) {
            onOpenPicker?.();
          }
        }}
        className={[
          "flex h-full min-h-[96px] w-full px-4 py-3",
          action
            ? "items-center gap-3 text-left"
            : "items-center justify-center text-center",
        ].join(" ")}
      >
        {Icon ? (
          <div className="rounded-xl border border-cf-border bg-cf-surface-soft p-2 text-cf-text-subtle">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <div
          className={
            action ? "min-w-0 flex-1" : "flex items-center justify-center"
          }
        >
          {action ? (
            <div className="text-sm font-semibold text-cf-text">
              {action.label}
            </div>
          ) : null}
          <div className={action ? "mt-2" : ""}>
            <Badge variant="outline">{slot.label}</Badge>
          </div>
        </div>
      </button>

      {isEditing ? (
        <div className="border-t border-cf-border bg-cf-surface px-4 py-3">
          {availableActions.length ? (
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_44px_44px] md:items-center">
              <Input
                as="select"
                value={draftActionKey}
                onChange={(event) => onSelectAction?.(event.target.value)}
              >
                {availableActions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Input>

              <button
                type="button"
                onClick={onConfirmAction}
                disabled={!canConfirm}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle transition hover:text-cf-text disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Save ${slot.label}`}
              >
                <Check className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onRemoveAction}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle transition hover:text-cf-danger-text"
                aria-label={`Remove ${action?.label || slot.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-cf-text-muted">
                No matching actions.
              </div>
              <button
                type="button"
                onClick={onCancelEditing}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle transition hover:text-cf-text"
                aria-label={`Close ${slot.label}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
