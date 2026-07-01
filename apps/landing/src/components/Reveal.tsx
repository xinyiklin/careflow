import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger within a group; added to the base transition delay. */
  delay?: number;
  className?: string;
};

// A one-shot entrance: content fades and lifts into place the first time it
// enters the viewport (or immediately, if already in view on load). This is the
// one marketing-register affordance the portals deliberately avoid; it stays
// inside a single slow band, never loops, and collapses entirely under
// prefers-reduced-motion. Not a continuous scroll effect — a boolean toggle, so
// plain state is correct here.
//
// Robustness: content starts at opacity 0, so it must be guaranteed to reveal.
// Anything already in view on mount reveals immediately without waiting on
// IntersectionObserver (covers above-the-fold content and any environment where
// the observer never delivers a callback); the rest reveals via the observer,
// with a scroll listener as a belt-and-suspenders fallback. Content is never
// left permanently hidden.
export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const inView = () => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };

    if (inView()) {
      setShown(true);
      return;
    }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setShown(true);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      if (inView()) reveal();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={[
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
