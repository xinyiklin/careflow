import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
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

  if (!adminFacility || manageableMemberships.length < 2) {
    return null;
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={[
          "group flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left transition",
          isOpen
            ? "bg-cf-surface-soft text-cf-text"
            : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
        ].join(" ")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Building2 className="h-4 w-4 shrink-0 text-cf-text-subtle transition group-hover:text-cf-text-muted" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {adminFacility.name}
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 text-cf-text-subtle transition-transform duration-200 group-hover:text-cf-text-muted",
            isOpen ? "rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>

      {isOpen && manageableMemberships.length > 0 && (
        <div className="absolute left-0 top-[calc(100%+0.25rem)] z-30 w-full overflow-hidden rounded-lg border border-cf-border bg-cf-surface p-1 shadow-[var(--shadow-panel-lg)]">
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
                        ? "bg-cf-surface-soft text-cf-text"
                        : "text-cf-text hover:bg-cf-surface-soft",
                    ].join(" ")}
                    role="option"
                    aria-selected={isCurrent}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {facilityOption.name}
                    </span>
                    {isCurrent ? (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-cf-accent" />
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
