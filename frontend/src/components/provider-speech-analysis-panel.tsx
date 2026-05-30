"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type ProviderPatient = {
  id: string;
  name: string;
};

type SpeechSession = {
  id: string;
  created_at: string;
  input_type: string;
  snippet: string;
  scores: Record<string, number | null>;
  load: number | null;
  risk_level: string | null;
  risk_weight: number;
  summary: string | null;
  recommendation: string | null;
  indicators: Array<{ indicator?: string; severity?: string; explanation?: string }>;
  audio_duration: number | null;
  word_count: number | null;
  words_per_minute: number | null;
};

type DomainSummary = {
  domain: string;
  latest: number | null;
  average: number | null;
  peak: number | null;
};

type SpeechSummary = {
  latest_at: string;
  latest_risk_level: string | null;
  latest_load: number | null;
  latest_summary: string | null;
  avg_load: number | null;
  avg_words_per_minute: number | null;
  sessions_count: number;
};

type SpeechAnalysisResponse = {
  patients: ProviderPatient[];
  selected_patient_id: string | null;
  summary: SpeechSummary | null;
  sessions: SpeechSession[];
  domains: DomainSummary[];
  risk_mix: Array<{ level: string; count: number }>;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

const riskColors: Record<string, string> = {
  low: "#1D9E75",
  moderate: "#BA7517",
  high: "#D85A30",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "--";
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "--";
  return Math.round(value).toString();
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ProviderSpeechAnalysisPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [summary, setSummary] = useState<SpeechSummary | null>(null);
  const [sessions, setSessions] = useState<SpeechSession[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [riskMix, setRiskMix] = useState<Array<{ level: string; count: number }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSpeechAnalysis = useCallback(async (patientId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
      const res = await authFetch(`/api/provider/speech-analysis${query}`, { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load speech analysis");
      }

      const data = await res.json() as SpeechAnalysisResponse;
      setPatients(data.patients ?? []);
      setSelectedPatientId(data.selected_patient_id ?? "");
      setSummary(data.summary ?? null);
      setSessions(data.sessions ?? []);
      setDomains(data.domains ?? []);
      setRiskMix(data.risk_mix ?? []);
      setSelectedSessionId(data.sessions?.[0]?.id ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load speech analysis";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void loadSpeechAnalysis();
  }, [loadSpeechAnalysis, idToken, isReady]);

  useEffect(() => {
    if (!isReady || !selectedPatientId) return;
    void loadSpeechAnalysis(selectedPatientId);
  }, [selectedPatientId, loadSpeechAnalysis, idToken, isReady]);

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  }, [selectedSessionId, sessions]);

  const sessionTrend = useMemo(() => sessions.slice().reverse().map((session) => ({
    date: shortDate(session.created_at),
    load: session.load == null ? null : Math.round(session.load * 100),
    risk: session.risk_weight,
    wpm: session.words_per_minute == null ? null : Math.round(session.words_per_minute),
  })), [sessions]);

  const domainChart = useMemo(() => domains.map((domain) => ({
    domain: domain.domain.slice(0, 3).toUpperCase(),
    latest: domain.latest == null ? 0 : Math.round(domain.latest * 100),
    average: domain.average == null ? 0 : Math.round(domain.average * 100),
  })), [domains]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Speech Analysis
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>Clinical review of stored cognitive speech sessions.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadSpeechAnalysis(selectedPatientId || undefined)}
          className="rounded-lg px-3 py-1 text-[11px]"
          style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg px-3 py-2" style={{ border: "1px solid rgba(216,90,48,0.35)", color: "#D85A30" }}>
          {error}
        </div>
      )}

      <div className="mb-3 rounded-2xl p-4" style={glassCard}>
        <select
          value={selectedPatientId}
          onChange={(event) => setSelectedPatientId(event.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
        >
          <option value="">Select patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>{patient.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading speech analysis...</div>
      ) : !selectedPatientId ? (
        <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Select a patient to view speech analysis.</div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Latest Risk", summary?.latest_risk_level ?? "--"],
              ["Latest Load", formatPercent(summary?.latest_load)],
              ["Avg Load", formatPercent(summary?.avg_load)],
              ["Avg WPM", formatNumber(summary?.avg_words_per_minute)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl p-4" style={glassCard}>
                <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>{label}</div>
                <div className="mt-1 text-lg capitalize" style={{ color: "var(--nt-text-hi)", fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="mb-3 flex items-center justify-between">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Session Load</div>
                <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>{summary?.sessions_count ?? 0} sessions</span>
              </div>
              {sessionTrend.length > 1 ? (
                <div className="h-[230px]" style={{ minHeight: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sessionTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="var(--nt-divider)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fill: "var(--nt-text-ghost)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "var(--nt-text-ghost)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: "var(--nt-hdr)", border: "1px solid var(--nt-divider)", borderRadius: 10, color: "var(--nt-text-hi)" }}
                        labelStyle={{ color: "var(--nt-text-md)" }}
                      />
                      <Line type="monotone" dataKey="load" stroke="#D85A30" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="wpm" stroke="#1D9E75" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>At least two sessions are needed for a trend chart.</div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="mb-3" style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Domain Profile</div>
              {domainChart.length ? (
                <div className="h-[230px]" style={{ minHeight: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={domainChart} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="var(--nt-divider)" strokeDasharray="3 3" />
                      <XAxis dataKey="domain" tick={{ fill: "var(--nt-text-ghost)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "var(--nt-text-ghost)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: "var(--nt-hdr)", border: "1px solid var(--nt-divider)", borderRadius: 10, color: "var(--nt-text-hi)" }}
                        labelStyle={{ color: "var(--nt-text-md)" }}
                      />
                      <Bar dataKey="average" fill="rgba(29,158,117,0.42)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="latest" fill="#D85A30" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No speech biomarkers recorded.</div>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="mb-3" style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Risk Mix</div>
              <div className="grid gap-2">
                {riskMix.map((item) => (
                  <div key={item.level} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs capitalize" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{item.level}</span>
                      <span className="text-[10px]" style={{ color: riskColors[item.level] ?? "var(--nt-text-ghost)" }}>{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--nt-track)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${summary?.sessions_count ? Math.round((item.count / summary.sessions_count) * 100) : 0}%`,
                          background: riskColors[item.level] ?? "var(--nt-text-ghost)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Session Review</div>
                <select
                  value={selectedSession?.id ?? ""}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                  className="max-w-[220px] rounded-lg px-2 py-1 text-[11px] outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>{formatDate(session.created_at)}</option>
                  ))}
                </select>
              </div>

              {selectedSession ? (
                <div className="grid gap-3">
                  <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs capitalize" style={{ color: riskColors[selectedSession.risk_level ?? ""] ?? "var(--nt-text-hi)", fontWeight: 700 }}>
                        {selectedSession.risk_level ?? "Unscored"}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>{formatDate(selectedSession.created_at)}</span>
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>
                      {selectedSession.summary ?? "No clinical summary stored for this session."}
                    </div>
                  </div>

                  {selectedSession.indicators.length > 0 && (
                    <div className="grid gap-2 md:grid-cols-2">
                      {selectedSession.indicators.slice(0, 4).map((indicator, index) => (
                        <div key={`${indicator.indicator ?? "indicator"}-${index}`} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                          <div className="text-xs" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{indicator.indicator ?? "Indicator"}</div>
                          <div className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>{indicator.explanation ?? "No explanation stored."}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                    <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Input Excerpt</div>
                    <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>
                      {selectedSession.snippet || "No excerpt stored."}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No sessions recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
