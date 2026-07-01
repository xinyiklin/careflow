import { SiteHeader } from "../components/SiteHeader";
import { Hero } from "../components/Hero";
import { Portals } from "../components/Portals";
import { Highlights } from "../components/Highlights";
import { Stack } from "../components/Stack";
import { Disclaimer } from "../components/Disclaimer";
import { SiteFooter } from "../components/SiteFooter";

export function App() {
  return (
    <div id="top" className="min-h-[100dvh]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-cf-control)] focus:bg-cf-accent focus:px-4 focus:py-2 focus:text-sm focus:text-cf-surface"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        <Hero />
        <Portals />
        <Highlights />
        <Stack />
        <Disclaimer />
      </main>

      <SiteFooter />
    </div>
  );
}
