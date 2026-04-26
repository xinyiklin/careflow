export function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-sm text-cf-danger-text">{error.message}</p>;
}

export function FieldHint({ children }) {
  return <p className="mt-1 text-xs text-cf-text-subtle">{children}</p>;
}

export function FormLabel({ children, required = false, compact = false }) {
  return (
    <label
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
