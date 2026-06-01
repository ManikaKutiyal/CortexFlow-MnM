"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
type ProviderPatient = {
  id: string;
  name: string;
  email: string | null;
  photo_url: string | null;
  open_tasks: number;
  open_alerts: number;
  total_reports: number;
};
const glass: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};
export function ProviderRosterPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const loadRoster = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/provider/roster", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text() || "Failed to load roster");
      const data = await res.json() as { patients?: ProviderPatient[] };
      setPatients(data.patients ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roster");
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isReady) return;
    void loadRoster();
  }, [loadRoster, idToken, isReady]);
  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const needle = search.toLowerCase();
    return patients.filter((p) => p.name.toLowerCase().includes(needle) || (p.email ?? "").toLowerCase().includes(needle));
  }, [patients, search]);
  const totalAlerts = useMemo(() => patients.reduce((sum, p) => sum + p.open_alerts, 0), [patients]);
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: 18 }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="5" r="3" stroke="#8b5cf6" strokeWidth="1.2" />
              <path d="M1 14c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="12" cy="5" r="2" stroke="#8b5cf6" strokeWidth="1" />
              <path d="M10 12c0-1.657 0.895-3 2-3s2 1.343 2 3" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
              Provider Roster
            </h1>
            <p className="text-[11px]" style={{ color: "var(--nt-text-xs)" }}>
              {patients.length} patients{totalAlerts > 0 ? ` · ${totalAlerts} active alerts` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadRoster()}
          className="rounded-lg px-3 py-1.5 text-[11px] flex items-center gap-1.5"
          style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6A4.5 4.5 0 016 1.5M10.5 6A4.5 4.5 0 016 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M6 1.5l1.5 1.5L6 4.5M6 10.5L4.5 9 6 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Refresh
        </button>
      </div>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 animate-slide-up-fade" style={{ background: "rgba(216,90,48,0.06)", border: "1px solid rgba(216,90,48,0.2)", color: "#D85A30" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" /><path d="M7 4v3M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span className="text-xs">{error}</span>
        </div>
      )}
      <div className="rounded-2xl overflow-hidden mb-3 glass-card-hover" style={glass}>
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #8b5cf6, #ec4899)" }} />
        <div className="p-4">
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--nt-text-ghost)" }}><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" /><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients by name or email…"
              className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
            />
          </div>
        </div>
      </div>
      <div className="rounded-2xl p-4 glass-card-hover" style={glass}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>
            {search.trim() ? `Results (${filtered.length})` : "All Patients"}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>
            {filtered.length} / {patients.length}
          </span>
        </div>
        {isLoading ? (
          <div className="grid gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl px-3 py-3" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full animate-shimmer shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-28 rounded animate-shimmer" />
                    <div className="h-2.5 w-40 rounded animate-shimmer mt-2" style={{ animationDelay: "0.15s" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center" style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 opacity-40"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            {search.trim() ? "No patients match your search." : "No patients in your roster yet."}
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((patient, i) => {
              const hasAlerts = patient.open_alerts > 0;
              return (
                <div
                  key={patient.id}
                  className="rounded-xl px-3.5 py-3 flex items-center justify-between animate-stagger-in"
                  style={{
                    border: `1px solid ${hasAlerts ? "rgba(216,90,48,0.15)" : "var(--nt-divider)"}`,
                    background: "var(--nt-hdr)",
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: hasAlerts ? "rgba(216,90,48,0.08)" : "rgba(139,92,246,0.08)",
                        border: `1px solid ${hasAlerts ? "rgba(216,90,48,0.2)" : "rgba(139,92,246,0.18)"}`,
                      }}
                    >
                      <span style={{ color: hasAlerts ? "#D85A30" : "#8b5cf6", fontWeight: 700, fontSize: 14 }}>
                        {patient.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--nt-text-hi)" }}>{patient.name}</div>
                      {patient.email && <div className="text-xs mt-0.5 truncate" style={{ color: "var(--nt-text-ghost)" }}>{patient.email}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-mono" style={{ color: "var(--nt-text-ghost)" }}>
                        {patient.open_tasks} tasks · {patient.total_reports} reports
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide flex items-center gap-1"
                      style={{
                        background: hasAlerts ? "rgba(216,90,48,0.08)" : "rgba(29,158,117,0.08)",
                        color: hasAlerts ? "#D85A30" : "#1D9E75",
                        border: `1px solid ${hasAlerts ? "rgba(216,90,48,0.2)" : "rgba(29,158,117,0.2)"}`,
                      }}
                    >
                      {hasAlerts && <span className="w-1.5 h-1.5 rounded-full animate-status-blink" style={{ background: "#D85A30" }} />}
                      {hasAlerts ? `${patient.open_alerts} alerts` : "stable"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
