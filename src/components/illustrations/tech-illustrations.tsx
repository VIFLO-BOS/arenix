import { cn } from "@/lib/utils";

/**
 * Software themed illustrations in the navy and gold palette. They are clearly illustrations
 * (not product screenshots) and are used for hero art, service and solution visuals and
 * section accents. Pure SVG so they stay crisp from 250px to 4K and cost no image bytes.
 */

type Props = { className?: string; title?: string };

const gold = "#fc8f2d";
const goldSoft = "rgba(252,143,45,0.35)";
const line = "rgba(246,243,234,0.14)";
const lineStrong = "rgba(246,243,234,0.3)";
const panel = "#122a52";
const panelDeep = "#0b1d3a";
const text = "rgba(246,243,234,0.55)";
const bright = "rgba(246,243,234,0.8)";

export function DashboardIllustration({ className, title = "Illustration of an operations dashboard" }: Props) {
  return (
    <svg viewBox="0 0 640 400" className={cn("h-auto w-full", className)} role="img" aria-label={title}>
      <rect width="640" height="400" rx="18" fill={panelDeep} />
      <rect x="0" y="0" width="150" height="400" fill={panel} />
      {[48, 84, 120, 156, 192].map((y, i) => (
        <g key={y}>
          <rect x="22" y={y} width="12" height="12" rx="3" fill={i === 0 ? gold : lineStrong} />
          <rect x="44" y={y + 2} width={i === 0 ? 72 : 56} height="8" rx="4" fill={i === 0 ? bright : text} />
        </g>
      ))}
      <rect x="178" y="28" width="220" height="12" rx="6" fill={bright} />
      <rect x="178" y="48" width="140" height="8" rx="4" fill={text} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={178 + i * 150} y="84" width="134" height="76" rx="10" fill={panel} stroke={line} />
          <rect x={194 + i * 150} y="100" width="54" height="7" rx="3.5" fill={text} />
          <rect x={194 + i * 150} y="118" width={70 + i * 12} height="16" rx="4" fill={i === 1 ? gold : bright} />
          <rect x={194 + i * 150} y="142" width="40" height="6" rx="3" fill={i === 1 ? gold : text} opacity="0.8" />
        </g>
      ))}
      <rect x="178" y="184" width="284" height="188" rx="10" fill={panel} stroke={line} />
      <polyline points="196,340 236,312 272,322 310,280 350,292 388,250 426,262 446,228" fill="none" stroke={gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="196,350 236,342 272,346 310,324 350,330 388,306 426,312 446,290" fill="none" stroke={lineStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {[196, 236, 272, 310, 350, 388, 426, 446].map((x) => (
        <line key={x} x1={x} y1="360" x2={x} y2="364" stroke={lineStrong} />
      ))}
      <rect x="478" y="184" width="134" height="188" rx="10" fill={panel} stroke={line} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="494" y={206 + i * 32} width="8" height="8" rx="4" fill={i < 2 ? gold : lineStrong} />
          <rect x="510" y={207 + i * 32} width={56 + ((i * 17) % 30)} height="6" rx="3" fill={text} />
          <rect x="580" y={205 + i * 32} width="18" height="10" rx="5" fill={i < 2 ? goldSoft : line} />
        </g>
      ))}
    </svg>
  );
}

export function CodeWindowIllustration({ className, title = "Illustration of a code editor" }: Props) {
  const rows: [number, number, string][] = [
    [0, 90, gold],
    [1, 160, bright],
    [1, 120, text],
    [2, 200, bright],
    [2, 140, gold],
    [1, 80, text],
    [0, 60, bright],
    [0, 110, gold],
    [1, 170, text],
    [1, 130, bright],
    [0, 70, text],
  ];
  return (
    <svg viewBox="0 0 560 360" className={cn("h-auto w-full", className)} role="img" aria-label={title}>
      <rect width="560" height="360" rx="18" fill={panelDeep} />
      <rect width="560" height="40" rx="18" fill={panel} />
      <rect y="22" width="560" height="18" fill={panel} />
      {[26, 46, 66].map((x) => (
        <circle key={x} cx={x} cy="20" r="5" fill={lineStrong} />
      ))}
      <rect x="110" y="13" width="120" height="14" rx="7" fill={panelDeep} />
      {rows.map(([indent, width, fill], i) => (
        <g key={i}>
          <rect x="22" y={66 + i * 24} width="14" height="8" rx="4" fill={line} />
          <rect x={56 + indent * 28} y={66 + i * 24} width={width} height="8" rx="4" fill={fill} />
        </g>
      ))}
      <rect x="380" y="70" width="156" height="110" rx="10" fill={panel} stroke={line} />
      <rect x="396" y="88" width="80" height="7" rx="3.5" fill={text} />
      <rect x="396" y="106" width="124" height="7" rx="3.5" fill={goldSoft} />
      <rect x="396" y="124" width="100" height="7" rx="3.5" fill={text} />
      <rect x="396" y="150" width="60" height="14" rx="7" fill={gold} />
    </svg>
  );
}

export function MobileAppIllustration({ className, title = "Illustration of a mobile application" }: Props) {
  return (
    <svg viewBox="0 0 260 520" className={cn("h-auto w-full", className)} role="img" aria-label={title}>
      <rect x="4" y="4" width="252" height="512" rx="40" fill={panel} stroke={lineStrong} />
      <rect x="18" y="18" width="224" height="484" rx="30" fill={panelDeep} />
      <rect x="96" y="30" width="68" height="10" rx="5" fill={panel} />
      <rect x="40" y="70" width="120" height="12" rx="6" fill={bright} />
      <rect x="40" y="92" width="80" height="7" rx="3.5" fill={text} />
      <rect x="40" y="124" width="180" height="96" rx="14" fill={panel} />
      <rect x="56" y="142" width="60" height="7" rx="3.5" fill={text} />
      <rect x="56" y="160" width="100" height="18" rx="5" fill={gold} />
      <rect x="56" y="192" width="140" height="7" rx="3.5" fill={text} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="40" y={242 + i * 52} width="180" height="40" rx="10" fill={panel} stroke={line} />
          <rect x="54" y={254 + i * 52} width="16" height="16" rx="8" fill={i === 1 ? gold : lineStrong} />
          <rect x="80" y={255 + i * 52} width={70 + (i % 2) * 30} height="6" rx="3" fill={bright} />
          <rect x="80" y={268 + i * 52} width="50" height="5" rx="2.5" fill={text} />
        </g>
      ))}
      <rect x="40" y="454" width="180" height="36" rx="18" fill={gold} />
      <rect x="100" y="468" width="60" height="8" rx="4" fill={panelDeep} />
    </svg>
  );
}

export function ArchitectureIllustration({ className, title = "Illustration of a system architecture" }: Props) {
  const node = (x: number, y: number, w: number, label: string, accent = false) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={w} height="44" rx="10" fill={accent ? "rgba(252,143,45,0.14)" : panel} stroke={accent ? gold : line} />
      <rect x={x + 14} y={y + 18} width={w - 28} height="8" rx="4" fill={accent ? gold : bright} />
      <title>{label}</title>
    </g>
  );
  return (
    <svg viewBox="0 0 640 360" className={cn("h-auto w-full", className)} role="img" aria-label={title}>
      <rect width="640" height="360" rx="18" fill={panelDeep} />
      <g opacity="0.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="360" stroke={line} />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 40} x2="640" y2={i * 40} stroke={line} />
        ))}
      </g>
      {node(40, 60, 140, "Web and mobile clients")}
      {node(40, 250, 140, "Staff dashboard")}
      {node(250, 155, 150, "Application services", true)}
      {node(470, 40, 140, "Database")}
      {node(470, 130, 140, "Media storage")}
      {node(470, 220, 140, "Email and messaging")}
      {node(470, 300, 140, "Scheduling webhooks")}
      {["M180 82 L250 170", "M180 272 L250 190", "M400 170 L470 62", "M400 175 L470 152", "M400 180 L470 242", "M470 322 L400 185"].map((d) => (
        <path key={d} d={d} fill="none" stroke={lineStrong} strokeWidth="1.5" strokeDasharray="4 4" />
      ))}
      <circle cx="325" cy="177" r="6" fill={gold} />
    </svg>
  );
}

export function DataFlowIllustration({ className, title = "Illustration of data moving between systems" }: Props) {
  return (
    <svg viewBox="0 0 640 320" className={cn("h-auto w-full", className)} role="img" aria-label={title}>
      <rect width="640" height="320" rx="18" fill={panelDeep} />
      <path d="M40 240 C 160 60, 300 300, 420 120 S 600 100, 610 90" fill="none" stroke={gold} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 270 C 160 110, 300 330, 420 160 S 600 150, 610 140" fill="none" stroke={lineStrong} strokeWidth="1.5" strokeLinecap="round" />
      {[
        [40, 240],
        [210, 170],
        [420, 120],
        [610, 90],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="14" fill={panel} stroke={gold} />
          <circle cx={x} cy={y} r="5" fill={gold} />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={60 + i * 190} y="40" width="150" height="40" rx="10" fill={panel} stroke={line} />
          <rect x={76 + i * 190} y="56" width={90 - i * 10} height="8" rx="4" fill={bright} />
        </g>
      ))}
    </svg>
  );
}

export function ChartIllustration({ className, title = "Illustration of analytics charts" }: Props) {
  const bars = [38, 62, 48, 80, 70, 96, 84, 110];
  return (
    <svg viewBox="0 0 480 300" className={cn("h-auto w-full", className)} role="img" aria-label={title}>
      <rect width="480" height="300" rx="18" fill={panelDeep} />
      <rect x="28" y="28" width="160" height="12" rx="6" fill={bright} />
      <rect x="28" y="50" width="100" height="7" rx="3.5" fill={text} />
      {bars.map((h, i) => (
        <rect key={i} x={40 + i * 54} y={250 - h} width="30" height={h} rx="6" fill={i === bars.length - 1 ? gold : i % 2 ? "rgba(246,243,234,0.35)" : panel} stroke={i % 2 ? "none" : line} />
      ))}
      <line x1="28" y1="250" x2="452" y2="250" stroke={lineStrong} />
      <circle cx="400" cy="70" r="34" fill="none" stroke={line} strokeWidth="10" />
      <path d="M400 36 A34 34 0 0 1 432 80" fill="none" stroke={gold} strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

export type IllustrationKind = "dashboard" | "code" | "mobile" | "architecture" | "flow" | "chart";

/** Picks an illustration by key so content records can request one by name. */
export function TechIllustration({ kind, className }: { kind: IllustrationKind; className?: string }) {
  switch (kind) {
    case "dashboard":
      return <DashboardIllustration className={className} />;
    case "code":
      return <CodeWindowIllustration className={className} />;
    case "mobile":
      return <MobileAppIllustration className={className} />;
    case "architecture":
      return <ArchitectureIllustration className={className} />;
    case "flow":
      return <DataFlowIllustration className={className} />;
    case "chart":
      return <ChartIllustration className={className} />;
  }
}
