type CarrierBrand = {
  keywords: string[];
  gradient: string;
  accentHex: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
};

const CARRIER_BRANDS: CarrierBrand[] = [
  {
    keywords: ["united", "uhc", "optum"],
    gradient: "from-[#0C2340] via-[#002856] to-[#001a3a]",
    accentHex: "#FF6200",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-200",
    badgeBorder: "border-orange-400/30",
  },
  {
    keywords: ["aetna", "cvs health"],
    gradient: "from-[#4B0D6E] via-[#6B1FA1] to-[#3A0054]",
    accentHex: "#7B2AB0",
    badgeBg: "bg-violet-500/20",
    badgeText: "text-violet-200",
    badgeBorder: "border-violet-400/30",
  },
  {
    keywords: ["cigna", "evernorth"],
    gradient: "from-[#003DA5] via-[#0050C8] to-[#002b78]",
    accentHex: "#F37021",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-200",
    badgeBorder: "border-blue-400/30",
  },
  {
    keywords: [
      "blue cross",
      "blue shield",
      "bcbs",
      "anthem",
      "carefirst",
      "highmark",
      "horizon blue",
      "independence blue",
    ],
    gradient: "from-[#003876] via-[#005EB8] to-[#002654]",
    accentHex: "#005EB8",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-200",
    badgeBorder: "border-sky-400/30",
  },
  {
    keywords: ["humana"],
    gradient: "from-[#1B5E20] via-[#2E7D32] to-[#0d3813]",
    accentHex: "#43A047",
    badgeBg: "bg-green-500/20",
    badgeText: "text-green-200",
    badgeBorder: "border-green-400/30",
  },
  {
    keywords: ["kaiser", "permanente"],
    gradient: "from-[#002B5C] via-[#004080] to-[#001938]",
    accentHex: "#004B87",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-200",
    badgeBorder: "border-blue-400/30",
  },
  {
    keywords: ["molina"],
    gradient: "from-[#6A1B9A] via-[#8E24AA] to-[#4A0072]",
    accentHex: "#8E24AA",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-200",
    badgeBorder: "border-purple-400/30",
  },
  {
    keywords: ["centene", "wellcare", "ambetter"],
    gradient: "from-[#00695C] via-[#00897B] to-[#004D40]",
    accentHex: "#00897B",
    badgeBg: "bg-teal-500/20",
    badgeText: "text-teal-200",
    badgeBorder: "border-teal-400/30",
  },
  {
    keywords: ["medicaid"],
    gradient: "from-[#1A237E] via-[#283593] to-[#0D1642]",
    accentHex: "#3F51B5",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-200",
    badgeBorder: "border-indigo-400/30",
  },
  {
    keywords: ["medicare"],
    gradient: "from-[#0D47A1] via-[#1565C0] to-[#082E6A]",
    accentHex: "#1E88E5",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-200",
    badgeBorder: "border-blue-400/30",
  },
  {
    keywords: ["tricare"],
    gradient: "from-[#004D40] via-[#00695C] to-[#003329]",
    accentHex: "#26A69A",
    badgeBg: "bg-teal-500/20",
    badgeText: "text-teal-200",
    badgeBorder: "border-teal-400/30",
  },
  {
    keywords: ["metroplus", "metro plus", "metroplus"],
    gradient: "from-[#B71C1C] via-[#D32F2F] to-[#7F0000]",
    accentHex: "#E53935",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-200",
    badgeBorder: "border-red-400/30",
  },
  {
    keywords: ["empire"],
    gradient: "from-[#1A237E] via-[#303F9F] to-[#0D1257]",
    accentHex: "#5C6BC0",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-200",
    badgeBorder: "border-indigo-400/30",
  },
  {
    keywords: ["community plan", "community health"],
    gradient: "from-[#004D40] via-[#00796B] to-[#00332B]",
    accentHex: "#009688",
    badgeBg: "bg-teal-500/20",
    badgeText: "text-teal-200",
    badgeBorder: "border-teal-400/30",
  },
];

const FALLBACK_PALETTES = [
  {
    gradient: "from-slate-900 via-[#1e1b4b] to-slate-950",
    accentHex: "#6366F1",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-200",
    badgeBorder: "border-indigo-400/30",
  },
  {
    gradient: "from-slate-900 via-[#064e3b] to-slate-950",
    accentHex: "#10B981",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-200",
    badgeBorder: "border-emerald-400/30",
  },
  {
    gradient: "from-slate-900 via-[#581c87] to-slate-950",
    accentHex: "#A855F7",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-200",
    badgeBorder: "border-purple-400/30",
  },
  {
    gradient: "from-slate-900 via-[#7c2d12] to-slate-950",
    accentHex: "#EA580C",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-200",
    badgeBorder: "border-orange-400/30",
  },
  {
    gradient: "from-slate-900 via-[#155e75] to-slate-950",
    accentHex: "#0891B2",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-200",
    badgeBorder: "border-cyan-400/30",
  },
  {
    gradient: "from-slate-900 via-[#831843] to-slate-950",
    accentHex: "#DB2777",
    badgeBg: "bg-pink-500/20",
    badgeText: "text-pink-200",
    badgeBorder: "border-pink-400/30",
  },
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export type CardBranding = {
  gradient: string;
  accentHex: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  monogram: string;
  matched: boolean;
};

function getMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function getCarrierBranding(
  carrierName: string | null | undefined
): CardBranding {
  const fallback = {
    ...FALLBACK_PALETTES[0],
    monogram: "?",
    matched: false,
  };

  if (!carrierName) return fallback;

  const lower = carrierName.toLowerCase();
  const monogram = getMonogram(carrierName);

  for (const brand of CARRIER_BRANDS) {
    if (brand.keywords.some((kw) => lower.includes(kw))) {
      return {
        gradient: brand.gradient,
        accentHex: brand.accentHex,
        badgeBg: brand.badgeBg,
        badgeText: brand.badgeText,
        badgeBorder: brand.badgeBorder,
        monogram,
        matched: true,
      };
    }
  }

  const palette =
    FALLBACK_PALETTES[hashString(lower) % FALLBACK_PALETTES.length];
  return {
    ...palette,
    monogram,
    matched: false,
  };
}
