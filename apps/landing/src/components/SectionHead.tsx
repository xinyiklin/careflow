import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type SectionHeadProps = {
  id: string;
  title: string;
  children: ReactNode;
  /** On the navy boundary band. */
  inverse?: boolean;
};

// Shared maker section head: the claim on the left, the supporting lede on the
// right, bottoms aligned. RoleFit AI's landing uses the same arrangement.
export function SectionHead({
  id,
  title,
  children,
  inverse,
}: SectionHeadProps) {
  return (
    <Reveal className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-12">
      <h2
        id={id}
        className={[
          "cf-display text-[2rem] leading-[1.08] sm:text-[2.5rem] lg:col-span-7",
          inverse ? "text-cf-band-text" : "text-cf-text",
        ].join(" ")}
      >
        {title}
      </h2>
      <p
        className={[
          "max-w-[34rem] text-base leading-relaxed lg:col-span-5",
          inverse ? "text-cf-band-muted" : "text-cf-text-muted",
        ].join(" ")}
      >
        {children}
      </p>
    </Reveal>
  );
}
