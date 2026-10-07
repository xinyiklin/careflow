import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

type Variant = "clinician" | "patient" | "secondary";
type Size = "md" | "sm";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** External links open in a new tab and show a corner arrow. */
  external?: boolean;
  className?: string;
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-cf-control)] text-sm font-medium transition-[background-color,border-color,color,filter] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-text active:translate-y-px";

const SIZES: Record<Size, string> = {
  md: "h-11 px-5",
  sm: "h-9 px-3.5",
};

// Door colors double as the primary fills: each portal's button wears the
// color its workflows carry on the day sheet.
const VARIANTS: Record<Variant, string> = {
  clinician: "bg-cf-door-clinician text-cf-on-door hover:brightness-[1.15]",
  patient: "bg-cf-door-patient text-cf-on-door hover:brightness-[1.08]",
  secondary:
    "border border-cf-border-strong bg-cf-surface text-cf-text hover:border-cf-text-subtle",
};

export function ButtonLink({
  href,
  children,
  variant = "clinician",
  size = "md",
  external = false,
  className = "",
}: ButtonLinkProps) {
  const externalProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
  return (
    <a
      href={href}
      {...externalProps}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
      {external ? (
        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
    </a>
  );
}
