import type { ReactNode } from "react";

export function PreferenceSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-cf-border px-5 py-5 last:border-b-0">
      <h2 className="mb-4 text-sm font-semibold text-cf-text">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export function PreferenceGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-medium text-cf-text-muted">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function PreferenceToggle({
  title,
  checked,
  onChange,
  description,
}: {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-between gap-4">
      <span className="min-w-0 text-sm text-cf-text">
        {title}
        {description ? (
          <span className="mt-1 block text-xs text-cf-text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 cursor-pointer accent-cf-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cf-accent"
      />
    </label>
  );
}
