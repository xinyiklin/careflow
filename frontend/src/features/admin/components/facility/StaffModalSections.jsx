import { Badge } from "../../../../shared/components/ui";
import { SECURITY_PERMISSION_GROUPS } from "../../constants/securityPermissions";

export const HIGH_IMPACT_PERMISSION_KEYS = new Set([
  "schedule.delete",
  "patients.delete",
  "documents.categories.manage",
  "pharmacies.manage",
  "admin.facility.manage",
]);

function getPermissionItems() {
  return SECURITY_PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.map((permission) => ({
      ...permission,
      groupLabel: group.label,
    }))
  );
}

export function getPermissionSummary(permissions) {
  const items = getPermissionItems();
  const allowed = items.filter((permission) => permissions[permission.key]);
  const highImpact = allowed.filter((permission) =>
    HIGH_IMPACT_PERMISSION_KEYS.has(permission.key)
  );

  return {
    allowed,
    highImpact,
    total: items.length,
  };
}

export function getInitialsFromName(name, fallback = "CF") {
  return (
    name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || fallback
  );
}

export function getOverrideStats(overrides = {}) {
  const values = Object.values(overrides);
  return {
    total: values.length,
    granted: values.filter(Boolean).length,
    blocked: values.filter((value) => value === false).length,
  };
}

export function CompactField({ label, children, className = "" }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

export function AccessMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface-soft/60 px-3 py-2">
      <div className="text-lg font-semibold leading-none text-cf-text">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        {label}
      </div>
    </div>
  );
}

function OverrideModeControl({ value, onChange }) {
  const options = [
    { value: "inherit", label: "Role" },
    { value: "grant", label: "Allow" },
    { value: "revoke", label: "Block" },
  ];

  return (
    <div className="inline-grid grid-cols-3 rounded-full border border-cf-border bg-cf-page-bg p-0.5">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "rounded-full px-2 py-1 text-[10px] font-semibold transition",
              isActive
                ? "bg-cf-text text-cf-page-bg shadow-[var(--shadow-panel)]"
                : "text-cf-text-muted hover:bg-cf-surface hover:text-cf-text",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SecurityOverrideBoard({
  inheritedPermissions,
  effectivePermissions,
  securityOverrides,
  onChange,
}) {
  return (
    <section className="rounded-2xl border border-cf-border bg-cf-surface-soft/45 p-3 shadow-[var(--shadow-panel)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
            Override console
          </div>
          <div className="text-base font-semibold text-cf-text">Security</div>
        </div>
        <Badge variant="muted">
          {Object.keys(securityOverrides || {}).length} custom
        </Badge>
      </div>

      <div className="grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
        {SECURITY_PERMISSION_GROUPS.map((group) => {
          const groupAllowed = group.permissions.filter(
            (permission) => effectivePermissions[permission.key]
          ).length;

          return (
            <div
              key={group.key}
              className="rounded-2xl border border-cf-border bg-cf-surface p-2.5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                  {group.label}
                </div>
                <span className="rounded-full border border-cf-border bg-cf-surface-soft/70 px-2 py-0.5 text-[10px] font-semibold text-cf-text-muted">
                  {groupAllowed}/{group.permissions.length}
                </span>
              </div>

              <div className="grid gap-1.5">
                {group.permissions.map((permission) => {
                  const overrideValue = securityOverrides?.[permission.key];
                  const selectValue =
                    overrideValue === true
                      ? "grant"
                      : overrideValue === false
                        ? "revoke"
                        : "inherit";
                  const inheritedAllowed = inheritedPermissions[permission.key];
                  const effectiveAllowed = effectivePermissions[permission.key];
                  const isHighImpact = HIGH_IMPACT_PERMISSION_KEYS.has(
                    permission.key
                  );

                  return (
                    <div
                      key={permission.key}
                      className={[
                        "grid gap-2 rounded-xl border px-2.5 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center",
                        selectValue === "inherit"
                          ? "border-cf-border bg-cf-surface-soft/35"
                          : "border-cf-border-strong bg-cf-page-bg",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-cf-text">
                            {permission.label}
                          </span>
                          {isHighImpact ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-cf-warning-text" />
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
                          <span className="rounded-full bg-cf-surface px-2 py-0.5 text-cf-text-subtle ring-1 ring-cf-border">
                            Role {inheritedAllowed ? "allow" : "block"}
                          </span>
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 ring-1",
                              effectiveAllowed
                                ? "bg-cf-success-bg text-cf-success-text ring-cf-success-text/20"
                                : "bg-cf-surface text-cf-text-muted ring-cf-border",
                            ].join(" ")}
                          >
                            Now {effectiveAllowed ? "allow" : "block"}
                          </span>
                        </div>
                      </div>

                      <OverrideModeControl
                        value={selectValue}
                        onChange={(nextValue) =>
                          onChange(permission.key, nextValue)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
