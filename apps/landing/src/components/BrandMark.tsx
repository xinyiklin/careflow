import { CareFlowIcon } from "@careflow/ui-icons";

// The favicon's mark: a navy tile with the frost glyph, identical in both
// themes so the brand reads the same in the tab and on the page.
export function BrandMark({ size = "md" }: { size?: "md" | "sm" }) {
  const box =
    size === "md" ? "h-8 w-8 rounded-[10px]" : "h-7 w-7 rounded-[9px]";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-cf-mark text-cf-frost ring-1 ring-inset ring-[rgba(191,210,224,0.18)] ${box}`}
    >
      <CareFlowIcon
        className={size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4"}
      />
    </span>
  );
}
