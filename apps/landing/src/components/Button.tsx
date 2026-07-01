import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

type Variant = "primary" | "secondary";
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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-cf-control)] text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-accent active:translate-y-px";

const SIZES: Record<Size, string> = {
  md: "px-5 py-2.5",
  sm: "px-4 py-2",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-cf-accent text-cf-surface hover:bg-cf-accent-hover",
  secondary:
    "border border-cf-border-strong bg-cf-surface text-cf-text hover:border-cf-text-subtle",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
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
