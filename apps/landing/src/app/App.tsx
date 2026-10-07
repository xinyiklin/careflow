import { SiteHeader } from "../components/SiteHeader";
import { Hero } from "../components/Hero";
import { DaySheet } from "../components/DaySheet";
import { Boundary } from "../components/Boundary";
import { Doors } from "../components/Doors";
import { SiteFooter } from "../components/SiteFooter";

export function App() {
  return (
    <div id="top" className="min-h-[100dvh]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-cf-control)] focus:bg-cf-door-clinician focus:px-4 focus:py-2 focus:text-sm focus:text-cf-on-door"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        <Hero />
        <DaySheet />
        <Boundary />
        <Doors />
      </main>

      <SiteFooter />
    </div>
  );
}
