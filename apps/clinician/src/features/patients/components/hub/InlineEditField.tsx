import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Input } from "../../../../shared/components/ui";

import type { InputHTMLAttributes, KeyboardEvent } from "react";

type InlineEditValue = string | number | null | undefined;

type InlineEditOption = {
  value: InlineEditValue;
  label: string;
};

type FieldStatus = "idle" | "saving" | "error";

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
  // Kept for API compatibility with callers; the live control renders the
  // editable value directly, so these read-display props are largely unused.
  displayValue?: string;
  displayTitle?: string;
  formatDisplay?: (value: InlineEditValue) => string;
  onSave?: (value: InlineEditValue) => Promise<void> | void;
  validate?: (value: InlineEditValue) => string | null | undefined;
  disabled?: boolean;
  emptyHint?: string;
  compact?: boolean;
};

// Shared box styling for an always-editable field (eCW-style data entry):
// hairline border, white surface, accent focus ring. Overrides the shared
// Input's heavier default so every field reads as a fillable box.
export const FIELD_BOX_CLASS =
  "!rounded-lg !border-cf-border !bg-cf-surface !shadow-none focus:!border-cf-accent";

/**
 * Always-editable registration field used across the patient hub.
 *
 * Every field renders a live input/select/textarea — there is no click-to-edit
 * reveal. Typing updates a local draft; blurring (or Enter, or picking a select
 * option) saves via `onSave`, which is expected to resolve once the patch
 * lands. The draft re-syncs from `value` whenever the source changes while the
 * field is not focused. Validation/save errors surface inline beneath the box.
 */
export default function InlineEditField({
  label,
  value,
  type = "text",
  options = [],
  placeholder = "",
  inputMode,
  maxLength,
  sanitizeInput,
  onFormattedKeyDown,
  className = "",
  multiline = false,
  rows = 3,
  displayValue,
  onSave,
  validate,
  disabled = false,
  compact = false,
}: InlineEditFieldProps) {
  const coerce = (next: InlineEditValue) =>
    sanitizeInput ? sanitizeInput(String(next ?? "")) : String(next ?? "");

  const [draft, setDraft] = useState(() => coerce(value));
  const [status, setStatus] = useState<FieldStatus>("idle");
  const [error, setError] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const focusedRef = useRef(false);
  const selectButtonRef = useRef<HTMLButtonElement | null>(null);

  // Re-sync the draft from the source value when it changes externally (e.g.
  // a save elsewhere refreshes the record) — but never while this field is
  // focused, so we don't clobber in-progress typing.
  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(
      sanitizeInput ? sanitizeInput(String(value ?? "")) : String(value ?? "")
    );
  }, [value, sanitizeInput]);

  useEffect(() => {
    if (disabled) setIsSelectOpen(false);
  }, [disabled]);

  const updateDraft = (next: InlineEditValue) => {
    setDraft(coerce(next));
    if (status === "error") {
      setStatus("idle");
      setError("");
    }
  };

  const commit = async (candidate: InlineEditValue = draft) => {
    if (status === "saving" || disabled) return;
    if (coerce(candidate) === coerce(value)) {
      setStatus("idle");
      setError("");
      return;
    }
    if (validate) {
      const validationError = validate(candidate);
      if (validationError) {
        setStatus("error");
        setError(validationError);
        return;
      }
    }
    try {
      setStatus("saving");
      setError("");
      await onSave?.(candidate);
      setStatus("idle");
    } catch (saveError) {
      setStatus("error");
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save."
      );
    }
  };

  const handleFocus = () => {
    focusedRef.current = true;
  };

  const handleBlur = () => {
    focusedRef.current = false;
    void commit();
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
      setDraft(coerce(value));
      setStatus("idle");
      setError("");
      event.currentTarget.blur();
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
      void commit();
    }
  };

  const selectedOption = options.find(
    (option) => String(option.value) === String(draft ?? "")
  );
  const selectedLabel = selectedOption?.label || displayValue || placeholder;
  const hasSelectValue = Boolean(selectedOption?.value);
  const heightClass = compact ? "h-8" : "h-9";
  const errorBorderClass = status === "error" ? "!border-cf-danger-text" : "";

  return (
    <div className={["min-w-0", className].join(" ")}>
      {label ? (
        <div
          className={[
            "mb-0.5 font-semibold uppercase tracking-[0.14em] text-cf-text-subtle",
            compact ? "text-[9px]" : "text-[10px]",
          ].join(" ")}
        >
          {label}
        </div>
      ) : null}

      {type === "select" ? (
        <div className="relative">
          <button
            ref={selectButtonRef}
            type="button"
            disabled={disabled || status === "saving"}
            onClick={() => setIsSelectOpen((current) => !current)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={() => {
              focusedRef.current = false;
              setIsSelectOpen(false);
              void commit();
            }}
            aria-haspopup="listbox"
            aria-expanded={isSelectOpen}
            aria-label={label || undefined}
            aria-invalid={status === "error" || undefined}
            className={[
              "flex w-full items-center gap-2 rounded-lg border border-cf-border bg-cf-surface px-2.5 text-left text-sm text-cf-text outline-none transition",
              heightClass,
              "focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
              status === "error" ? "border-cf-danger-text" : "",
            ].join(" ")}
          >
            <span
              className={[
                "min-w-0 flex-1 truncate leading-5",
                hasSelectValue ? "text-cf-text" : "text-cf-text-subtle",
              ].join(" ")}
            >
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
                const isSelected = String(option.value) === String(draft ?? "");
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
                      void commit(option.value);
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
          value={draft}
          rows={rows}
          disabled={disabled || status === "saving"}
          onChange={(event) => updateDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-label={label || undefined}
          aria-invalid={status === "error" || undefined}
          className={[FIELD_BOX_CLASS, errorBorderClass].join(" ")}
        />
      ) : (
        <Input
          type={type}
          inputMode={inputMode}
          value={draft}
          disabled={disabled || status === "saving"}
          onChange={(event) => updateDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-label={label || undefined}
          aria-invalid={status === "error" || undefined}
          className={[
            heightClass,
            "!py-0",
            FIELD_BOX_CLASS,
            errorBorderClass,
          ].join(" ")}
        />
      )}

      {status === "error" && error ? (
        <p
          className={[
            "truncate text-xs text-cf-danger-text",
            compact ? "mt-0.5" : "mt-1",
          ].join(" ")}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
