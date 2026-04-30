const variants = {
  default:
    "border border-cf-border bg-cf-surface text-cf-text-muted " +
    "shadow-[var(--shadow-panel)] hover:border-cf-border-strong hover:bg-cf-surface-soft hover:text-cf-text",
  primary:
    "border border-cf-accent bg-cf-accent text-cf-page-bg " +
    "shadow-[var(--shadow-panel)] hover:border-cf-accent-hover hover:bg-cf-accent-hover",
  danger: "border border-transparent bg-red-600 text-white hover:bg-red-700",
  warning:
    "border border-transparent bg-amber-500 text-white hover:bg-amber-600",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

const shapes = {
  rounded: "rounded-xl",
  pill: "rounded-full",
};

export default function Button({
  variant = "default",
  size = "md",
  shape = "rounded",
  className = "",
  disabled,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium leading-none transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant] ?? variants.default,
        sizes[size] ?? sizes.md,
        shapes[shape] ?? shapes.rounded,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
