import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, X } from "lucide-react";

import { Input } from "../../../../shared/components/ui";

import type { InputHTMLAttributes, KeyboardEvent } from "react";

export type InlineEditValue = string | number | null | undefined;

type InlineEditOption = {
  value: InlineEditValue;
  label: string;
};

type SubmitState = {
  status: "idle" | "saving" | "error";
  error: string;
};

type InlineEditFieldProps = {
  label?: string;
  value?: InlineEditValue;
  type?: "text" | "email" | "password" | "number" | "date" | "select";
  options?: InlineEditOption[];
  placeholder?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  sanitizeInput?: (value: string) => string;
  onFormattedKeyDown?: (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    updateDraft: (value: string) => void
  ) => boolean;
  className?: string;
  multiline?: boolean;
  rows?: number;
  displayValue?: string;
  displayTitle?: string;
  formatDisplay?: (value: InlineEditValue) => string;
  onSave?: (value: InlineEditValue) => Promise<void> | void;
  validate?: (value: InlineEditValue) => string | null | undefined;
  disabled?: boolean;
  emptyHint?: string;
  compact?: boolean;
};

/**
 * Single-field inline editor used by the patient hub registration sections.
 *
 * Default mode keeps the displayed value selectable for copying. Double-click,
 * Enter/F2, or the pencil button flips the cell into an editable input. Enter
 * or blur-with-changes saves; Escape cancels. The component remains controlled
 * by its parent — `onSave` receives the next value and is expected to return a
 * promise that resolves once the patch lands. Errors are surfaced inline.
 */
export default function InlineEditField({
  label,
  value,
  type = "text",
  options = [],
  placeholder = "Add",
  inputMode,
  maxLength,
  sanitizeInput,
  onFormattedKeyDown,
  className = "",
  multiline = false,
  rows = 3,
  displayValue,
  displayTitle,
  formatDisplay,
  onSave,
  validate,
  disabled = false,
  emptyHint = "",
  compact = false,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    error: "",
  });
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const selectButtonRef = useRef<HTMLButtonElement | null>(null);
  const syncedDraft = sanitizeInput
    ? sanitizeInput(String(value ?? ""))
    : String(value ?? "");
  const coerceDraft = (nextValue: InlineEditValue) =>
    sanitizeInput
      ? sanitizeInput(String(nextValue ?? ""))
      : String(nextValue ?? "");

  useEffect(() => {
    if (!isEditing) setDraft(syncedDraft);
  }, [syncedDraft, isEditing]);

  useEffect(() => {
    if (!isEditing) setIsSelectOpen(false);
  }, [isEditing, type]);

  useEffect(() => {
    if (!isEditing) return;
    const node = type === "select" ? selectButtonRef.current : inputRef.current;
    if (!node) return;
    node.focus();
    if ("select" in node && typeof node.select === "function") node.select();
  }, [isEditing, type]);

  const beginEdit = () => {
    if (disabled) return;
    setSubmitState({ status: "idle", error: "" });
    setDraft(coerceDraft(value ?? ""));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(coerceDraft(value ?? ""));
    setIsSelectOpen(false);
    setSubmitState({ status: "idle", error: "" });
    setIsEditing(false);
  };

  const updateDraft = (nextValue: InlineEditValue) => {
    setDraft(coerceDraft(nextValue));
  };

  const commit = async (candidateValue: InlineEditValue = draft) => {
    if (submitState.status === "saving") return;

    const nextValue = candidateValue;
    if (
      String(coerceDraft(nextValue) ?? "") === String(coerceDraft(value) ?? "")
    ) {
      setIsEditing(false);
      return;
    }

    if (validate) {
      const error = validate(nextValue);
      if (error) {
        setSubmitState({ status: "error", error });
        return;
      }
    }

    try {
      setSubmitState({ status: "saving", error: "" });
      await onSave?.(nextValue);
      setSubmitState({ status: "idle", error: "" });
      setIsSelectOpen(false);
      setIsEditing(false);
    } catch (error) {
      setSubmitState({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to save.",
      });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (
      onFormattedKeyDown?.(
        event as KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
        updateDraft
      )
    ) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (isSelectOpen) {
        setIsSelectOpen(false);
        return;
      }
      cancelEdit();
      return;
    }
    if (
      type === "select" &&
      !isSelectOpen &&
      ["ArrowDown", "Enter", " "].includes(event.key)
    ) {
      event.preventDefault();
      setIsSelectOpen(true);
      return;
    }
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  };

  const renderedDisplay = (() => {
    if (typeof displayValue === "string") return displayValue;
    if (typeof formatDisplay === "function") return formatDisplay(value);
    if (type === "select" && options.length) {
      const match = options.find(
        (option) => String(option.value) === String(value ?? "")
      );
      if (match) return match.label;
    }
    if (value === undefined || value === null || value === "") return "";
    return String(value);
  })();

  const selectedOption = options.find(
    (option) => String(option.value) === String(draft ?? "")
  );
  const selectedLabel = selectedOption?.label || placeholder;
  const displayText = renderedDisplay || emptyHint || placeholder;
  const displayTooltip = displayTitle || renderedDisplay || "";
  const handleDisplayKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter" && event.key !== "F2") return;
    event.preventDefault();
    beginEdit();
  };

  // Both display and edit states share the same wrapper height so clicking
  // into a field never resizes the surrounding grid row. The label sits on
  // its own row, the value/input row is locked to h-9, and the helper-text
  // slot below is height-reserved (renders empty when not in edit/error).
  if (!isEditing) {
    return (
      <div className={["min-w-0", className].join(" ")}>
        {label ? (
          <div
            className={[
              "font-semibold uppercase tracking-[0.14em] text-cf-text-subtle",
              compact ? "text-[9px]" : "text-[10px]",
            ].join(" ")}
          >
            {label}
          </div>
        ) : null}
        <div
          className={[
            "group -mx-2 flex w-[calc(100%+1rem)] items-center gap-1.5 rounded-lg px-2 text-left text-sm transition",
            compact ? "mt-0 h-8" : "mt-0.5 h-9",
            "hover:bg-cf-surface-soft focus-within:outline-none focus-within:ring-2 focus-within:ring-cf-accent/25",
            disabled ? "opacity-60" : "",
          ].join(" ")}
        >
          <span
            role="button"
            tabIndex={disabled ? -1 : 0}
            onDoubleClick={beginEdit}
            onKeyDown={handleDisplayKeyDown}
            aria-label={label ? `${label}: ${displayText}` : displayText}
            title={displayTooltip || undefined}
            className={[
              "min-w-0 flex-1 truncate font-medium select-text focus:outline-none",
              renderedDisplay ? "text-cf-text" : "text-cf-text-subtle",
              disabled ? "cursor-not-allowed" : "cursor-text",
            ].join(" ")}
          >
            {displayText}
          </span>
          {!disabled ? (
            <button
              type="button"
              onClick={beginEdit}
              className={[
                "grid shrink-0 place-items-center rounded-md text-cf-text-subtle opacity-0 transition hover:bg-cf-surface-muted hover:text-cf-text group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25",
                compact ? "h-6 w-6" : "h-7 w-7",
              ].join(" ")}
              aria-label={label ? `Edit ${label}` : "Edit field"}
            >
              <Pencil className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        {/* Reserved error/help slot keeps both states the same total height. */}
        <p className={compact ? "mt-0.5 h-3" : "mt-1 h-4"} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={["min-w-0", className].join(" ")}>
      {label ? (
        <div
          className={[
            "font-semibold uppercase tracking-[0.14em] text-cf-text-subtle",
            compact ? "text-[9px]" : "text-[10px]",
          ].join(" ")}
        >
          {label}
        </div>
      ) : null}

      <div
        className={["flex items-start gap-1", compact ? "mt-0" : "mt-0.5"].join(
          " "
        )}
      >
        <div className="min-w-0 flex-1">
          {type === "select" ? (
            <div className="relative">
              <button
                ref={selectButtonRef}
                type="button"
                disabled={submitState.status === "saving"}
                onClick={() => setIsSelectOpen((current) => !current)}
                onKeyDown={handleKeyDown}
                className={[
                  "flex w-full items-center gap-2 rounded-xl border border-cf-border-strong bg-cf-surface px-3 text-left text-sm text-cf-text shadow-sm outline-none transition",
                  compact ? "h-8" : "h-9",
                  "focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
                aria-haspopup="listbox"
                aria-expanded={isSelectOpen}
              >
                <span className="min-w-0 flex-1 truncate leading-5">
                  {selectedLabel}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
              </button>
              {isSelectOpen ? (
                <div
                  className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-cf-border bg-cf-surface p-1 shadow-[var(--shadow-panel-lg)]"
                  role="listbox"
                >
                  {options.map((option) => {
                    const isSelected =
                      String(option.value) === String(draft ?? "");
                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          updateDraft(option.value);
                          setIsSelectOpen(false);
                          selectButtonRef.current?.focus();
                        }}
                        className={[
                          "flex min-h-8 w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm leading-5 transition",
                          isSelected
                            ? "bg-cf-accent-soft font-semibold text-cf-text"
                            : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
                        ].join(" ")}
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : multiline ? (
            <Input
              as="textarea"
              ref={inputRef}
              value={draft}
              rows={rows}
              disabled={submitState.status === "saving"}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => commit()}
              placeholder={placeholder}
              maxLength={maxLength}
            />
          ) : (
            <Input
              ref={inputRef}
              type={type}
              inputMode={inputMode}
              value={draft}
              disabled={submitState.status === "saving"}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => commit()}
              placeholder={placeholder}
              maxLength={maxLength}
              className={[compact ? "h-8" : "h-9", "py-0"].join(" ")}
            />
          )}
        </div>

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => commit()}
          disabled={submitState.status === "saving"}
          className={[
            "grid shrink-0 place-items-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-muted shadow-sm transition hover:bg-cf-surface-soft hover:text-cf-text",
            compact ? "h-8 w-8" : "h-9 w-9",
          ].join(" ")}
          aria-label="Save"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={cancelEdit}
          disabled={submitState.status === "saving"}
          className={[
            "grid shrink-0 place-items-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle shadow-sm transition hover:bg-cf-surface-soft hover:text-cf-text-muted",
            compact ? "h-8 w-8" : "h-9 w-9",
          ].join(" ")}
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Reserved height matches the display state so the grid row never
          jumps when entering edit. Errors render in the same slot. */}
      <p
        className={[
          "truncate text-xs text-cf-danger-text",
          compact ? "mt-0.5 h-3" : "mt-1 h-4",
        ].join(" ")}
      >
        {submitState.status === "error" && submitState.error
          ? submitState.error
          : ""}
      </p>
    </div>
  );
}
