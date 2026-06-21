import { useRef } from "react";
import type { KeyboardEvent } from "react";

/**
 * Id of a single tab button — pair with `aria-labelledby` on its panel.
 * Mirrors the clinician `getTabId` so portal tablists share the APG model.
 */
export function getPortalTabId(idBase: string, value: string) {
  return `${idBase}-tab-${value}`;
}

/**
 * Id of the (single, content-swapping) panel the tabs control — pair with
 * `aria-controls` on the tabs.
 */
export function getPortalTabPanelId(idBase: string) {
  return `${idBase}-panel`;
}

type UsePortalTabsArgs<TValue extends string> = {
  values: readonly TValue[];
  value: TValue;
  onChange: (value: TValue) => void;
};

type TabListProps = {
  ref: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (event: KeyboardEvent) => void;
};

/**
 * Headless roving-tabindex + arrow-key behavior for the patient portal's
 * hand-rolled tablists. Keeps each page's own visual markup — it only supplies
 * the keyboard model (ArrowLeft/ArrowRight wrap-around, Home, End) and a ref
 * for moving DOM focus to the newly active tab, mirroring the clinician `Tabs`
 * primitive (`apps/clinician/src/shared/components/ui/Tabs.tsx`).
 *
 * Spread `getTabListProps()` onto the `role="tablist"` container, give each tab
 * `tabIndex={active ? 0 : -1}`, and wire `id`/`aria-controls` via
 * `getPortalTabId` / `getPortalTabPanelId`.
 */
export function usePortalTabs<TValue extends string>({
  values,
  value,
  onChange,
}: UsePortalTabsArgs<TValue>) {
  const tablistRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent) {
    const currentIndex = values.indexOf(value);
    let nextIndex = -1;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % values.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + values.length) % values.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = values.length - 1;
    }

    if (nextIndex < 0) return;
    event.preventDefault();
    onChange(values[nextIndex]);
    const tabs =
      tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  }

  function getTabListProps(): TabListProps {
    return { ref: tablistRef, onKeyDown: handleKeyDown };
  }

  return { getTabListProps };
}
