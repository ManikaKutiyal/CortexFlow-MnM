"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LaunchSequence } from "@/components/launch-sequence";
import { AuthPanel } from "@/components/auth-panel";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { InputCommandPanel, type AnalysisInput, type WordTimestamp } from "@/components/input-command-panel";
import type { CognitiveReport } from "@/components/cognition-report-panel";
import PrismSurface from "@/components/prism-surface";
import type { SignalRegionActivation } from "@/components/signal-field-viewer";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useColorMode } from "@/hooks/useColorMode";
import { isLowPowerDevice } from "@/libs/device-performance";



const CORTEX_REGIONS: SignalRegionActivation[] = [
  { region: "Broca's area", mni: [-44, 20, 8], activation: 0.72, agent: "Lexical" },
  { region: "Wernicke's area", mni: [-54, -40, 14], activation: 0.58, agent: "Semantic" },
  { region: "DLPFC", mni: [-46, 20, 32], activation: 0.83, agent: "Syntax" },
  { region: "SMA", mni: [0, -4, 60], activation: 0.44, agent: "Prosody" },
  { region: "Amygdala", mni: [-24, -4, -22], activation: 0.31, agent: "Affective" },
];

const AGENT_KEY: Record<string, string> = {
  Lexical: "lexical", Semantic: "semantic",
  Prosody: "prosody", Syntax: "syntax", Affective: "affective",
};

function scoreColor(v: number) {
  if (v > 75) return "#D85A30";
  if (v > 50) return "#BA7517";
  if (v > 25) return "#1D9E75";
  return "#888780";
}



const SignalFieldViewer = dynamic(() => import("@/components/signal-field-viewer"), { ssr: false });
const FluidNoiseBg = dynamic(() => import("@/components/fluid-noise-bg"), { ssr: false });
const MissionControlView = dynamic(
  () => import("@/components/mission-control-view").then((mod) => mod.MissionControlView),
  { ssr: false }
);
const SessionHistoryPanel = dynamic(
  () => import("@/components/session-history-panel").then((mod) => mod.SessionHistoryPanel),
  { ssr: false }
);
const CognitionReportPanel = dynamic(
  () => import("@/components/cognition-report-panel").then((mod) => mod.CognitionReportPanel),
  { ssr: false }
);
const AboutPanel = dynamic(
  () => import("@/components/about-panel").then((mod) => mod.AboutPanel),
  { ssr: false }
);
const SpeechWavePanel = dynamic(
  () => import("@/components/speech-wave-panel").then((mod) => mod.SpeechWavePanel),
  { ssr: false }
);



type AgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};



function BiomarkersPanel() {
  const biomarkers = [
    {
      id: "lexical",
      name: "Lexical Diversity",
      abbr: "LEX",
      agent: "Lexical",
      region: "Broca's Area",
      mni: "[-44, 20, 8]",
      description: "Vocabulary richness and word-choice variability across an utterance.",
      metrics: [
        { label: "TTR", desc: "Type-Token Ratio" },
        { label: "Density", desc: "Lexical Density" },
        { label: "Filler Rate", desc: "Filler Words / 100W" },
      ],
      clinical: "↓ diversity → aphasia, early dementia",
      color: "#ff6b6b",
    },
    {
      id: "semantic",
      name: "Semantic Coherence",
      abbr: "SEM",
      agent: "Semantic",
      region: "Wernicke's Area",
      mni: "[-54, -40, 14]",
      description: "Meaning connectivity and conceptual continuity across sentences.",
      metrics: [
        { label: "Coherence", desc: "Sentence-to-sentence similarity" },
        { label: "Idea Density", desc: "Propositions per word" },
        { label: "Tangentiality", desc: "Topic drift index" },
      ],
      clinical: "↓ coherence → schizophrenia, dementia",
      color: "#f59e0b",
    },
    {
      id: "syntax",
      name: "Syntactic Complexity",
      abbr: "SYN",
      agent: "Syntax",
      region: "DLPFC",
      mni: "[-46, 20, 32]",
      description: "Grammatical structure depth and sentence organisation patterns.",
      metrics: [
        { label: "MLU", desc: "Mean Length of Utterance" },
        { label: "Clause Depth", desc: "Embedding depth" },
        { label: "Passive Ratio", desc: "Passive voice usage" },
      ],
      clinical: "↓ complexity → cognitive impairment",
      color: "#00e5ff",
    },
    {
      id: "prosody",
      name: "Prosodic Features",
      abbr: "PRO",
      agent: "Prosody",
      region: "SMA",
      mni: "[0, -4, 60]",
      description: "Speech rhythm, timing, and intonation dynamics.",
      metrics: [
        { label: "WPM", desc: "Words per minute" },
        { label: "Pause Freq", desc: "Pauses per minute" },
        { label: "Hesitation", desc: "Filled pause ratio" },
      ],
      clinical: "↑ pauses + ↓ WPM → Parkinson's, depression",
      color: "#1d9e75",
    },
    {
      id: "affective",
      name: "Affective Markers",
      abbr: "AFF",
      agent: "Affective",
      region: "Amygdala",
      mni: "[-24, -4, -22]",
      description: "Emotional tone, arousal intensity, and affective expression.",
      metrics: [
        { label: "Valence", desc: "Positive–negative polarity" },
        { label: "Arousal", desc: "Activation level" },
        { label: "Certainty", desc: "Confidence markers" },
      ],
      clinical: "↓ valence + ↑ arousal → mood disorders",
      color: "#a855f7",
    },
  ];
  const GLASS: React.CSSProperties = {
    background: "var(--nt-glass)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--nt-glass-border)",
    boxShadow: "var(--nt-glass-shadow)",
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "16px 18px 24px" }}>
      { }
      <div className="mb-5">
        <div className="flex items-baseline gap-3 mb-1">
          <h1
            style={{
              color: "var(--nt-text-hi)",
              fontSize: 17,
              fontFamily: "var(--font-syne)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Cognitive Biomarkers
          </h1>
          <span
            style={{
              color: "var(--nt-text-ghost)",
              fontSize: 9,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            5 domains · 15 metrics
          </span>
        </div>
        <p style={{ color: "var(--nt-text-xs)", fontSize: 11, fontFamily: "var(--font-dm-sans)", lineHeight: 1.5 }}>
          Quantitative speech & language markers mapped to specific neural circuits.
        </p>
      </div>

      { }
      <div className="grid gap-2.5 md:grid-cols-2">
        {biomarkers.map((bm) => (
          <div
            key={bm.id}
            className="rounded-xl overflow-hidden flex flex-col"
            style={{ ...GLASS }}
          >
            { }
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid var(--nt-divider)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${bm.color}18`,
                  border: `1px solid ${bm.color}35`,
                }}
              >
                <span
                  style={{
                    color: bm.color,
                    fontSize: 9,
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  {bm.abbr}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    color: "var(--nt-text-hi)",
                    fontSize: 12,
                    fontFamily: "var(--font-syne)",
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {bm.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="px-1.5 py-px rounded text-[8px] font-semibold uppercase tracking-wide"
                    style={{ background: `${bm.color}15`, color: bm.color, fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {bm.agent}
                  </span>
                  <span style={{ color: "var(--nt-text-ghost)", fontSize: 8, fontFamily: "var(--font-jetbrains-mono)" }}>
                    {bm.region}
                  </span>
                </div>
              </div>
            </div>
            {/* Body */}
            <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
              {/* Description */}
              <p style={{ color: "var(--nt-text-lo)", fontSize: 10.5, fontFamily: "var(--font-dm-sans)", lineHeight: 1.55 }}>
                {bm.description}
              </p>

              {/* Metric chips */}
              <div className="flex flex-wrap gap-1">
                {bm.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{
                      background: "var(--nt-hover)",
                      border: "1px solid var(--nt-divider)",
                    }}
                    title={m.desc}
                  >
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ background: bm.color, opacity: 0.7 }} />
                    <span style={{ color: "var(--nt-text-lo)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Clinical note */}
              <div
                className="flex items-start gap-2 px-2.5 py-2 rounded-lg mt-auto"
                style={{ background: `${bm.color}0a`, border: `1px solid ${bm.color}18` }}
              >
                <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: bm.color }} />
                <span style={{ color: "var(--nt-text-xs)", fontSize: 9.5, fontFamily: "var(--font-dm-sans)", fontStyle: "italic", lineHeight: 1.5 }}>
                  {bm.clinical}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        className="mt-3 px-4 py-3 rounded-xl flex items-center gap-3"
        style={{ ...GLASS }}
      >
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: "linear-gradient(to bottom, #14b8a6, #f97316)" }} />
        <p style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)", lineHeight: 1.6 }}>
          All scores normalised 0–1 against healthy-population baselines. Higher scores indicate greater deviation.
          Biomarkers are extracted through a Groq-ready transcription layer and an optimized multi-agent analysis backend.
        </p>
      </div>
    </div>
  );
}
const REGION_MESH_CONFIG_COLORS: Record<string, string> = {
  "Broca's area": "#ff6b6b",
  "Wernicke's area": "#f59e0b",
  "DLPFC": "#00e5ff",
  "SMA": "#1d9e75",
  "Amygdala": "#ef4444",
};

const DEFAULT_REGIONS: SignalRegionActivation[] = [
  { region: "Broca's area", mni: [-44, 20, 8], activation: 0.72, agent: "Lexical" },
  { region: "Wernicke's area", mni: [-54, -40, 14], activation: 0.58, agent: "Semantic" },
  { region: "DLPFC", mni: [-46, 20, 32], activation: 0.83, agent: "Syntax" },
  { region: "SMA", mni: [0, -4, 60], activation: 0.44, agent: "Prosody" },
  { region: "Amygdala", mni: [-24, -4, -22], activation: 0.31, agent: "Affective" },
];

function CortexRegionsPanel() {
  const regions = [
    {
      id: "broca",
      name: "Broca's Area",
      ba: "BA 44/45",
      location: "Inferior Frontal Gyrus",
      lobe: "Frontal",
      mni: "−44, 20, 8",
      agent: "Lexical",
      agentColor: "#ff6b6b",
      function: "Speech production, phonological processing, lexical retrieval.",
      signal: "↓ activation → expressive aphasia, word-finding difficulty",
      tracts: ["Arcuate fasciculus", "IFOF"],
    },
    {
      id: "wernicke",
      name: "Wernicke's Area",
      ba: "BA 22",
      location: "Superior Temporal Gyrus",
      lobe: "Temporal",
      mni: "−54, −40, 14",
      agent: "Semantic",
      agentColor: "#f59e0b",
      function: "Language comprehension, semantic decoding, auditory word recognition.",
      signal: "↓ coherence → fluent but meaningless speech, receptive aphasia",
      tracts: ["Arcuate fasciculus", "SLF"],
    },
    {
      id: "dlpfc",
      name: "DLPFC",
      ba: "BA 9/46",
      location: "Dorsolateral Prefrontal Cortex",
      lobe: "Frontal",
      mni: "−46, 20, 32",
      agent: "Syntax",
      agentColor: "#00e5ff",
      function: "Working memory, cognitive control, syntactic rule application.",
      signal: "↑ syntactic load → DLPFC hyperdrive; ↓ activity → agrammatism",
      tracts: ["SLF II", "Cingulum"],
    },
    {
      id: "sma",
      name: "SMA",
      ba: "BA 6",
      location: "Supplementary Motor Area",
      lobe: "Frontal",
      mni: "0, −4, 60",
      agent: "Prosody",
      agentColor: "#1d9e75",
      function: "Speech motor planning, prosodic timing, pause & rhythm control.",
      signal: "↓ speech rate + ↑ hesitation → SMA hypofunction, Parkinson's",
      tracts: ["Corticospinal", "SMA–Broca loop"],
    },
    {
      id: "amygdala",
      name: "Amygdala",
      ba: "—",
      location: "Medial Temporal Lobe",
      lobe: "Limbic",
      mni: "−24, −4, −22",
      agent: "Affective",
      agentColor: "#ef4444",
      function: "Emotional salience, fear conditioning, affective language valence.",
      signal: "↑ arousal + ↓ valence → mood disorder, anxiety fingerprint",
      tracts: ["Uncinate fasciculus", "Amygdalofugal"],
    },
  ];
  const GLASS: React.CSSProperties = {
    background: "var(--nt-glass)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--nt-glass-border)",
    boxShadow: "var(--nt-glass-shadow)",
  };

  const [hoveredAtlasRegion, setHoveredAtlasRegion] = useState<SignalRegionActivation | null>(null);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "16px 18px 24px" }}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-baseline gap-3 mb-1">
          <h1
            style={{
              color: "var(--nt-text-hi)",
              fontSize: 17,
              fontFamily: "var(--font-syne)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Brain Regions
          </h1>
          <span
            style={{
              color: "var(--nt-text-ghost)",
              fontSize: 9,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            MNI152 · 5 regions
          </span>
        </div>
        <p style={{ color: "var(--nt-text-xs)", fontSize: 11, fontFamily: "var(--font-dm-sans)", lineHeight: 1.5 }}>
          Neural circuits that drive language and cognition, each mapped to a dedicated analysis agent.
        </p>
      </div>

      {/* 3D brain — same viewer as the analysis page */}
      <div
        className="rounded-xl mb-3 overflow-hidden relative"
        style={{ ...GLASS, height: "clamp(220px, 44vw, 280px)" }}
      >
        <SignalFieldViewer
          activations={DEFAULT_REGIONS}
          onRegionClick={(r) => setHoveredAtlasRegion(r)}
          showLabels
        />
        {/* Hint overlay */}
        <div
          className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none"
        >
          <span
            className="px-2 py-1 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.45)",
              color: "rgba(255,255,255,0.45)",
              fontSize: 9,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.06em",
            }}
          >
            hover to explore · drag to rotate
          </span>
        </div>
      </div>
      {/* Hovered region callout */}
      {hoveredAtlasRegion && (
        <div
          className="rounded-xl px-4 py-3 mb-3 flex items-center gap-3"
          style={{ ...GLASS, borderColor: "rgba(216,90,48,0.3)" }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: REGION_MESH_CONFIG_COLORS[hoveredAtlasRegion.region] ?? "#888" }}
          />
          <div className="flex-1 min-w-0">
            <span style={{ color: "var(--nt-text-hi)", fontSize: 12, fontFamily: "var(--font-syne)", fontWeight: 600 }}>
              {hoveredAtlasRegion.region}
            </span>
            <span style={{ color: "var(--nt-text-ghost)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)", marginLeft: 8 }}>
              MNI [{hoveredAtlasRegion.mni.join(", ")}]
            </span>
          </div>
          <span style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>
            {hoveredAtlasRegion.agent} agent
          </span>
        </div>
      )}

      {/* Region rows */}
      <div className="flex flex-col gap-2">
        {regions.map((r) => (
          <div
            key={r.id}
            className="rounded-xl overflow-hidden flex"
            style={{ ...GLASS }}
          >
            {/* Left accent bar */}
            <div
              className="w-1 shrink-0"
              style={{ background: r.agentColor }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0 px-4 py-3 grid gap-x-6 gap-y-2 md:grid-cols-[1fr_1.4fr]">
              {/* Left col: identity */}
              <div className="flex flex-col gap-1.5 justify-center">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      color: "var(--nt-text-hi)",
                      fontSize: 13,
                      fontFamily: "var(--font-syne)",
                      fontWeight: 700,
                    }}
                  >
                    {r.name}
                  </span>
                  <span
                    className="px-1.5 py-px rounded text-[8px] font-mono"
                    style={{ background: "var(--nt-hover)", color: "var(--nt-text-ghost)", border: "1px solid var(--nt-divider)" }}
                  >
                    {r.ba}
                  </span>
                </div>
                <div style={{ color: "var(--nt-text-xs)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>
                  {r.location} · {r.lobe} Lobe
                </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="px-2 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide"
                    style={{
                      background: `${r.agentColor}15`,
                      color: r.agentColor,
                      border: `1px solid ${r.agentColor}30`,
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    {r.agent} agent
                  </span>
                  <span
                    style={{
                      color: "var(--nt-text-ghost)",
                      fontSize: 8,
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}
                  >
                    MNI [{r.mni}]
                  </span>
                </div>

                {/* Tracts */}
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {r.tracts.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-px rounded text-[7.5px]"
                      style={{
                        background: "var(--nt-hover)",
                        color: "var(--nt-text-ghost)",
                        border: "1px solid var(--nt-divider)",
                        fontFamily: "var(--font-jetbrains-mono)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right col: function + signal */}
              <div
                className="flex flex-col gap-2 justify-center border-t pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4"
                style={{ borderColor: "var(--nt-divider)" }}
              >
                <p style={{ color: "var(--nt-text-lo)", fontSize: 11, fontFamily: "var(--font-dm-sans)", lineHeight: 1.55 }}>
                  {r.function}
                </p>
                <div
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
                  style={{ background: `${r.agentColor}0a`, border: `1px solid ${r.agentColor}18` }}
                >
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: r.agentColor }} />
                  <span
                    style={{
                      color: "var(--nt-text-xs)",
                      fontSize: 9.5,
                      fontFamily: "var(--font-dm-sans)",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    {r.signal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Pipeline note */}
      <div
        className="mt-3 rounded-xl px-4 py-3 grid gap-4 md:grid-cols-2"
        style={{ ...GLASS }}
      >
        <div>
          <div
            style={{
              color: "var(--nt-text-xs)",
              fontSize: 8.5,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Analysis Pipeline
          </div>
          <div className="flex flex-col gap-1">
            {["Speech/text → Groq Whisper", "Linguistic + semantic feature extraction", "Multi-agent cognitive inference", "MNI152 activation overlay"].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                  style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)" }}
                >
                  <span style={{ color: "var(--nt-text-ghost)", fontSize: 7, fontFamily: "var(--font-jetbrains-mono)" }}>{i + 1}</span>
                </div>
                <span style={{ color: "var(--nt-text-lo)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div
            style={{
              color: "var(--nt-text-xs)",
              fontSize: 8.5,
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Clinical Applications
          </div>
          <div className="flex flex-col gap-1">
            {["Early dementia & MCI detection", "ADHD & language disorder screening", "Depression vocal biomarkers", "Treatment response monitoring"].map((app, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--nt-text-ghost)" }} />
                <span style={{ color: "var(--nt-text-lo)", fontSize: 10, fontFamily: "var(--font-dm-sans)" }}>{app}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Processing steps overlay ────────────────────────────────────────────────

const STEP_REGIONS: Record<string, string> = {
  "STT preprocessor": "Whisper · Pause map",
  "Lexical agent": "Broca's area",
  "Semantic agent": "Wernicke's area",
  "Prosody agent": "SMA",
  "Syntax agent": "DLPFC",
  "Biomarker mapper": "MNI normalisation",
  "Report composer": "Claude claude-sonnet-4-6",
};

function ProcessingSteps({ steps, glass }: { steps: AgentStep[]; glass: React.CSSProperties }) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const totalCount = steps.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-3 animate-fade-up" style={{ animationFillMode: "both" }}>

      {/* Progress bar + label */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          style={{
            color: "var(--nt-text-xs)",
            fontSize: 9,
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Pipeline · {doneCount}/{totalCount} complete
        </span>
        <span style={{ color: "var(--nt-text-xs)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}>
          {pct}%
        </span>
      </div>
      <div className="h-px w-full rounded-full overflow-hidden mb-1" style={{ background: "var(--nt-track)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
        />
      </div>
      {/* Step rows */}
      <div className="rounded-2xl overflow-hidden" style={glass}>
        {steps.map((step, i) => {
          const isRunning = step.status === "running";
          const isDone = step.status === "done";
          const isError = step.status === "error";
          const region = STEP_REGIONS[step.name] ?? "";

          return (
            <div
              key={step.name}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-300 animate-fade-up"
              style={{
                animationDelay: `${i * 55}ms`,
                animationFillMode: "both",
                borderBottom: i < steps.length - 1 ? "1px solid var(--nt-divider)" : "none",
                background: isRunning ? "var(--nt-hover)" : "transparent",
              }}
            >
              {/* Status dot */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-amber" />
                )}
                {isDone && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isError && (
                  <span style={{ color: "#D85A30", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✕</span>
                )}
                {step.status === "pending" && (
                  <span className="w-1.5 h-1.5 rounded-full block" style={{ background: "var(--nt-track)" }} />
                )}
              </div>

              {/* Name + region */}
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: isRunning ? 600 : 400,
                    color: isRunning ? "var(--nt-text-hi)" : isDone ? "var(--nt-text-lo)" : "var(--nt-text-ghost)",
                    transition: "color 0.3s",
                  }}
                >
                  {step.name}
                </div>
                {region && (
                  <div style={{ fontSize: 9, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nt-text-ghost)", marginTop: 1 }}>
                    {region}
                  </div>
                )}
              </div>
              {/* Status tag */}
              <span
                className="shrink-0 text-[8px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-md"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  color: isRunning ? "#f59e0b" : isDone ? "#1D9E75" : isError ? "#D85A30" : "var(--nt-text-ghost)",
                  background: isRunning ? "rgba(245,158,11,0.10)" : isDone ? "rgba(29,158,117,0.08)" : "transparent",
                  border: isRunning ? "1px solid rgba(245,158,11,0.22)" : isDone ? "1px solid rgba(29,158,117,0.18)" : "1px solid transparent",
                  minWidth: 36,
                  textAlign: "center",
                }}
              >
                {isRunning ? "live" : isDone ? "done" : isError ? "err" : "·"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isDark, toggle: toggleTheme } = useColorMode();
  const {
    isReady: isAuthReady,
    isBusy: isAuthBusy,
    profile,
    idToken,
    checkSignInMethods,
    signInWithSocial,
    signInWithEmail,
    signUpWithEmail,
    logOut,
  } = useFirebaseAuth();

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isLowPowerClient, setIsLowPowerClient] = useState(true);
  const [mountedAuthBypass, setMountedAuthBypass] = useState(false);
  useEffect(() => setMountedAuthBypass(true), []);
  const isAuthenticated = Boolean(profile) || mountedAuthBypass;
  const {
    entries: historyEntries,
    addEntry,
    removeEntry,
    clearAll,
    reload: reloadHistory,
  } = useSessionHistory(idToken, isAuthenticated);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [activations, setActivations] = useState<SignalRegionActivation[]>(CORTEX_REGIONS);
  const [biomarkerScores, setBiomarkerScores] = useState<Record<string, number> | undefined>();
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[] | undefined>();
  const [audioDuration, setAudioDuration] = useState<number | undefined>();
  const [activePage, setActivePage] = useState("analysis");
  const [cognitiveReport, setCognitiveReport] = useState<CognitiveReport | undefined>();
  const [backendAwake, setBackendAwake] = useState(true); //ch
  const [splashCompleted, setSplashCompleted] = useState(false);
  const [isBootstrappingAccount, setIsBootstrappingAccount] = useState(false);

  const sidebarOpen = isMobileLayout ? mobileSidebarOpen : desktopSidebarOpen;

  const toggleSidebar = useCallback(() => {
    if (isMobileLayout) {
      setMobileSidebarOpen((open) => !open);
      return;
    }

    setDesktopSidebarOpen((open) => !open);
  }, [isMobileLayout]);

  const activeAgentName = useMemo(() => {
    const running = agentSteps.find((s) => s.status === "running");
    if (!running) return undefined;
    return { "Lexical agent": "Lexical", "Semantic agent": "Semantic", "Prosody agent": "Prosody", "Syntax agent": "Syntax" }[running.name];
  }, [agentSteps]);

  const isDashboardPage = activePage === "dashboard";
  const isHistoryPage = activePage === "history";
  const isReportsPage = activePage === "reports";
  const isBrainRegionsPage = activePage === "brain regions";
  const isBiomarkersPage = activePage === "biomarkers";
  const isAboutPage = activePage === "about";
  const isLibraryPage = isDashboardPage || isHistoryPage || isReportsPage || isBrainRegionsPage || isBiomarkersPage || isAboutPage;
  const topbarTitle = isAboutPage ? "About MnM" : "Cognitive Analysis";

  const showPhase2 = hasStarted && !isLoading && !isLibraryPage;
  const showPhase1 = !showPhase2 && !isLibraryPage;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (isDashboardPage || isHistoryPage || isReportsPage) {
      void reloadHistory();
    }
  }, [isAuthenticated, isDashboardPage, isHistoryPage, isReportsPage, reloadHistory]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: number | undefined;

    const probe = async () => {
      try {
        const res = await fetch("/api/wake-backend", { method: "GET", cache: "no-store" });
        const body = await res.json().catch(() => ({ ok: false }));

        if (isMounted && body.ok) {
          setBackendAwake(true);
          return;
        }
      } catch {
        // Keep probing until backend is available.
      }

      if (isMounted) {
        timeoutId = window.setTimeout(() => {
          void probe();
        }, 1600);
      }
    };

    void probe();

    return () => {
      isMounted = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const syncLayout = (matches: boolean) => {
      setIsMobileLayout(matches);
      if (!matches) {
        setMobileSidebarOpen(false);
      }
    };

    syncLayout(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => {
      syncLayout(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)");

    const sync = () => {
      setIsLowPowerClient(isLowPowerDevice());
    };

    sync();
    window.addEventListener("resize", sync);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => {
        window.removeEventListener("resize", sync);
        media.removeEventListener("change", sync);
      };
    }

    media.addListener(sync);
    return () => {
      window.removeEventListener("resize", sync);
      media.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("perf-lite", isLowPowerClient);
    return () => {
      document.documentElement.classList.remove("perf-lite");
    };
  }, [isLowPowerClient]);

  useEffect(() => {
    if (!isMobileLayout || !mobileSidebarOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileLayout, mobileSidebarOpen]);

  useEffect(() => {
    if (isMobileLayout) {
      setMobileSidebarOpen(false);
    }
  }, [activePage, isMobileLayout]);

  useEffect(() => {
    if (!idToken) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setIsBootstrappingAccount(true);
      try {
        await fetch("/api/account/bootstrap", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
      } catch {
        // Bootstrap failure should not block signed-in users from using the app.
      } finally {
        if (!cancelled) {
          setIsBootstrappingAccount(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [idToken]);

  // Shift+P toggles side panels (kept for power users)
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.shiftKey && e.key === "P") e.preventDefault(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const handleSubmit = useCallback(async (input: AnalysisInput) => {
    setHasStarted(true);
    setIsLoading(true);
    setBiomarkerScores(undefined);
    setCognitiveReport(undefined);
    setActivations(CORTEX_REGIONS);

    // Capture word timestamps from voice recording
    if (input.type === "transcript") {
      setWordTimestamps(input.wordTimestamps);
      setAudioDuration(input.duration);
    } else {
      setWordTimestamps(undefined);
      setAudioDuration(undefined);
    }

    setAgentSteps([
      { name: "STT preprocessor", status: "running" },
      { name: "Lexical agent", status: "pending" },
      { name: "Semantic agent", status: "pending" },
      { name: "Prosody agent", status: "pending" },
      { name: "Syntax agent", status: "pending" },
      { name: "Biomarker mapper", status: "pending" },
      { name: "Report composer", status: "pending" },
    ]);

    try {
      const body =
        input.type === "text"
          ? { input_value: input.content, ...(sessionId ? { session_id: sessionId } : {}) }
          : input.type === "transcript"
            ? {
              transcript: input.content,
              pause_map: input.pauseMap,
              audio_duration: input.duration,
              ...(sessionId ? { session_id: sessionId } : {}),
            }
            : null;
      if (!body) { setIsLoading(false); return; }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let detail = `Analysis request failed (${res.status}).`;
        try {
          const payload = await res.json();
          const raw = payload?.error ?? payload?.detail;
          if (typeof raw === "string" && raw.trim()) {
            detail = raw.trim();
          }
        } catch {
          const text = await res.text();
          if (text.trim()) detail = text.trim();
        }

        setAgentSteps((prev) => prev.map((s) => ({
          ...s,
          status: s.status === "done" ? s.status : "error",
          detail: s.name === "STT preprocessor" ? detail : s.detail,
        })));
        return;
      }

      if (!res.body) {
        setAgentSteps((prev) => prev.map((s) => ({
          ...s,
          status: s.status === "done" ? s.status : "error",
          detail: s.name === "STT preprocessor" ? "Empty analysis stream from server." : s.detail,
        })));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let finalScores: Record<string, number> | null = null;
      let finalReport: CognitiveReport | null = null;
      let finalSessionId = sessionId ?? "";
      let didPersistHistory = false;

      const normalizeScores = (rawScores: Record<string, number | { overall: number }>) => {
        const scores: Record<string, number> = {};
        for (const [key, val] of Object.entries(rawScores)) {
          scores[key] = typeof val === "number" ? val : val.overall;
        }
        return scores;
      };

      const persistHistory = () => {
        if (didPersistHistory || !finalScores || !finalReport) {
          return;
        }

        didPersistHistory = true;

        void addEntry({
          inputType: input.type === "transcript" ? "transcript" : "text",
          inputSnippet: ("content" in input ? input.content : "").slice(0, 300),
          scores: finalScores,
          report: finalReport,
          sessionId: finalSessionId,
          wordTimestamps: input.type === "transcript" ? input.wordTimestamps : undefined,
          audioDuration: input.type === "transcript" ? input.duration : undefined,
        });
      };

      const processLine = (line: string) => {
        const t = line.trim();
        if (!t) return;
        try {
          const ev = JSON.parse(t);
          if (ev.type === "step" && ev.step) {
            setAgentSteps((prev) => prev.map((s) => s.name === ev.step.name ? { ...s, status: ev.step.status, detail: ev.step.detail } : s));
          } else if (ev.type === "end") {
            if (ev.session_id) {
              finalSessionId = ev.session_id;
              setSessionId(ev.session_id);
            }

            if (ev.report) {
              finalReport = ev.report as CognitiveReport;
              setCognitiveReport(finalReport);
            }

            if (ev.scores) {
              console.log("RAW SCORES:", ev.scores);
              // Handle both flat ({ lexical: 0.72 }) and nested ({ lexical: { overall: 0.72 } }) shapes
              const raw = ev.scores as Record<string, number | { overall: number }>;
              const scores = normalizeScores(raw);
              finalScores = scores;
              setBiomarkerScores(scores);
              setActivations(CORTEX_REGIONS.map((r) => ({ ...r, activation: scores[AGENT_KEY[r.agent]] ?? r.activation })));
            }

            persistHistory();
            setAgentSteps((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
          } else if (ev.type === "report" && ev.report) {
            finalReport = ev.report as CognitiveReport;
            setCognitiveReport(finalReport);
            persistHistory();
          } else if (ev.type === "scores" && ev.scores) {
            const raw = ev.scores as Record<string, number | { overall: number }>;
            const scores = normalizeScores(raw);
            finalScores = scores;
            setBiomarkerScores(scores);
            setActivations(CORTEX_REGIONS.map((r) => ({ ...r, activation: scores[AGENT_KEY[r.agent]] ?? r.activation })));
            persistHistory();
          } else if (ev.type === "error") {
            const detail = typeof ev.message === "string" && ev.message.trim() ? ev.message.trim() : undefined;
            setAgentSteps((prev) => prev.map((s) => s.status === "running"
              ? { ...s, status: "error" as const, ...(detail ? { detail } : {}) }
              : s));
          }
        } catch { /* skip */ }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
      }
      if (buffer.trim()) processLine(buffer);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, addEntry]);

  // ── Restore a history entry ──────────────────────────────────────────────────
  const handleRestore = useCallback((entry: import("@/hooks/useSessionHistory").HistoryEntry) => {
    setHasStarted(true);
    setBiomarkerScores(entry.scores);
    setCognitiveReport(entry.report);
    setWordTimestamps(entry.wordTimestamps);
    setAudioDuration(entry.audioDuration);
    setActivations(CORTEX_REGIONS.map((r) => ({ ...r, activation: entry.scores[AGENT_KEY[r.agent]] ?? r.activation })));
    setAgentSteps([]);
    setActivePage("analysis");
  }, []);

  const handleLogout = useCallback(() => {
    void logOut();
    setActivePage("analysis");
    setHasStarted(false);
    setIsLoading(false);
    setSessionId(null);
    setAgentSteps([]);
    setBiomarkerScores(undefined);
    setCognitiveReport(undefined);
    setActivations(CORTEX_REGIONS);
    setWordTimestamps(undefined);
    setAudioDuration(undefined);
  }, [logOut]);

  // ── Shared glass style ──────────────────────────────────────────────────────
  const glassStyle: React.CSSProperties = {
    background: "var(--nt-glass)",
    backdropFilter: "blur(18px)",
    border: "1px solid var(--nt-glass-border)",
    boxShadow: "var(--nt-glass-shadow)",
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <LaunchSequence readyToFade={backendAwake} onFadeComplete={() => setSplashCompleted(true)} />

      {/* Smooth animated background inspired by the original style */}
      <div className="fixed inset-0 z-0 h-[100dvh] w-full">
        <FluidNoiseBg
          isDark={isDark}
          forceLowPower={isLowPowerClient && isMobileLayout}
          keepDesktopTexture
        />
      </div>

      {/* Readability layer over animated background */}
      <div
        className="fixed inset-0 z-[5] pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(3,13,22,0.62) 0%, rgba(3,13,22,0.4) 48%, rgba(3,13,22,0.76) 100%)"
            : "linear-gradient(180deg, rgba(245,250,253,0.68) 0%, rgba(245,250,253,0.42) 48%, rgba(245,250,253,0.78) 100%)",
        }}
      />
      {/* App shell */}
      <div
        className="relative z-10 flex h-[100dvh] w-full transition-opacity duration-300"
        style={{ opacity: isAuthenticated ? 1 : 0, pointerEvents: isAuthenticated ? "auto" : "none" }}
      >
        {isMobileLayout && sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className={`absolute inset-0 z-20 ${isLowPowerClient ? "bg-black/30" : "bg-black/30 backdrop-blur-[1px]"}`}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar — animated width wrapper clips the panel in/out */}
        <div
          className={isMobileLayout ? "absolute bottom-0 left-0 top-0 z-30 overflow-hidden" : "shrink-0 overflow-hidden"}
          style={{
            width: isMobileLayout ? 240 : sidebarOpen ? 240 : 0,
            transform: isMobileLayout ? (sidebarOpen ? "translateX(0)" : "translateX(-105%)") : "translateX(0)",
            pointerEvents: isMobileLayout ? (sidebarOpen ? "auto" : "none") : "auto",
            transition: isMobileLayout
              ? "transform 240ms cubic-bezier(0.4, 0, 0.2, 1)"
              : "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <PrismSurface
            width={240}
            height={"100%" as unknown as number}
            borderRadius={0}
            brightness={isDark ? 10 : 58}
            opacity={isDark ? 0.94 : 0.86}
            blur={18}
            backgroundOpacity={isDark ? 0.22 : 0.18}
            saturation={1.12}
            performanceMode={isLowPowerClient || isMobileLayout}
            className="border-r sidebar-dock"
            style={{ borderRight: "1px solid var(--nt-divider)" } as React.CSSProperties}
            contentClassName="!p-0 !items-start !justify-start"
          >
            <WorkspaceSidebar
              activePage={activePage}
              userName={profile?.name ?? "Researcher"}
              userEmail={profile?.email ?? ""}
              onLogout={handleLogout}
              onNavItemClick={(item) => {
                setActivePage(item.title.toLowerCase());
                if (isMobileLayout) {
                  setMobileSidebarOpen(false);
                }
              }}
              onNewAnalysis={() => {
                setActivePage("analysis");
                setHasStarted(false);
                setAgentSteps([]);
                setBiomarkerScores(undefined);
                setCognitiveReport(undefined);
                setActivations(CORTEX_REGIONS);
                setWordTimestamps(undefined);
                setAudioDuration(undefined);
                if (isMobileLayout) {
                  setMobileSidebarOpen(false);
                }
              }}
            />
          </PrismSurface>
        </div>

        {/* Main content — flex-1 fills whatever space the sidebar leaves */}
        <div className="flex flex-col flex-1 min-w-0">
          <WorkspaceTopbar
            title={topbarTitle}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            userName={profile?.name}
            userEmail={profile?.email}
            onLogout={handleLogout}
          />
          <div className="relative flex-1 min-h-0 overflow-hidden">

            {/* ══════ DASHBOARD VIEW ══════ */}
            {isDashboardPage && (
              <div className="absolute inset-0 overflow-x-hidden" aria-hidden={!isDashboardPage}>
                <MissionControlView
                  entries={historyEntries}
                  onStartAnalysis={() => {
                    setActivePage("analysis");
                    setHasStarted(false);
                  }}
                />
              </div>
            )}

            {/* ══════ HISTORY VIEW ══════ */}
            {isHistoryPage && (
              <div className="absolute inset-0 overflow-x-hidden" aria-hidden={!isHistoryPage}>
                <SessionHistoryPanel
                  entries={historyEntries}
                  onRestore={handleRestore}
                  onRemove={(id) => { void removeEntry(id); }}
                  onClearAll={() => { void clearAll(); }}
                />
              </div>
            )}

            {/* ══════ REPORTS VIEW ══════ */}
            {isReportsPage && (
              <div className="absolute inset-0 overflow-x-hidden" aria-hidden={!isReportsPage}>
                <SessionHistoryPanel
                  entries={historyEntries}
                  onRestore={handleRestore}
                  onRemove={(id) => { void removeEntry(id); }}
                  onClearAll={() => { void clearAll(); }}
                />
              </div>
            )}

            {/* ══════ BRAIN REGIONS VIEW ══════ */}
            {isBrainRegionsPage && (
              <div className="absolute inset-0 overflow-x-hidden" aria-hidden={!isBrainRegionsPage}>
                <CortexRegionsPanel />
              </div>
            )}
            {/* ══════ BIOMARKERS VIEW ══════ */}
            {isBiomarkersPage && (
              <div className="absolute inset-0 overflow-x-hidden" aria-hidden={!isBiomarkersPage}>
                <BiomarkersPanel />
              </div>
            )}

            {/* ══════ ABOUT VIEW ══════ */}
            {isAboutPage && (
              <div className="absolute inset-0 overflow-x-hidden" aria-hidden={!isAboutPage}>
                <AboutPanel isDark={isDark} />
              </div>
            )}

            {/* ══════ PHASE 1 — Pre-submission + Processing ══════ */}
            {showPhase1 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8 overflow-y-auto overflow-x-hidden">
                <div className="w-full max-w-[42rem] flex flex-col items-center gap-5 py-6 sm:py-8">

                  {/* Title */}
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className="text-[30px] font-light tracking-[0.14em]"
                      style={{
                        fontFamily: "var(--font-syne), sans-serif",
                        color: "var(--nt-text-hi)",
                        textShadow: "0 0 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.14)",
                      }}
                    >
                      cortexflow
                    </span>
                    <span
                      className="text-[11px] tracking-[0.32em] uppercase font-medium"
                      style={{
                        color: "var(--nt-text-md)",
                        textShadow: "0 1px 4px rgba(0,0,0,0.12)",
                      }}
                    >
                      cognitive signature analysis
                    </span>
                  </div>

                  {/* Agent pipeline — appears above input while processing */}
                  {agentSteps.length > 0 && (
                    <div className="w-full">
                      <ProcessingSteps steps={agentSteps} glass={glassStyle} />
                    </div>
                  )}
                  {/* Input panel — dimmed while agents are running */}
                  <div
                    className="w-full transition-opacity duration-300"
                    style={{ opacity: isLoading ? 0.45 : 1, pointerEvents: isLoading ? "none" : "auto" }}
                  >
                    <InputCommandPanel
                      onSubmit={handleSubmit}
                      isLoading={isLoading}
                      agentSteps={[]}
                      placeholder="Paste text or record speech to begin analysis…"
                    />
                  </div>

                </div>
              </div>
            )}

            {/* ══════ PHASE 2 — Brain left · Report right · Input bottom ══════ */}
            {showPhase2 && (
              <div className="absolute inset-0 flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden" style={{ padding: isMobileLayout ? "8px" : "10px" }}>
                {/* ── Top row: Brain + Report ── */}
                <div className="flex flex-col lg:flex-row gap-2.5 flex-1 min-h-0">

                  {/* ── LEFT: Brain viewer (60%) ── */}
                  <div
                    className="rounded-2xl overflow-hidden relative min-h-[280px] lg:min-h-0"
                    style={{ flex: isMobileLayout ? "0 0 clamp(260px, 42vh, 360px)" : "3 0 0%", ...glassStyle }}
                  >
                    {/* MNI badge */}
                    <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-widest uppercase pointer-events-none"
                      style={{ background: "var(--nt-glass)", backdropFilter: "blur(8px)", color: "var(--nt-text-lo)", border: "1px solid var(--nt-glass-border)", fontFamily: "var(--font-jetbrains-mono)" }}>
                      MNI152 · 3D Atlas
                    </div>

                    {/* Activation legend */}
                    {biomarkerScores && (
                      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 p-2 rounded-xl pointer-events-none max-w-[calc(100%-1.5rem)]"
                        style={{ background: "var(--nt-glass)", backdropFilter: "blur(8px)", border: "1px solid var(--nt-glass-border)" }}>
                        {CORTEX_REGIONS.map((r) => {
                          const score = biomarkerScores[AGENT_KEY[r.agent]] ?? 0;
                          const color = scoreColor(score * 100);
                          return (
                            <div key={r.region} className="flex items-center gap-2 min-w-0">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, opacity: 0.4 + score * 0.6 }} />
                              <span className="text-[9px] uppercase tracking-wider truncate max-w-[86px] sm:max-w-none" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-jetbrains-mono)" }}>{r.region}</span>
                              <div className="w-10 sm:w-12 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score * 100}%`, background: color }} />
                              </div>
                              <span className="text-[9px] tabular-nums w-5 sm:w-6 text-right shrink-0" style={{ color, fontFamily: "var(--font-jetbrains-mono)" }}>{Math.round(score * 100)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 z-10 text-[9px] pointer-events-none"
                      style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>
                      Drag · Scroll to zoom
                    </div>

                    <SignalFieldViewer activations={activations} onRegionClick={(r) => console.log("Region clicked:", r)} activeAgentName={activeAgentName} />
                  </div>

                  {/* ── RIGHT: Report (40%) — always visible ── */}
                  <div
                    className="rounded-2xl overflow-hidden flex flex-col min-h-[220px] lg:min-h-0"
                    style={{ flex: isMobileLayout ? "1 1 auto" : "2 0 0%", ...glassStyle }}
                  >
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {cognitiveReport ? (
                        <>
                          <CognitionReportPanel report={cognitiveReport} />
                          {wordTimestamps && wordTimestamps.length > 0 && (
                            <div className="px-1 pb-2">
                              <SpeechWavePanel wordTimestamps={wordTimestamps} duration={audioDuration} />
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>

                </div>{/* end top row */}

                {/* ── BOTTOM CENTER: Chat input ── */}
                <div className="shrink-0 flex justify-center">
                  <div style={{ width: "100%", maxWidth: isMobileLayout ? 999 : 660 }}>
                    <InputCommandPanel
                      onSubmit={handleSubmit}
                      isLoading={isLoading}
                      agentSteps={[]}
                      placeholder="Analyze again or ask a follow-up…"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {splashCompleted && !isAuthenticated && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
          {!isAuthReady || isBootstrappingAccount ? (
            <div
              className="rounded-2xl px-6 py-4"
              style={{
                background: "var(--nt-glass)",
                border: "1px solid var(--nt-glass-border)",
                color: "var(--nt-text-lo)",
              }}
            >
              Restoring secure session...
            </div>
          ) : (
            <AuthPanel
              backendAwake={backendAwake}
              isBusy={isAuthBusy}
              onSocialSignIn={signInWithSocial}
              onEmailSignIn={signInWithEmail}
              onEmailSignUp={signUpWithEmail}
              onCheckMethods={checkSignInMethods}
            />
          )}
        </div>
      )}
    </div>
  );
}
