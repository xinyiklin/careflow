import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "./cn";

type FieldProps = {
  label: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /**
   * Field wraps a single form control (Input, Textarea, Select, or any
   * element accepting `id` + `aria-describedby` + `aria-invalid`).
   */
  children: ReactNode;
  className?: string;
};

/**
 * Labelled form control wrapper. Generates a unique id and wires it onto
 * the child input, plus aria-describedby for helper / error text.
 */
export function Field({
  label,
  helperText,
  error,
  required = false,
  children,
  className,
}: FieldProps) {
  const inputId = useId();
  const helperId = useId();
  const errorId = useId();

  const describedBy = [helperText ? helperId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  // Best-effort: forward id + aria attributes onto the single child input.
  const child = Children.only(children);
  const enhanced = isValidElement(child)
    ? cloneElement(child as ReactElement<Record<string, unknown>>, {
        id: inputId,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
        required: required || undefined,
      })
    : child;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-xs font-medium text-text-muted">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {enhanced}
      {helperText && !error ? (
        <p id={helperId} className="text-xs text-text-subtle">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
