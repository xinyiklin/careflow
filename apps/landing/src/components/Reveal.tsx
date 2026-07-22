import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger within a group; added to the base transition delay. */
  delay?: number;
  className?: string;
};

// A one-shot entrance: content fades and lifts into place the first time it
// enters the viewport (or immediately, if already in view on load). This is the
// one marketing-register affordance the portals deliberately avoid; it never
// loops and collapses entirely under prefers-reduced-motion. Not a continuous
// scroll effect — a boolean toggle, so plain state is correct here.
//
// Robustness: content starts at opacity 0, so it must be guaranteed to reveal.
// Anything already in view on mount reveals immediately without waiting on
// IntersectionObserver; the rest reveals through the observer. Browsers that
// genuinely lack that API use a small scroll fallback.
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

    // TypeScript's DOM lib assumes this API is always present, but retain a
    // small scroll fallback for genuinely older browser environments.
    const Observer = window.IntersectionObserver as
      | typeof IntersectionObserver
      | undefined;
    if (!Observer) {
      const onScroll = () => {
        if (!inView()) return;
        setShown(true);
        window.removeEventListener("scroll", onScroll);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setShown(true);
      observer.disconnect();
    };
    const observer = new Observer(
      ([entry]) => {
        if (entry.isIntersecting) reveal();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={[
        "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
