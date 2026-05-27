type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
};

type SegmentedControlProps<TValue extends string> = {
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  ariaLabel?: string;
};

export function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-cf-control border border-cf-border bg-cf-surface-soft p-0.5"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-[calc(var(--radius-cf-control)-2px)] px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-cf-surface text-cf-text shadow-[var(--shadow-panel)]"
                : "text-cf-text-muted hover:text-cf-text"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
