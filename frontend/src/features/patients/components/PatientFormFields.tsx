import type { ReactNode } from "react";
import type { FieldError as HookFormFieldError } from "react-hook-form";

type FieldErrorProps = {
  error?: HookFormFieldError;
};

type FormTextProps = {
  children: ReactNode;
};

type FormLabelProps = FormTextProps & {
  required?: boolean;
  compact?: boolean;
  htmlFor?: string;
};

export function FieldError({ error }: FieldErrorProps) {
  if (!error) return null;
  return <p className="mt-1 text-sm text-cf-danger-text">{error.message}</p>;
}

export function FieldHint({ children }: FormTextProps) {
  return <p className="mt-1 text-xs text-cf-text-subtle">{children}</p>;
}

export function FormLabel({
  children,
  required = false,
  compact = false,
  htmlFor,
}: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={
        compact
          ? "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle"
          : "mb-1 block text-sm font-medium text-cf-text-muted"
      }
    >
      {children}
      {required ? <span className="ml-1 text-cf-danger-text">*</span> : null}
    </label>
  );
}
