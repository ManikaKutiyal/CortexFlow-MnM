"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type InsightReport = {
  id: string;
  created_at: string;
  risk_level?: string | null;
  summary?: string | null;
};

type CaregiverInsights = {
  patient: { id: string; name: string | null } | null;
  summary: {
    total_reports: number;
    avg_cognitive_load: number | null;
    trend: "improving" | "stable" | "worsening" | "insufficient_data";
    last_report_at: string | null;
    last_risk_level: string | null;
    last_summary: string | null;
  };
  tasks: { open: number; due_soon: number };
  alerts: { open: number; last_alert_at: string | null };
  recommendations: string[];
  recent_reports: InsightReport[];
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

function trendLabel(trend: CaregiverInsights["summary"]["trend"]) {
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

function trendColor(trend: CaregiverInsights["summary"]["trend"]) {
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

export function CaregiverInsightsPanel() {
  const { authFetch, idToken } = useAuthFetch();
  const [insights, setInsights] = useState<CaregiverInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/caregiver/insights", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load insights");
      }

      const data = await res.json() as CaregiverInsights;
      setInsights(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load insights";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights, idToken]);

  const patientLabel = useMemo(() => {
    if (!insights?.patient) return "No patient linked.";
    return insights.patient.name ?? "Linked patient";
  }, [insights]);

  const avgLoadLabel = useMemo(() => {
    if (insights?.summary.avg_cognitive_load == null) return "--";
    return `${Math.round(insights.summary.avg_cognitive_load * 100)}%`;
  }, [insights]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Caregiver Insights
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>{patientLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadInsights()}
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

      {isLoading ? (
        <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading insights...</div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>AI Summary</div>
                <span style={{ color: trendColor(insights?.summary.trend ?? "insufficient_data"), fontSize: 10 }}>
                  {trendLabel(insights?.summary.trend ?? "insufficient_data")}
                </span>
              </div>
              <div className="text-sm" style={{ color: "var(--nt-text-md)" }}>
                {insights?.summary.last_summary ?? "No recent summary available yet."}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Avg Load</div>
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{avgLoadLabel}</div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Last Report</div>
                  <div className="text-[11px]" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                    {formatDate(insights?.summary.last_report_at ?? null)}
                  </div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Risk Band</div>
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                    {insights?.summary.last_risk_level ?? "--"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Care Signals</div>
              </div>
              <div className="grid gap-2">
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Open Tasks</div>
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{insights?.tasks.open ?? 0}</div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Due Soon</div>
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{insights?.tasks.due_soon ?? 0}</div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Open Alerts</div>
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{insights?.alerts.open ?? 0}</div>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>Last Alert</div>
                  <div className="text-[11px]" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{formatDate(insights?.alerts.last_alert_at ?? null)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Recommendations</div>
              </div>
              {insights?.recommendations?.length ? (
                <div className="grid gap-2">
                  {insights.recommendations.map((rec) => (
                    <div key={rec} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                      <div className="text-xs" style={{ color: "var(--nt-text-lo)" }}>{rec}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No recommendations yet.</div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Recent Reports</div>
                <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>
                  {insights?.summary.total_reports ?? 0} total
                </span>
              </div>
              {insights?.recent_reports?.length ? (
                <div className="grid gap-2">
                  {insights.recent_reports.map((report) => (
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
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No reports yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
