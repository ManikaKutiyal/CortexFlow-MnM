"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
type AccessRequest = {
  id: string;
  caregiver_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  users?: {
    full_name: string | null;
    email: string | null;
  };
};
const glass: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};
export function PatientAccessRequestsPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/patient/access-requests", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text() || "Failed to load");
      const data = await res.json() as { requests?: AccessRequest[] };
      setRequests(data.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isReady) return;
    void loadRequests();
  }, [loadRequests, idToken, isReady]);
  const respond = useCallback(async (id: string, status: "approved" | "rejected") => {
    setActionId(id);
    try {
      const res = await authFetch(`/api/caregiver/link-request/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to update");
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionId(null);
    }
  }, []);
  const pending = requests.filter((r) => r.status === "pending");
  const past = requests.filter((r) => r.status !== "pending");
  return (
    <div className="h-full overflow-y-auto" style={{ padding: 18 }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="#8b5cf6" strokeWidth="1.2" />
              <path d="M5 4V2.5A3 3 0 0111 2.5V4" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="8" cy="9" r="1.5" fill="#8b5cf6" />
            </svg>
          </div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Access Requests
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void loadRequests()}
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
      <div className="rounded-2xl overflow-hidden mb-4 glass-card-hover" style={glass}>
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #f59e0b, #BA7517)" }} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--nt-text-lo)" strokeWidth="1" /><path d="M7 4v3l2 1" stroke="var(--nt-text-lo)" strokeWidth="1.2" strokeLinecap="round" /></svg>
              <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Pending Requests</span>
            </div>
            {pending.length > 0 && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(186,117,23,0.12)", color: "#BA7517", border: "1px solid rgba(186,117,23,0.2)" }}>
                {pending.length} awaiting
              </span>
            )}
          </div>
          {loading ? (
            <div className="grid gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-xl px-3 py-3" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="h-3 w-32 rounded animate-shimmer" />
                  <div className="h-2.5 w-24 rounded animate-shimmer mt-2" style={{ animationDelay: "0.15s" }} />
                </div>
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="py-6 text-center" style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 opacity-40"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              All clear — no pending requests.
            </div>
          ) : (
            <div className="grid gap-3">
              {pending.map((req, i) => (
                <div
                  key={req.id}
                  className="rounded-xl p-3.5 animate-stagger-in"
                  style={{ border: "1px solid rgba(186,117,23,0.15)", background: "var(--nt-hdr)", animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(186,117,23,0.1)", border: "1px solid rgba(186,117,23,0.2)" }}>
                        <span style={{ color: "#BA7517", fontWeight: 700, fontSize: 14 }}>{(req.users?.full_name ?? "C")[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--nt-text-hi)" }}>
                          {req.users?.full_name ?? "Caregiver"}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--nt-text-ghost)" }}>
                          {req.users?.email} · {new Date(req.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: "var(--nt-text-lo)" }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="0.8" /><path d="M3 2V1.5a2 2 0 014 0V2" stroke="currentColor" strokeWidth="0.8" /></svg>
                          Requesting access to your health data
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void respond(req.id, "approved")}
                        disabled={actionId === req.id}
                        className="rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                        style={{ background: "rgba(29,158,117,0.12)", color: "#1D9E75", border: "1px solid rgba(29,158,117,0.25)" }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Allow
                      </button>
                      <button
                        type="button"
                        onClick={() => void respond(req.id, "rejected")}
                        disabled={actionId === req.id}
                        className="rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                        style={{ background: "rgba(216,90,48,0.08)", color: "#D85A30", border: "1px solid rgba(216,90,48,0.2)" }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {past.length > 0 && (
        <div className="rounded-2xl p-4 glass-card-hover" style={glass}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Past Decisions</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>
              {past.length} resolved
            </span>
          </div>
          <div className="grid gap-2">
            {past.map((req, i) => {
              const isApproved = req.status === "approved";
              return (
                <div
                  key={req.id}
                  className="rounded-xl px-3.5 py-2.5 flex items-center justify-between animate-stagger-in"
                  style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)", animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: isApproved ? "rgba(29,158,117,0.08)" : "rgba(216,90,48,0.08)",
                        border: `1px solid ${isApproved ? "rgba(29,158,117,0.2)" : "rgba(216,90,48,0.2)"}`,
                      }}
                    >
                      <span style={{ color: isApproved ? "#1D9E75" : "#D85A30", fontWeight: 700, fontSize: 11 }}>
                        {(req.users?.full_name ?? "C")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--nt-text-hi)" }}>
                        {req.users?.full_name ?? "Caregiver"}
                      </div>
                      <div className="text-[10px] font-mono" style={{ color: "var(--nt-text-ghost)" }}>
                        {req.users?.email}
                      </div>
                    </div>
                  </div>
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase shrink-0"
                    style={{
                      background: isApproved ? "rgba(29,158,117,0.08)" : "rgba(216,90,48,0.08)",
                      color: isApproved ? "#1D9E75" : "#D85A30",
                      border: `1px solid ${isApproved ? "rgba(29,158,117,0.2)" : "rgba(216,90,48,0.2)"}`,
                    }}
                  >
                    {isApproved ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" /><path d="M3 5l1.5 1.5L7 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" /><path d="M3.5 3.5l3 3M6.5 3.5l-3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
                    )}
                    {req.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
