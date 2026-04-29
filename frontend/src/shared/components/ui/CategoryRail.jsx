function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function CategoryRail({ label, children, className = "" }) {
  return (
    <nav aria-label={label} className={joinClasses(className || "grid gap-1")}>
      {children}
    </nav>
  );
}

export function CategoryRailItem({
  active = false,
  children,
  className = "",
  dotClassName = "",
  onClick,
  size = "sm",
}) {
  const sizeClasses =
    size === "md"
      ? "rounded-xl px-3 py-2.5 text-sm"
      : "rounded-lg px-3 py-1.5 text-xs md:text-[13px]";
  const dotSizeClass = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={joinClasses(
        "group flex w-full shrink-0 items-center text-left transition md:shrink",
        sizeClasses,
        active
          ? "bg-cf-surface font-semibold text-cf-text shadow-[var(--shadow-panel)]"
          : "text-cf-text-muted hover:bg-cf-surface/70 hover:text-cf-text",
        className
      )}
    >
      <span
        className={joinClasses(
          "mr-2 shrink-0 rounded-full transition",
          dotSizeClass,
          active
            ? "bg-cf-accent"
            : "bg-cf-border-strong group-hover:bg-cf-text-subtle",
          dotClassName
        )}
      />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}
