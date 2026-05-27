import type { ComponentType, ReactNode } from "react";

import type { EntityId } from "../../../shared/api/types";
import type { AppointmentPickerOption } from "../types";

type ReadOnlyValueFieldProps = {
  value?: ReactNode;
};

type FieldLabelProps = {
  children: ReactNode;
  required?: boolean;
};

type FormSectionProps = {
  icon?: ComponentType<{ className?: string }> | null;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

type SummaryItemProps = {
  label: string;
  value?: ReactNode;
  swatchColor?: string | null;
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

type PatientMetaItemProps = {
  label: string;
  value?: ReactNode;
  className?: string;
  multiline?: boolean;
};

export function ReadOnlyValueField({ value }: ReadOnlyValueFieldProps) {
  return (
    <div className="min-h-10 rounded-xl border border-cf-border bg-cf-surface-muted/60 px-3 py-2.5 text-sm font-medium text-cf-text">
      {value || "—"}
    </div>
  );
}

export function FieldLabel({ children, required = false }: FieldLabelProps) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
      {children}
      {required ? <span className="ml-1 text-cf-danger-text">*</span> : null}
    </label>
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

export function SummaryItem({
  label,
  value,
  swatchColor = null,
}: SummaryItemProps) {
  return (
    <div className="border-t border-cf-border/80 py-2 first:border-t-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
      <div className="mt-0.5 flex min-h-5 items-center gap-2 text-sm font-medium text-cf-text">
        {swatchColor ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: swatchColor }}
          />
        ) : null}
        <span className="min-w-0 truncate">{value || "—"}</span>
      </div>
    </div>
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
          singleRow ? "overflow-x-auto pb-1" : "flex-wrap",
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

export function PatientMetaItem({
  label,
  value,
  className = "",
  multiline = false,
}: PatientMetaItemProps) {
  return (
    <div
      className={[
        "min-w-0 border-t border-cf-border/80 py-2 first:border-t-0",
        className,
      ].join(" ")}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
      <div
        className={[
          "mt-0.5 min-h-5 text-sm font-medium text-cf-text",
          multiline ? "leading-snug" : "truncate",
        ].join(" ")}
      >
        {value || "—"}
      </div>
    </div>
  );
}
