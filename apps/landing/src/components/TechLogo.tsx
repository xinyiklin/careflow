type TechLogoProps = {
  slug: string;
  name: string;
};

// Real brand mark from Simple Icons, painted in the current text color via a
// CSS mask so it reads as a restrained monochrome glyph in both themes rather
// than a clashing brand color. The adjacent name label carries the meaning if
// the CDN mask fails to load.
//
// Served from the pinned jsdelivr npm mirror rather than cdn.simpleicons.org:
// the hosted CDN has dropped some trademarked marks (e.g. awsamplify 404s),
// while the versioned package still ships them. Pinning also avoids silent
// slug drift on a future major.
const ICON_BASE = "https://cdn.jsdelivr.net/npm/simple-icons@14/icons";

export function TechLogo({ slug, name }: TechLogoProps) {
  const url = `${ICON_BASE}/${slug}.svg`;
  return (
    <span
      aria-hidden="true"
      title={name}
      className="inline-block h-5 w-5 shrink-0 bg-cf-text-muted"
      style={{
        maskImage: `url(${url})`,
        WebkitMaskImage: `url(${url})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
