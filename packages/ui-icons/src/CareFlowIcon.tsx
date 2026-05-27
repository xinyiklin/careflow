import type { SVGProps } from "react";

export default function CareFlowIcon({
  className = "h-5 w-5",
  strokeWidth = 5,
}: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M24 10.5C22.5 8 20 6.5 16 6.5C10.75 6.5 6.5 10.75 6.5 16C6.5 21.25 10.75 25.5 16 25.5C20 25.5 22.5 24 24 21.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M14 16H22"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
