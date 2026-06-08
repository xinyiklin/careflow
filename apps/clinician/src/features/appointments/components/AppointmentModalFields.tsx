import { useId } from "react";

import type { ComponentType, ReactNode } from "react";

import type { EntityId } from "../../../shared/api/types";
import type { AppointmentPickerOption } from "../types";

type FieldLabelProps = {
  children: ReactNode;
  required?: boolean;
  /** Associates the label with its control via `htmlFor`/`id`. */
  htmlFor?: string;
};

type FormSectionProps = {
  icon?: ComponentType<{ className?: string }> | null;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

type ChipPickerProps<TOption extends AppointmentPickerOption> = {
  label: string;
  options: TOption[];
  value?: EntityId | null;
  onChange: (optionId: EntityId) => void;
  required?: boolean;
  error?: string;
  getMeta?: ((option: TOption) => ReactNode) | null;
  singleRow?: boolean;
};

export function FieldLabel({
  children,
  required = false,
  htmlFor,
}: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle"
    >
      {children}
      {required ? <span className="ml-1 text-cf-danger-text">*</span> : null}
    </label>
  );
}

type LabeledFieldProps = {
  label: ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
  /** Receives a stable id to pass to the control so the label's `htmlFor`
   * forms a real programmatic association. */
  children: (fieldId: string) => ReactNode;
};

export function LabeledField({
  label,
  required = false,
  error = "",
  className,
  children,
}: LabeledFieldProps) {
  const fieldId = useId();
  return (
    <div className={className}>
      <FieldLabel required={required} htmlFor={fieldId}>
        {label}
      </FieldLabel>
      {children(fieldId)}
      {error ? (
        <p className="mt-1 text-sm text-cf-danger-text">{error}</p>
      ) : null}
    </div>
  );
}

export function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="border-t border-cf-border px-5 py-4 first:border-t-0">
      <div className="flex items-start gap-2">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 text-cf-text-subtle" /> : null}
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-cf-text">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-cf-text-muted">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ChipPicker<TOption extends AppointmentPickerOption>({
  label,
  options,
  value,
  onChange,
  required = false,
  error = "",
  getMeta = null,
  singleRow = false,
}: ChipPickerProps<TOption>) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className={[
          "flex gap-2",
          singleRow
            ? // Keep horizontal scrolling but hide the visible scrollbar:
              // ``[scrollbar-width:none]`` covers Firefox + the modern
              // CSS standard, ``[&::-webkit-scrollbar]:hidden`` covers
              // Chrome/Safari/Edge.
              "overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex-wrap",
        ].join(" ")}
      >
        {options.map((option) => {
          const isActive = String(option.id) === String(value);
          const color = option.color || "var(--color-cf-accent)";
          const meta = getMeta?.(option);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition",
                singleRow ? "shrink-0" : "",
                isActive
                  ? "border-cf-accent bg-cf-accent font-semibold text-cf-page-bg shadow-[var(--shadow-panel)]"
                  : "border-cf-border bg-cf-surface font-medium text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
              ].join(" ")}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              {option.name}
              {meta ? <span>· {meta}</span> : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-1 text-sm text-cf-danger-text">{error}</p>
      ) : null}
    </div>
  );
}
