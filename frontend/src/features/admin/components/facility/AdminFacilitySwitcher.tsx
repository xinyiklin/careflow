import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import useAdminFacility from "../../hooks/shared/useAdminFacility";
import type { EntityId } from "../../../../shared/api/types";

export default function AdminFacilitySwitcher() {
  const {
    adminFacility,
    manageableMemberships,
    selectedAdminFacilityId,
    setSelectedAdminFacilityId,
  } = useAdminFacility();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (facilityId: EntityId) => {
    setSelectedAdminFacilityId?.(String(facilityId));
    setIsOpen(false);
  };

  if (!adminFacility) {
    return null;
  }

  if (manageableMemberships.length < 2) {
    return (
      <span className="block truncate text-sm font-semibold text-cf-text">
        {adminFacility.name}
      </span>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex w-full items-center gap-1 text-left text-sm font-semibold text-cf-text transition-colors hover:text-cf-text"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1 truncate">{adminFacility.name}</span>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 shrink-0 text-cf-text-muted transition-transform duration-200",
            isOpen ? "rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>

      {isOpen && manageableMemberships.length > 0 && (
        <div className="absolute left-0 top-[calc(100%+0.25rem)] z-30 w-full overflow-hidden rounded-lg border border-[var(--color-cf-sidebar-border)] bg-[var(--color-cf-sidebar-bg)] p-1 shadow-lg">
          <ul className="max-h-72 space-y-0.5 overflow-y-auto" role="listbox">
            {manageableMemberships.map((membership) => {
              const facilityOption = membership.facility;
              const isCurrent =
                String(facilityOption.id) === String(selectedAdminFacilityId);

              return (
                <li key={membership.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(facilityOption.id)}
                    className={[
                      "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-semibold transition",
                      isCurrent
                        ? "bg-[var(--color-cf-sidebar-active-bg)] text-[var(--color-cf-sidebar-text)]"
                        : "text-[var(--color-cf-sidebar-text-muted)] hover:bg-[var(--color-cf-sidebar-surface)] hover:text-[var(--color-cf-sidebar-text)]",
                    ].join(" ")}
                    role="option"
                    aria-selected={isCurrent}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {facilityOption.name}
                    </span>
                    {isCurrent ? (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-[var(--color-cf-sidebar-accent)]" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
