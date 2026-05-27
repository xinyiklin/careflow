import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import {
  formatPhoneInput,
  handleFormattedInputDeletion,
  PHONE_INPUT_PLACEHOLDER,
} from "../utils/phone";

/** Matches the base Input component styling so PhoneInput looks identical. */
const INPUT_BASE_CLASS = [
  "w-full rounded-xl border border-cf-border-strong bg-cf-surface",
  "px-3 py-2.5 text-sm text-cf-text shadow-sm outline-none transition",
  "focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

type PhoneInputProps = {
  /** Current raw or formatted value. */
  value: string;
  /** Called with the formatted display value. */
  onChange: (value: string) => void;
  /** Field name passed through to the <input>. */
  name?: string;
  /** Placeholder override (defaults to "(555) 000-0000"). */
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

/**
 * Controlled phone/fax input with live US (xxx) xxx-xxxx formatting.
 *
 * Strips to 10 digits on type, formats with parens/dash as the user
 * types, and handles backspace/delete across formatting characters.
 *
 * Use `getPhoneInputDigits(value)` to extract raw digits before submit.
 */
export default function PhoneInput({
  value,
  onChange,
  name,
  placeholder = PHONE_INPUT_PLACEHOLDER,
  disabled,
  required,
  className,
}: PhoneInputProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(formatPhoneInput(e.target.value));
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      handleFormattedInputDeletion(e, formatPhoneInput, onChange);
    },
    [onChange]
  );

  return (
    <input
      type="tel"
      name={name}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={
        className ? `${INPUT_BASE_CLASS} ${className}` : INPUT_BASE_CLASS
      }
    />
  );
}

/** Re-export for convenience when the caller also needs to strip digits. */
export {
  getPhoneInputDigits,
  formatPhoneInput,
  formatPhoneDisplay,
} from "../utils/phone";
