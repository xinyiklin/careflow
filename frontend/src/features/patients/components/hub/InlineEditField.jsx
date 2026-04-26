import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Pencil, X } from "lucide-react";

import { Input } from "../../../../shared/components/ui";

/**
 * Single-field inline editor used by the patient hub registration sections.
 *
 * Default mode shows a value with a hover-revealed pencil. Click (or focus)
 * flips the cell into an editable input. Enter or blur-with-changes saves;
 * Escape cancels. The component remains controlled by its parent — `onSave`
 * receives the next value and is expected to return a promise that resolves
 * once the patch lands. Errors are surfaced inline.
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
  formatDisplay,
  onSave,
  validate,
  disabled = false,
  emptyHint = "",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [submitState, setSubmitState] = useState({ status: "idle", error: "" });
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const inputRef = useRef(null);
  const syncedDraft = sanitizeInput
    ? sanitizeInput(value ?? "")
    : (value ?? "");
  const coerceDraft = (nextValue) =>
    sanitizeInput ? sanitizeInput(nextValue) : nextValue;

  useEffect(() => {
    if (!isEditing) setDraft(syncedDraft);
  }, [syncedDraft, isEditing]);

  useEffect(() => {
    if (!isEditing) setIsSelectOpen(false);
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    if (typeof node.select === "function") node.select();
  }, [isEditing]);

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

  const updateDraft = (nextValue) => {
    setDraft(coerceDraft(nextValue));
  };

  const commit = async (candidateValue = draft) => {
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
        error: error?.message || "Failed to save.",
      });
    }
  };

  const handleKeyDown = (event) => {
    if (onFormattedKeyDown?.(event, updateDraft)) return;

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

  // Both display and edit states share the same wrapper height so clicking
  // into a field never resizes the surrounding grid row. The label sits on
  // its own row, the value/input row is locked to h-9, and the helper-text
  // slot below is height-reserved (renders empty when not in edit/error).
  if (!isEditing) {
    return (
      <div className={["min-w-0", className].join(" ")}>
        {label ? (
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
            {label}
          </div>
        ) : null}
        <button
          type="button"
          onClick={beginEdit}
          disabled={disabled}
          className={[
            "group mt-0.5 -mx-2 flex h-9 w-[calc(100%+1rem)] items-center gap-1.5 rounded-lg px-2 text-left text-sm transition",
            "hover:bg-cf-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-text",
          ].join(" ")}
        >
          <span
            className={[
              "min-w-0 flex-1 truncate font-medium",
              renderedDisplay ? "text-cf-text" : "text-cf-text-subtle",
            ].join(" ")}
          >
            {renderedDisplay || emptyHint || placeholder}
          </span>
          {!disabled ? (
            <Pencil className="h-3 w-3 shrink-0 text-cf-text-subtle opacity-0 transition group-hover:opacity-100" />
          ) : null}
        </button>
        {/* Reserved error/help slot keeps both states the same total height. */}
        <p className="mt-1 h-4" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={["min-w-0", className].join(" ")}>
      {label ? (
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
          {label}
        </div>
      ) : null}

      <div className="mt-0.5 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          {type === "select" ? (
            <div className="relative">
              <button
                ref={inputRef}
                type="button"
                disabled={submitState.status === "saving"}
                onClick={() => setIsSelectOpen((current) => !current)}
                onKeyDown={handleKeyDown}
                className={[
                  "flex h-9 w-full items-center gap-2 rounded-xl border border-cf-border-strong bg-cf-surface px-3 text-left text-sm text-cf-text shadow-sm outline-none transition",
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
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          updateDraft(option.value);
                          setIsSelectOpen(false);
                          inputRef.current?.focus();
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
              onBlur={commit}
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
              onBlur={commit}
              placeholder={placeholder}
              maxLength={maxLength}
              className="h-9 py-0"
            />
          )}
        </div>

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={commit}
          disabled={submitState.status === "saving"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-muted shadow-sm transition hover:bg-cf-surface-soft hover:text-cf-text"
          aria-label="Save"
        >
          {submitState.status === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={cancelEdit}
          disabled={submitState.status === "saving"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle shadow-sm transition hover:bg-cf-surface-soft hover:text-cf-text-muted"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Reserved height matches the display state so the grid row never
          jumps when entering edit. Errors render in the same slot. */}
      <p className="mt-1 h-4 truncate text-xs text-cf-danger-text">
        {submitState.status === "error" && submitState.error
          ? submitState.error
          : ""}
      </p>
    </div>
  );
}
