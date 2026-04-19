"use client";
import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HistoryEntry } from "@/hooks/useSessionHistory";
import { ProfileRadarChart } from "@/components/profile-radar-chart";
import {
  IconBrain,
  IconActivity,
  IconChartBar,
  IconAlertCircle,
  IconSparkles,
  IconMicrophone,
  IconTextCaption,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from "@tabler/icons-react";

const DOMAINS = [
  { key: "lexical",   label: "Lexical",   color: "#3b82f6", desc: "Vocabulary richness, lexical density, filler rate",   region: "Broca's area"    },
  { key: "semantic",  label: "Semantic",  color: "#10b981", desc: "Coherence, idea density, tangentiality",               region: "Wernicke's area" },
  { key: "prosody",   label: "Prosody",   color: "#f59e0b", desc: "Speech rate, pause frequency, hesitation",             region: "SMA"             },
  { key: "syntax",    label: "Syntax",    color: "#8b5cf6", desc: "Sentence complexity, clause depth, passive ratio",     region: "DLPFC"           },
  { key: "affective", label: "Affective", color: "#ef4444", desc: "Valence, arousal, certainty",                          region: "Amygdala"        },
] as const;

type Domain = (typeof DOMAINS)[number];

const RISK_CONFIG = {
  low:      { label: "Low",      color: "#1D9E75", bg: "rgba(29,158,117,0.12)",  border: "rgba(29,158,117,0.25)"  },
  moderate: { label: "Moderate", color: "#BA7517", bg: "rgba(186,117,23,0.12)",  border: "rgba(186,117,23,0.25)"  },
  high:     { label: "High",     color: "#D85A30", bg: "rgba(216,90,48,0.12)",   border: "rgba(216,90,48,0.25)"   },
  unknown:  { label: "—",        color: "#7e8fa6", bg: "rgba(126,143,166,0.10)", border: "rgba(126,143,166,0.20)" },
};

function relativeTime(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function shortDate(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function dominantDomain(entries: HistoryEntry[]): Domain {
  const avgs = DOMAINS.map((d) => ({
    domain: d,
    avg: avg(entries.map((e) => e.scores[d.key] ?? 0)),
  }));
  return avgs.reduce((best, curr) => (curr.avg > best.avg ? curr : best)).domain;
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}
{}
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--nt-glass-hi)",
        border: "1px solid var(--nt-glass-border)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "var(--nt-glass-shadow)",
        minWidth: 140,
      }}
    >
      <div
        style={{
          color: "var(--nt-text-xs)",
          fontSize: 9,
          fontFamily: "var(--font-jetbrains-mono)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Session {label}
      </div>
      {payload.map((p) => {
        const domain = DOMAINS.find((d) => d.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: domain?.color ?? p.color }} />
              <span style={{ color: "var(--nt-text-lo)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>
                {domain?.label ?? p.dataKey}
              </span>
            </div>
            <span
              style={{
                color: "var(--nt-text-hi)",
                fontSize: 11,
                fontFamily: "var(--font-jetbrains-mono)",
                fontWeight: 600,
              }}
            >
              {p.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
const GLASS: React.CSSProperties = {
  background: "var(--nt-glass)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  borderRadius: 16,
};

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  icon: React.ReactNode;
  delay?: number;
  trend?: "up" | "down" | "flat";
}

function KpiCard({ label, value, sub, accentColor, icon, delay = 0, trend }: KpiCardProps) {
  const TrendIcon = trend === "up" ? IconTrendingUp : trend === "down" ? IconTrendingDown : IconMinus;
  const trendColor = trend === "up" ? "#1D9E75" : trend === "down" ? "#D85A30" : "var(--nt-text-ghost)";

  return (
    <div
      className="animate-fade-up flex flex-col gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-2xl relative overflow-hidden min-w-0 min-h-[104px] sm:min-h-[118px]"
      style={{ ...GLASS, animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {accentColor && (
        <div
          className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
          style={{
            background: accentColor,
            opacity: 0.07,
            transform: "translate(40%, -40%)",
            filter: "blur(20px)",
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <span
          style={{
            color: "var(--nt-text-xs)",
            fontSize: 8,
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <div style={{ color: accentColor ?? "var(--nt-icon)", opacity: 0.7 }}>{icon}</div>
      </div>
      <div className="flex items-end gap-2 min-w-0">
        <span
          className="truncate"
          style={{
            color: accentColor ?? "var(--nt-text-hi)",
            fontSize: "clamp(18px, 5.2vw, 28px)",
            fontFamily: "var(--font-jetbrains-mono)",
            fontWeight: 700,
            lineHeight: 1,
            minWidth: 0,
          }}
        >
          {value}
        </span>
        {trend && (
          <TrendIcon size={14} style={{ color: trendColor, marginBottom: 2 }} />
        )}
      </div>

      {sub && (
        <span className="truncate block" style={{ color: "var(--nt-text-xs)", fontSize: 9, fontFamily: "var(--font-dm-sans)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}
{}
function RiskBadge({ level }: { level?: string }) {
  const cfg = RISK_CONFIG[(level as keyof typeof RISK_CONFIG) ?? "unknown"] ?? RISK_CONFIG.unknown;
  return (
    <span
      className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontFamily: "var(--font-jetbrains-mono)",
      }}
    >
      {cfg.label}
    </span>
  );
}

function DomainBar({ domain, score, delay = 0 }: { domain: Domain; score: number; delay?: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="animate-fade-up flex items-center gap-2 sm:gap-3" style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}>
      <div style={{ width: 52, color: "var(--nt-text-lo)", fontSize: 10, fontFamily: "var(--font-dm-sans)", flexShrink: 0 }} className="sm:w-16">
        {domain.label}
      </div>
      <div
        className="relative h-1.5 rounded-full overflow-hidden flex-1"
        style={{ background: "var(--nt-track)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${domain.color}aa, ${domain.color})`,
            boxShadow: `0 0 6px ${domain.color}55`,
          }}
        />
      </div>
      <span
        className="tabular-nums w-5 sm:w-7"
        style={{ textAlign: "right", color: domain.color, fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", flexShrink: 0 }}
      >
        {pct}
      </span>
    </div>
  );
}
function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center animate-fade-up">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center animate-brain-glow"
        style={{ background: "var(--nt-track)", border: "1px solid var(--nt-divider)" }}
      >
        <IconBrain size={36} style={{ color: "var(--nt-text-xs)" }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span
          style={{
            color: "var(--nt-text-hi)",
            fontSize: 18,
            fontFamily: "var(--font-syne)",
            fontWeight: 600,
          }}
        >
          No analyses yet
        </span>
        <span style={{ color: "var(--nt-text-lo)", fontSize: 13, maxWidth: 320 }}>
          Run your first cognitive analysis to see biomarker trends, domain breakdowns, and your neurological profile.
        </span>
      </div>
      <button
        onClick={onStart}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
        style={{
          background: "var(--nt-btn-bg)",
          color: "var(--nt-btn-fg)",
          fontFamily: "var(--font-dm-sans)",
        }}
      >
        <IconSparkles size={15} />
        Start first analysis
      </button>
    </div>
  );
}

interface MissionControlViewProps {
  entries: HistoryEntry[];
  onStartAnalysis: () => void;
}

export function MissionControlView({ entries, onStartAnalysis }: MissionControlViewProps) {
  const latest = entries[0];

  const chartData = useMemo(() =>
    [...entries].reverse().slice(-12).map((entry, i) => ({
      session: i + 1,
      lexical:   Math.round((entry.scores.lexical   ?? 0) * 100),
      semantic:  Math.round((entry.scores.semantic  ?? 0) * 100),
      prosody:   Math.round((entry.scores.prosody   ?? 0) * 100),
      syntax:    Math.round((entry.scores.syntax    ?? 0) * 100),
      affective: Math.round((entry.scores.affective ?? 0) * 100),
    }))
  , [entries]);
  const avgLoad = useMemo(() =>
    Math.round(avg(entries.map((e) => (e.report.overall_cognitive_load ?? 0) * 100)))
  , [entries]);

  const topDomain = useMemo(() => dominantDomain(entries), [entries]);

  const riskCounts = useMemo(() => {
    const counts = { low: 0, moderate: 0, high: 0 };
    entries.forEach((e) => {
      const r = e.report.risk_level as keyof typeof counts;
      if (r in counts) counts[r]++;
    });
    return counts;
  }, [entries]);

  const riskTrend = useMemo((): "up" | "down" | "flat" => {
    if (entries.length < 2) return "flat";
    const recent = entries.slice(0, 3).map((e) => e.report.overall_cognitive_load ?? 0);
    const older  = entries.slice(3, 6).map((e) => e.report.overall_cognitive_load ?? 0);
    if (!older.length) return "flat";
    const delta = avg(recent) - avg(older);
    if (delta > 0.05) return "up";
    if (delta < -0.05) return "down";
    return "flat";
  }, [entries]);

  const latestRisk = latest?.report?.risk_level;
  const riskCfg    = RISK_CONFIG[(latestRisk as keyof typeof RISK_CONFIG) ?? "unknown"] ?? RISK_CONFIG.unknown;

  if (!entries.length) {
    return (
      <div className="absolute inset-0">
        <EmptyState onStart={onStartAnalysis} />
      </div>
    );
  }
{}
  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden" style={{ padding: "12px 14px 18px" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 animate-fade-up" style={{ animationFillMode: "both" }}>
        <div>
          <h1
            style={{
              color: "var(--nt-text-hi)",
              fontSize: 18,
              fontFamily: "var(--font-syne)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Cognitive Dashboard
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11, fontFamily: "var(--font-dm-sans)", marginTop: 1 }}>
            {entries.length} session{entries.length !== 1 ? "s" : ""} recorded · last updated {relativeTime(latest.timestamp)}
          </p>
        </div>
        <button
          onClick={onStartAnalysis}
          className="w-full sm:w-auto justify-center sm:justify-start flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-95"
          style={{
            background: "var(--nt-btn-bg)",
            color: "var(--nt-btn-fg)",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          <IconSparkles size={13} />
          New analysis
        </button>
      </div>
      <div className="grid grid-cols-1 min-[560px]:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 mb-3">
        <KpiCard
          label="Total Sessions"
          value={entries.length}
          sub="analyses stored"
          accentColor="#3b82f6"
          icon={<IconChartBar size={16} />}
          delay={60}
        />
        <KpiCard
          label="Avg Cognitive Load"
          value={`${avgLoad}%`}
          sub="across all sessions"
          accentColor="#8b5cf6"
          icon={<IconActivity size={16} />}
          delay={120}
          trend={riskTrend}
        />
        <KpiCard
          label="Dominant Domain"
          value={topDomain.label}
          sub={topDomain.region}
          accentColor={topDomain.color}
          icon={<IconBrain size={16} />}
          delay={180}
        />
        <KpiCard
          label="Latest Risk"
          value={riskCfg.label}
          sub={`${riskCounts.high}H · ${riskCounts.moderate}M · ${riskCounts.low}L`}
          accentColor={riskCfg.color}
          icon={<IconAlertCircle size={16} />}
          delay={240}
        />
      </div>
{}
      <div className="grid gap-3 mb-3 xl:grid-cols-[minmax(0,1fr)_260px]">

        <div
          className="animate-fade-up rounded-2xl p-3 sm:p-4"
          style={{ ...GLASS, animationDelay: "300ms", animationFillMode: "both" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div
                style={{
                  color: "var(--nt-text-hi)",
                  fontSize: 13,
                  fontFamily: "var(--font-syne)",
                  fontWeight: 600,
                }}
              >
                Biomarker Trend
              </div>
              <div style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)", marginTop: 1 }}>
                Domain scores across sessions (0 – 100)
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {DOMAINS.map((d) => (
                <div key={d.key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span style={{ color: "var(--nt-text-xs)", fontSize: 9, fontFamily: "var(--font-dm-sans)" }}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[168px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                {DOMAINS.map((d) => (
                  <linearGradient key={d.key} id={`grad-${d.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor={d.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={d.color} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="var(--nt-divider)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="session"
                tick={{ fontSize: 9, fill: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `S${v}`}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}
                tickLine={false}
                axisLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--nt-divider)", strokeWidth: 1 }} />
              {DOMAINS.map((d) => (
                <Area
                  key={d.key}
                  type="monotone"
                  dataKey={d.key}
                  stroke={d.color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${d.key})`}
                  dot={false}
                  activeDot={{ r: 3, fill: d.color, strokeWidth: 0 }}
                />
              ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="animate-fade-up rounded-2xl p-3 sm:p-4 flex flex-col min-h-[252px]"
          style={{ ...GLASS, animationDelay: "360ms", animationFillMode: "both" }}
        >
          <div
            style={{
              color: "var(--nt-text-hi)",
              fontSize: 13,
              fontFamily: "var(--font-syne)",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            Cognitive Profile
          </div>
          <div style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)", marginBottom: 8 }}>
            Latest session
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[170px] sm:min-h-[188px]">
            <ProfileRadarChart scores={latest?.scores} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2.5" style={{ borderTop: "1px solid var(--nt-divider)" }}>
            <RiskBadge level={latest?.report?.risk_level} />
            <div className="flex items-center gap-1.5">
              <span style={{ color: "var(--nt-text-xs)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}>LOAD</span>
              <span
                style={{
                  color: "var(--nt-text-hi)",
                  fontSize: 14,
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontWeight: 700,
                }}
              >
                {Math.round((latest?.report?.overall_cognitive_load ?? 0) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
{}
      <div className="grid gap-3 lg:grid-cols-2">

        <div
          className="animate-fade-up rounded-2xl p-3 sm:p-4"
          style={{ ...GLASS, animationDelay: "420ms", animationFillMode: "both" }}
        >
          <div
            style={{
              color: "var(--nt-text-hi)",
              fontSize: 13,
              fontFamily: "var(--font-syne)",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            Domain Breakdown
          </div>
          <div style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)", marginBottom: 14 }}>
            Latest session scores
          </div>

          <div className="flex flex-col gap-3">
            {DOMAINS.map((d, i) => (
              <div key={d.key} className="flex flex-col gap-1.5">
                <DomainBar
                  domain={d}
                  score={latest?.scores[d.key] ?? 0}
                  delay={440 + i * 40}
                />
                <div className="pl-0 sm:pl-[67px] leading-tight whitespace-normal break-words" style={{ color: "var(--nt-text-ghost)", fontSize: 9, fontFamily: "var(--font-dm-sans)" }}>
                  {d.desc}
                </div>
              </div>
            ))}
          </div>
          {latest?.report?.risk_indicators?.length ? (
            <div className="mt-4 pt-3.5" style={{ borderTop: "1px solid var(--nt-divider)" }}>
              <div
                style={{
                  color: "var(--nt-text-xs)",
                  fontSize: 9,
                  fontFamily: "var(--font-jetbrains-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Risk Indicators
              </div>
              <div className="flex flex-col gap-2">
                {latest.report.risk_indicators.slice(0, 3).map((ri, i) => {
                  const sev = ri.severity === "high" ? "#D85A30" : ri.severity === "moderate" ? "#BA7517" : "#1D9E75";
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: sev }} />
                      <span
                        className="whitespace-normal break-words"
                        style={{ color: "var(--nt-text-lo)", fontSize: 10, fontFamily: "var(--font-dm-sans)", lineHeight: 1.5 }}
                      >
                        {ri.indicator}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="animate-fade-up rounded-2xl p-3 sm:p-4"
          style={{ ...GLASS, animationDelay: "480ms", animationFillMode: "both" }}
        >
          <div
            style={{
              color: "var(--nt-text-hi)",
              fontSize: 13,
              fontFamily: "var(--font-syne)",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            Recent Sessions
          </div>
          <div style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)", marginBottom: 12 }}>
            Last {Math.min(entries.length, 8)} analyses
          </div>
          <div className="flex flex-col gap-1 max-h-[340px] sm:max-h-[300px] lg:max-h-[256px] overflow-y-auto pr-0.5">
            {entries.slice(0, 8).map((entry, i) => {
              const load = Math.round((entry.report.overall_cognitive_load ?? 0) * 100);
              const isFirst = i === 0;
              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2.5 px-2.5 sm:px-3 py-2 rounded-xl transition-colors duration-150 min-w-0"
                  style={{
                    background: isFirst ? "var(--nt-active)" : "transparent",
                    border: isFirst ? "1px solid var(--nt-glass-border)" : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "var(--nt-track)" }}
                  >
                    {entry.inputType === "transcript"
                      ? <IconMicrophone size={13} style={{ color: "var(--nt-text-lo)" }} />
                      : <IconTextCaption size={13} style={{ color: "var(--nt-text-lo)" }} />}
                  </div>

                  <div className="flex-1 min-w-0 basis-full sm:basis-auto">
                    <div
                      className="whitespace-normal break-words leading-snug"
                      style={{ color: "var(--nt-text-md)", fontSize: 10.5, fontFamily: "var(--font-dm-sans)" }}
                    >
                      {entry.inputSnippet || "—"}
                    </div>
                    <div className="whitespace-normal" style={{ color: "var(--nt-text-xs)", fontSize: 8.5, fontFamily: "var(--font-jetbrains-mono)", marginTop: 1 }}>
                      {shortDate(entry.timestamp)} · {relativeTime(entry.timestamp)}
                    </div>
                  </div>
{}
                  <div className="w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 shrink-0 max-w-full ml-0 sm:ml-auto mt-1 sm:mt-0">
                    <RiskBadge level={entry.report?.risk_level} />
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-12 sm:w-16 h-0.5 rounded-full overflow-hidden"
                        style={{ background: "var(--nt-track)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${load}%`,
                            background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`,
                          }}
                        />
                      </div>
                      <span style={{ color: "var(--nt-text-lo)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)", width: 24, textAlign: "right" }}>
                        {load}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3.5" style={{ borderTop: "1px solid var(--nt-divider)" }}>
            <div
              style={{
                color: "var(--nt-text-xs)",
                fontSize: 9,
                fontFamily: "var(--font-jetbrains-mono)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Risk Distribution
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {(["low", "moderate", "high"] as const).map((level) => {
                const cfg = RISK_CONFIG[level];
                const count = riskCounts[level];
                const pct = entries.length ? Math.round((count / entries.length) * 100) : 0;
                return (
                  <div key={level} className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: cfg.color, fontSize: 9, fontFamily: "var(--font-dm-sans)" }}>{cfg.label}</span>
                      <span style={{ color: "var(--nt-text-lo)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}>
                        {count}
                      </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: cfg.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
