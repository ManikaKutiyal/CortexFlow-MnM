"use client";
import { useState, useCallback, type CSSProperties } from "react";

export interface BrainRegionData {
  id: string;
  label: string;
  agent: string;
  mni: [number, number, number];
  color: string;
  
  cx: number;
  
  cy: number;
  rx: number;
  ry: number;
}

export interface BrainAtlasProps {
  
  activations?: Record<string, number>;
  
  classifications?: Record<string, string>;
  
  activeAgent?: string;
  
  onRegionClick?: (regionId: string, data: BrainRegionData) => void;
  className?: string;
  style?: CSSProperties;
}

const REGIONS: BrainRegionData[] = [
  {
    id: "dlpfc",
    label: "DLPFC",
    agent: "Syntax",
    mni: [-46, 20, 32],
    color: "#00e5ff",
    cx: 168,
    cy: 98,
    rx: 46,
    ry: 30,
  },
  {
    id: "broca",
    label: "Broca's Area",
    agent: "Lexical",
    mni: [-44, 20, 8],
    color: "#ff6b6b",
    cx: 132,
    cy: 188,
    rx: 38,
    ry: 26,
  },
  {
    id: "sma",
    label: "SMA",
    agent: "Prosody",
    mni: [0, -4, 60],
    color: "#1d9e75",
    cx: 255,
    cy: 60,
    rx: 30,
    ry: 20,
  },
  {
    id: "wernicke",
    label: "Wernicke's Area",
    agent: "Semantic",
    mni: [-54, -40, 14],
    color: "#f59e0b",
    cx: 330,
    cy: 192,
    rx: 42,
    ry: 28,
  },
  {
    id: "amygdala",
    label: "Amygdala",
    agent: "Affective",
    mni: [-24, -4, -22],
    color: "#a855f7",
    cx: 172,
    cy: 258,
    rx: 26,
    ry: 20,
  },
];
const PATHWAYS = [
  
  {
    from: "broca",
    to: "wernicke",
    d: "M 168 185 C 220 140, 280 138, 295 185",
  },
  
  {
    from: "dlpfc",
    to: "broca",
    d: "M 158 125 C 152 145, 142 162, 138 170",
  },
  
  {
    from: "dlpfc",
    to: "sma",
    d: "M 205 85 C 218 75, 232 68, 240 64",
  },
  
  {
    from: "sma",
    to: "wernicke",
    d: "M 280 70 C 310 100, 328 145, 332 170",
  },
  
  {
    from: "amygdala",
    to: "broca",
    d: "M 162 242 C 150 225, 140 212, 138 205",
  },
];

function classifStyle(label: string): { bg: string; fg: string } {
  const l = label.toLowerCase();
  if (l === "normal" || l === "healthy")
    return { bg: "rgba(29,158,117,0.2)", fg: "#1d9e75" };
  if (l === "mild" || l === "elevated")
    return { bg: "rgba(245,158,11,0.2)", fg: "#f59e0b" };
  if (l === "moderate")
    return { bg: "rgba(249,115,22,0.2)", fg: "#f97316" };
  if (l === "severe" || l === "concerning")
    return { bg: "rgba(255,107,107,0.2)", fg: "#ff6b6b" };
  return { bg: "rgba(255,255,255,0.06)", fg: "rgba(255,255,255,0.45)" };
}

export function scoreToClassification(score: number): string {
  if (score >= 0.75) return "Elevated";
  if (score >= 0.5) return "Moderate";
  if (score >= 0.25) return "Mild";
  return "Normal";
}
export default function BrainAtlas({
  activations = {},
  classifications = {},
  activeAgent,
  onRegionClick,
  className = "",
  style,
}: BrainAtlasProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const handleClick = useCallback(
    (region: BrainRegionData) => {
      onRegionClick?.(region.id, region);
    },
    [onRegionClick],
  );

  const maxScore = Math.max(...Object.values(activations), 0);
  const globalIntensity = Math.min(1, maxScore * 1.3);

  return (
    <div className={`relative w-full h-full select-none ${className}`} style={style}>
      <svg
        viewBox="0 0 500 400"
        className="w-full h-full"
        style={{ overflow: "visible" }}
      >
        
        <defs>
          <radialGradient id="brain-aurora" cx="50%" cy="45%" r="52%">
            <stop offset="0%" stopColor="rgba(0,229,255,0.35)" />
            <stop offset="40%" stopColor="rgba(0,229,255,0.18)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </radialGradient>

          <filter id="brain-wide-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          
          {REGIONS.map((r) => (
            <filter
              key={`glow-${r.id}`}
              id={`glow-${r.id}`}
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feFlood floodColor={r.color} floodOpacity="0.55" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          
          <pattern
            id="brain-grid"
            x="0"
            y="0"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="14" cy="14" r="0.4" fill="rgba(255,255,255,0.04)" />
          </pattern>

          
          <linearGradient id="scanline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,229,255,0)" />
            <stop offset="42%" stopColor="rgba(0,229,255,0.06)" />
            <stop offset="50%" stopColor="rgba(0,229,255,0.18)" />
            <stop offset="58%" stopColor="rgba(0,229,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </linearGradient>

          
          <clipPath id="brain-clip">
            <path d="
              M 68 208
              C 62 152 82 95 125 62
              C 158 38 208 25 258 28
              C 302 28 342 38 372 56
              C 408 78 435 125 442 175
              C 448 215 440 255 418 282
              C 398 310 362 322 332 318
              C 298 314 265 308 235 300
              C 198 288 162 275 132 258
              C 102 240 78 222 72 210
              Z
            " />
          </clipPath>
        </defs>

        
        <rect width="500" height="400" fill="url(#brain-grid)" />

        
        <circle
          cx="250"
          cy="190"
          r="220"
          fill="url(#brain-aurora)"
          opacity={0.16 * (0.25 + globalIntensity * 0.75)}
          style={{ mixBlendMode: "screen", transition: "opacity 0.5s" }}
        />
        
        <g className="animate-brain-glow" filter={globalIntensity > 0.08 ? "url(#brain-wide-glow)" : undefined}>
          
          <path
            d="
              M 68 208
              C 62 152 82 95 125 62
              C 158 38 208 25 258 28
              C 302 28 342 38 372 56
              C 408 78 435 125 442 175
              C 448 215 440 255 418 282
              C 398 310 362 322 332 318
              C 298 314 265 308 235 300
              C 198 288 162 275 132 258
              C 102 240 78 222 72 210
              Z
            "
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1.2"
          />
          
          <path
            d="
              M 95 200
              C 92 160 108 110 145 82
              C 172 60 210 50 250 52
              C 288 50 320 58 348 72
              C 382 90 405 130 412 170
              C 418 200 412 235 395 258
              C 378 280 350 290 325 288
              C 295 286 268 280 240 275
              C 208 268 178 258 152 245
              C 125 228 105 215 100 205
              Z
            "
            fill="none"
            stroke="rgba(255,255,255,0.03)"
            strokeWidth="0.8"
          />
          
          <path
            d="
              M 332 318
              C 355 332 392 338 415 322
              C 432 310 438 288 425 272
            "
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <ellipse
            cx="382"
            cy="312"
            rx="36"
            ry="16"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.7"
          />
          <path
            d="M 322 320 C 318 342 320 360 325 378"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />
        </g>

        
        <g fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.7" strokeDasharray="5 5">
          
          <path d="M 265 36 C 268 82 275 138 280 185 C 282 212 276 232 268 252" />
          
          <path d="M 108 198 C 168 180 238 174 292 178 C 332 182 362 192 390 210" />
          
          <path d="M 378 60 C 382 98 385 145 388 188" />
        </g>

        
        <g fill="none" strokeWidth="0.8" strokeDasharray="3 7">
          {PATHWAYS.map((p) => {
            const a1 = activations[p.from] ?? 0;
            const a2 = activations[p.to] ?? 0;
            const active = a1 > 0.1 || a2 > 0.1;
            return (
              <path
                key={`${p.from}-${p.to}`}
                d={p.d}
                stroke={active ? "rgba(0,229,255,0.35)" : "rgba(255,255,255,0.06)"}
                opacity={active ? 0.6 : 0.3}
                style={{ transition: "stroke 0.8s, opacity 0.8s" }}
              />
            );
          })}
        </g>

        
        {REGIONS.map((region) => {
          const score = activations[region.id] ?? 0;
          const isHov = hovered === region.id;
          const isAgentLive = activeAgent === region.agent;
          const fillOp = Math.min(0.94, Math.max(0.08, 0.15 + score * 0.65 + (isAgentLive ? 0.12 : 0)));
          const strokeOp = Math.min(0.9, Math.max(0.08, 0.18 + score * 0.45));
          const glowOp = Math.min(0.55, Math.max(0.08, score * 0.18 + (isAgentLive ? 0.15 : 0)));
          const sc = isHov ? 1.1 : 1;

          return (
            <g
              key={region.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(region.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleClick(region)}
            >
              {score > 0.06 && (
                <ellipse
                  cx={region.cx}
                  cy={region.cy}
                  rx={region.rx + 22}
                  ry={region.ry + 16}
                  fill={region.color}
                  opacity={glowOp}
                  style={{ transition: "opacity 0.6s, transform 0.4s" }}
                >
                  {isAgentLive && (
                    <animate
                      attributeName="opacity"
                      values={`${glowOp * 0.45};${glowOp * 0.88};${glowOp * 0.45}`}
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  )}
                  {isAgentLive && (
                    <animate
                      attributeName="rx"
                      values={`${region.rx + 22};${region.rx + 30};${region.rx + 22}`}
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  )}
                </ellipse>
              )}

              
              <ellipse
                cx={region.cx}
                cy={region.cy}
                rx={region.rx * sc}
                ry={region.ry * sc}
                fill={region.color}
                fillOpacity={fillOp}
                stroke={region.color}
                strokeWidth={isHov ? 1.4 : 0.7}
                strokeOpacity={strokeOp}
                filter={score > 0.25 ? `url(#glow-${region.id})` : undefined}
                style={{ transition: "all 0.35s ease" }}
              />

              
              {isAgentLive && (
                <ellipse
                  cx={region.cx}
                  cy={region.cy}
                  rx={region.rx}
                  ry={region.ry}
                  fill="none"
                  stroke={region.color}
                  strokeWidth="1.2"
                  opacity="0"
                >
                  <animate
                    attributeName="rx"
                    values={`${region.rx};${region.rx + 22};${region.rx + 32}`}
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="ry"
                    values={`${region.ry};${region.ry + 15};${region.ry + 22}`}
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.35;0.08;0"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              )}
              
              {score > 0 && (
                <text
                  x={region.cx}
                  y={region.cy + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                  fontWeight="500"
                  fill={region.color}
                  opacity={0.9}
                  style={{ transition: "opacity 0.4s" }}
                >
                  {Math.round(score * 100)}
                </text>
              )}

              
              <text
                x={region.cx}
                y={region.cy - region.ry - 12}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-dm-sans), sans-serif"
                fontWeight="500"
                fill="rgba(255,255,255,0.4)"
                letterSpacing="0.4"
              >
                {region.label}
              </text>

              
              <text
                x={region.cx}
                y={region.cy - region.ry - 24}
                textAnchor="middle"
                fontSize="7"
                fontFamily="var(--font-jetbrains-mono), monospace"
                fill={isAgentLive ? region.color : "rgba(255,255,255,0.15)"}
                letterSpacing="1.2"
                style={{ transition: "fill 0.4s", textTransform: "uppercase" } as CSSProperties}
              >
                {region.agent.toUpperCase()}
              </text>
            </g>
          );
        })}

        
        <g clipPath="url(#brain-clip)">
          <rect x="50" y="0" width="420" height="70" fill="url(#scanline)" opacity="0.45">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 -20; 0 350; 0 -20"
              dur="10s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
        
        <text
          x="490"
          y="392"
          textAnchor="end"
          fontSize="7"
          fontFamily="var(--font-jetbrains-mono), monospace"
          fill="rgba(255,255,255,0.12)"
        >
          MNI152 Â· Lateral
        </text>
      </svg>

      
      {Object.entries(classifications).map(([regionId, label]) => {
        const region = REGIONS.find((r) => r.id === regionId);
        if (!region) return null;
        const { bg, fg } = classifStyle(label);
        return (
          <div
            key={`cls-${regionId}`}
            className="absolute rounded-full px-1.5 py-[1px] pointer-events-none"
            style={{
              left: `${(region.cx / 500) * 100}%`,
              top: `${((region.cy + region.ry + 10) / 400) * 100}%`,
              transform: "translateX(-50%)",
              background: bg,
              color: fg,
              fontSize: "8px",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontWeight: 500,
              letterSpacing: "0.5px",
              border: `1px solid ${fg}22`,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
        );
      })}

      
      {hovered &&
        (() => {
          const region = REGIONS.find((r) => r.id === hovered);
          if (!region) return null;
          const score = activations[region.id] ?? 0;
          const classif = classifications[region.id];

          const goLeft = region.cx > 340;
          const cardLeft = goLeft
            ? `${((region.cx - region.rx - 150) / 500) * 100}%`
            : `${((region.cx + region.rx + 18) / 500) * 100}%`;
          const cardTop = `${((region.cy - 35) / 400) * 100}%`;

          return (
            <div
              className="absolute z-30 w-[152px] rounded-xl border pointer-events-none"
              style={{
                left: cardLeft,
                top: cardTop,
                background: "rgba(6,8,14,0.94)",
                borderColor: `${region.color}25`,
                backdropFilter: "blur(16px)",
                boxShadow: `0 0 24px ${region.color}12, 0 8px 32px rgba(0,0,0,0.5)`,
                padding: "10px 12px",
              }}
            >
              
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{
                    background: region.color,
                    boxShadow: `0 0 8px ${region.color}`,
                  }}
                />
                <span
                  className="text-[11px] font-semibold tracking-tight"
                  style={{
                    color: region.color,
                    fontFamily: "var(--font-syne), sans-serif",
                  }}
                >
                  {region.label}
                </span>
              </div>

              
              <div
                className="space-y-[5px]"
                style={{
                  fontSize: "9px",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                }}
              >
                <Row label="Agent" value={region.agent} color="rgba(255,255,255,0.65)" />
                <Row
                  label="Score"
                  value={score > 0 ? `${Math.round(score * 100)}%` : "â€”"}
                  color={score > 0 ? region.color : "rgba(255,255,255,0.3)"}
                />
                <Row label="MNI" value={region.mni.join(", ")} color="rgba(255,255,255,0.45)" />
                {classif && (
                  <Row
                    label="Status"
                    value={classif}
                    color={classifStyle(classif).fg}
                  />
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "rgba(255,255,255,0.25)" }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

export { REGIONS };
