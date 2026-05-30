"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type ProviderPatient = {
  id: string;
  name: string;
};

type TrendReport = {
  id: string;
  created_at: string;
  risk_level: string | null;
  summary: string | null;
  overall_cognitive_load: number | null;
};

type TrendMetric = {
  metric_name: string;
  metric_value: number | null;
  unit: string | null;
  measured_at: string | null;
};

type TrendSummary = {
  avg_cognitive_load: number | null;
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
  last_report_at: string | null;
  last_risk_level: string | null;
  last_summary: string | null;
};

type PatientDetail = {
  id: string;
  name: string;
  email: string | null;
  photo_url: string | null;
  diagnosis_stage: string | null;
  condition_notes: string | null;
  preferred_language: string | null;
};

type CareStatus = {
  open_tasks: number;
  urgent_tasks: number;
  open_alerts: number;
  latest_alert_urgency: string | null;
  latest_alert_at: string | null;
};

type TrendPoint = {
  id: string;
  created_at: string;
  load: number | null;
  risk_level: string | null;
  risk_weight: number;
  scores: Record<string, number | null>;
};

type DomainSummary = {
  domain: string;
  latest: number | null;
  average: number | null;
  trend: TrendSummary["trend"];
};

type PatientTrendsResponse = {
  patients: ProviderPatient[];
  selected_patient_id: string | null;
  patient: PatientDetail | null;
  summary: TrendSummary | null;
  care_status: CareStatus | null;
  series: TrendPoint[];
  domains: DomainSummary[];
  reports: TrendReport[];
  metrics: TrendMetric[];
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function trendLabel(trend: TrendSummary["trend"]) {
  switch (trend) {
    case "improving":
      return "Improving";
    case "worsening":
      return "Worsening";
    case "stable":
      return "Stable";
    default:
      return "Insufficient data";
  }
}

function trendColor(trend: TrendSummary["trend"]) {
  switch (trend) {
    case "improving":
      return "#1D9E75";
    case "worsening":
      return "#D85A30";
    case "stable":
      return "#BA7517";
    default:
      return "var(--nt-text-ghost)";
  }
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "--";
  return `${Math.round(value * 100)}%`;
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ProviderTrendsPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [summary, setSummary] = useState<TrendSummary | null>(null);
  const [careStatus, setCareStatus] = useState<CareStatus | null>(null);
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [reports, setReports] = useState<TrendReport[]>([]);
  const [metrics, setMetrics] = useState<TrendMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async (patientId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
      const res = await authFetch(`/api/provider/patient-trends${query}`, { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load patient trends");
      }

      const data = await res.json() as PatientTrendsResponse;
      setPatients(data.patients ?? []);
      setSelectedPatientId(data.selected_patient_id ?? "");
      setPatient(data.patient ?? null);
      setSummary(data.summary ?? null);
      setCareStatus(data.care_status ?? null);
      setSeries(data.series ?? []);
      setDomains(data.domains ?? []);
      setReports(data.reports ?? []);
      setMetrics(data.metrics ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load patient trends";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load patient trends";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isReady) return;
    void loadTrends();
  }, [loadTrends, idToken, isReady]);

  useEffect(() => {
    if (!isReady || !selectedPatientId) return;
    void loadTrends(selectedPatientId);
  }, [selectedPatientId, loadTrends, idToken, isReady]);

  const avgLoadLabel = useMemo(() => {
    return formatPercent(summary?.avg_cognitive_load);
  }, [summary]);

  const chartData = useMemo(() => series.map((point) => ({
    date: shortDate(point.created_at),
    load: point.load == null ? null : Math.round(point.load * 100),
    lexical: point.scores.lexical == null ? null : Math.round(point.scores.lexical * 100),
    semantic: point.scores.semantic == null ? null : Math.round(point.scores.semantic * 100),
    prosody: point.scores.prosody == null ? null : Math.round(point.scores.prosody * 100),
    syntax: point.scores.syntax == null ? null : Math.round(point.scores.syntax * 100),
    affective: point.scores.affective == null ? null : Math.round(point.scores.affective * 100),
  })), [series]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Patient Trends
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>Longitudinal overview for your roster.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadTrends(selectedPatientId || undefined)}
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

      <div className="rounded-2xl p-4 mb-3" style={glassCard}>
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
        <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading patient trends...</div>
      ) : !selectedPatientId ? (
        <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Select a patient to view trends.</div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                >
                  {(patient?.name ?? "P").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 700 }}>{patient?.name ?? "Patient"}</div>
                  <div className="truncate text-[11px]" style={{ color: "var(--nt-text-ghost)" }}>{patient?.email ?? "No email on file"}</div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Stage</div>
                  <div className="text-xs" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{patient?.diagnosis_stage ?? "Not specified"}</div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Language</div>
                  <div className="text-xs" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{patient?.preferred_language ?? "Not specified"}</div>
                </div>
              </div>
              {patient?.condition_notes && (
                <div className="mt-3 text-xs leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>{patient.condition_notes}</div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="mb-3 flex items-center justify-between">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Care Status</div>
                <span style={{ color: careStatus?.open_alerts ? "#D85A30" : "#1D9E75", fontSize: 10 }}>
                  {careStatus?.open_alerts ? "Action needed" : "No open alerts"}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  ["Open Tasks", careStatus?.open_tasks ?? 0],
                  ["Urgent Tasks", careStatus?.urgent_tasks ?? 0],
                  ["Open Alerts", careStatus?.open_alerts ?? 0],
                  ["Latest Alert", careStatus?.latest_alert_urgency ?? "--"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                    <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>{label}</div>
                    <div className="text-sm capitalize" style={{ color: "var(--nt-text-hi)", fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Cognitive Summary</div>
                <span style={{ color: trendColor(summary?.trend ?? "insufficient_data"), fontSize: 10 }}>
                  {trendLabel(summary?.trend ?? "insufficient_data")}
                </span>
              </div>
              <div className="text-sm" style={{ color: "var(--nt-text-md)" }}>
                {summary?.last_summary ?? "No recent summary available."}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Avg Load</div>
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{avgLoadLabel}</div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Last Report</div>
                  <div className="text-[11px]" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                    {formatDate(summary?.last_report_at ?? null)}
                  </div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Risk Band</div>
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                    {summary?.last_risk_level ?? "--"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Latest Metrics</div>
              </div>
              {metrics.length ? (
                <div className="grid gap-2">
                  {metrics.map((metric) => (
                    <div key={metric.metric_name} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{metric.metric_name}</div>
                        <span className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>
                          {formatDate(metric.measured_at ?? null)}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>
                        {metric.metric_value ?? "--"} {metric.unit ?? ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No metrics recorded.</div>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="mb-3 flex items-center justify-between">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Load Trend</div>
                <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>{series.length} sessions</span>
              </div>
              {chartData.length > 1 ? (
                <div className="h-[220px]" style={{ minHeight: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="var(--nt-divider)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fill: "var(--nt-text-ghost)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "var(--nt-text-ghost)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: "var(--nt-hdr)", border: "1px solid var(--nt-divider)", borderRadius: 10, color: "var(--nt-text-hi)" }}
                        labelStyle={{ color: "var(--nt-text-md)" }}
                      />
                      <Area type="monotone" dataKey="load" stroke="#D85A30" fill="rgba(216,90,48,0.14)" strokeWidth={2} connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>At least two reports are needed for a trend chart.</div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="mb-3" style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Domain Drift</div>
              {domains.length ? (
                <div className="grid gap-2">
                  {domains.map((domain) => (
                    <div key={domain.domain} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs capitalize" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{domain.domain}</span>
                        <span className="text-[10px]" style={{ color: trendColor(domain.trend) }}>{trendLabel(domain.trend)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--nt-track)" }}>
                        <div className="h-full rounded-full" style={{ width: domain.latest == null ? "0%" : formatPercent(domain.latest), background: trendColor(domain.trend) }} />
                      </div>
                      <div className="mt-1 text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>
                        Latest {formatPercent(domain.latest)} · Average {formatPercent(domain.average)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No domain scores recorded.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Recent Reports</div>
              <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>{reports.length} entries</span>
            </div>
            {reports.length ? (
              <div className="grid gap-2">
                {reports.map((report) => (
                  <div key={report.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                        {report.risk_level ?? "Report"}
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>
                        {formatDate(report.created_at)}
                      </span>
                    </div>
                    {report.summary && (
                      <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>
                        {report.summary}
                      </div>
                    )}
                    {report.overall_cognitive_load != null && (
                      <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                        Load {Math.round(report.overall_cognitive_load * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No reports yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
