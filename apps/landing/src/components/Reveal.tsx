import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

// One-shot visibility: true the first time the element enters the viewport (or
// immediately when it is already in view, or when reduced motion is on). Never
// flips back. A boolean toggle, so plain state is correct here.
//
// Robustness: callers hide content until this is true, so it must be
// guaranteed to resolve. Anything already in view on mount resolves
// immediately without waiting on IntersectionObserver; browsers that lack that
// API use a small scroll fallback.
export function useShownOnce(ref: RefObject<HTMLElement | null>): boolean {
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

    const observer = new Observer(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return shown;
}

type RevealProps = {
  children: ReactNode;
  /** Stagger within a group; added to the base transition delay. */
  delay?: number;
  className?: string;
};

// The shared maker entrance: content fades and lifts 16px into place the first
// time it enters the viewport. It never loops and collapses entirely under
// prefers-reduced-motion.
export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useShownOnce(ref);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={[
        "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
