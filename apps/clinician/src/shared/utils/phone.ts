/**
 * Shared phone / fax formatting, validation, and input helpers.
 *
 * Canonical home for US 10-digit phone utilities.
 * Feature-specific wrappers (patient SSN, multi-phone entries, etc.)
 * live in their own feature utils and import primitives from here.
 */

export const PHONE_DIGIT_LIMIT = 10;
export const PHONE_INPUT_PLACEHOLDER = "(555) 000-0000";

// ── Digit extraction ────────────────────────────────────────────

export function getDigits(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

export function getCappedDigits(value: unknown, maxDigits: number): string {
  return getDigits(value).slice(0, maxDigits);
}

export function getPhoneInputDigits(value: unknown): string {
  return getCappedDigits(value, PHONE_DIGIT_LIMIT);
}

// ── Formatting ──────────────────────────────────────────────────

/** Live input formatter: adds parens/dash as the user types. */
export function formatPhoneInput(value: unknown): string {
  const digits = getPhoneInputDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `(${digits})`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Read-only display formatter: normalizes stored values (may include +1). */
export function formatPhoneDisplay(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const digits = getDigits(raw);
  const normalized =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (normalized.length !== PHONE_DIGIT_LIMIT) return raw;
  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

// ── Validation ──────────────────────────────────────────────────

export function validatePhoneNumber(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null; // empty = optional
  const digits = getDigits(raw);
  if (digits.length === 10) return null;
  return "Phone number must be 10 digits.";
}

// ── Formatted-input deletion helpers ────────────────────────────

type FormatInput = (value: string) => string;

export function getFormattedBackspaceValue(
  value: unknown,
  cursorPosition: number | null | undefined,
  formatInput: FormatInput
): string | null {
  const text = String(value || "");
  if (!cursorPosition || /\d/.test(text[cursorPosition - 1] || "")) return null;

  const digits = getDigits(text);
  const digitIndex = getDigits(text.slice(0, cursorPosition)).length - 1;
  if (digitIndex < 0) return null;

  return formatInput(
    `${digits.slice(0, digitIndex)}${digits.slice(digitIndex + 1)}`
  );
}

export function getFormattedDeleteValue(
  value: unknown,
  cursorPosition: number | null | undefined,
  formatInput: FormatInput
): string | null {
  const text = String(value || "");
  if (cursorPosition === null || cursorPosition === undefined) return null;
  if (cursorPosition >= text.length) return null;
  if (/\d/.test(text[cursorPosition] || "")) return null;

  const digits = getDigits(text);
  const nextDigitIndex = getDigits(text.slice(0, cursorPosition)).length;
  const digitIndex =
    nextDigitIndex >= digits.length ? nextDigitIndex - 1 : nextDigitIndex;
  if (digitIndex < 0 || digitIndex >= digits.length) return null;

  return formatInput(
    `${digits.slice(0, digitIndex)}${digits.slice(digitIndex + 1)}`
  );
}

export function handleFormattedInputDeletion(
  event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  formatFn: FormatInput,
  setValue: (value: string) => void
): boolean {
  if (event.key !== "Backspace" && event.key !== "Delete") return false;

  const input = event.currentTarget;
  if (input.selectionStart !== input.selectionEnd) return false;

  const nextValue =
    event.key === "Backspace"
      ? getFormattedBackspaceValue(input.value, input.selectionStart, formatFn)
      : getFormattedDeleteValue(input.value, input.selectionStart, formatFn);

  if (nextValue === null) return false;

  event.preventDefault();
  setValue(nextValue);
  return true;
}
