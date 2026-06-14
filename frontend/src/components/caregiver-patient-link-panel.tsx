"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useGlobalRefresh } from "@/providers/refresh-provider";
type LinkStatus = "pending" | "approved" | "rejected" | "active" | "revoked";
type PatientLink = {
  id: string;
  patient_id: string;
  status: LinkStatus;
  created_at: string;
  users?: {
    full_name: string | null;
    display_name?: string | null;
    email: string | null;
    unique_patient_id: string | null;
  };
};
const glass: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};
const STATUS_CONFIG: Record<LinkStatus, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: {
    color: "#BA7517",
    bg: "rgba(186,117,23,0.08)",
    border: "rgba(186,117,23,0.2)",
    icon: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="#BA7517" strokeWidth="1.2" /><path d="M5 3v2.5l1.5 1" stroke="#BA7517" strokeWidth="1" strokeLinecap="round" /></svg>,
  },
  approved: {
    color: "#1D9E75",
    bg: "rgba(29,158,117,0.08)",
    border: "rgba(29,158,117,0.2)",
    icon: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="#1D9E75" strokeWidth="1.2" /><path d="M3 5l1.5 1.5L7 4" stroke="#1D9E75" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  active: {
    color: "#1D9E75",
    bg: "rgba(29,158,117,0.08)",
    border: "rgba(29,158,117,0.2)",
    icon: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="#1D9E75" strokeWidth="1.2" /><path d="M3 5l1.5 1.5L7 4" stroke="#1D9E75" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },

  rejected: {
    color: "#D85A30",
    bg: "rgba(216,90,48,0.08)",
    border: "rgba(216,90,48,0.2)",
    icon: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="#D85A30" strokeWidth="1.2" /><path d="M3.5 3.5l3 3M6.5 3.5l-3 3" stroke="#D85A30" strokeWidth="1" strokeLinecap="round" /></svg>,
  },
  revoked: {
    color: "#D85A30",
    bg: "rgba(216,90,48,0.08)",
    border: "rgba(216,90,48,0.2)",
    icon: <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="#D85A30" strokeWidth="1.2" /><path d="M3.5 3.5l3 3M6.5 3.5l-3 3" stroke="#D85A30" strokeWidth="1" strokeLinecap="round" /></svg>,
  },
};
export function CaregiverPatientLinkPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [links, setLinks] = useState<PatientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientCode, setPatientCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/caregiver/link-request", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text() || "Failed to load");
      const data = await res.json() as { links?: PatientLink[] };
      setLinks(data.links ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isReady) return;
    void loadLinks();
  }, [loadLinks, idToken, isReady]);

  useGlobalRefresh(() => {
    if (isReady) void loadLinks();
  });
  const submitRequest = useCallback(async () => {
    const code = patientCode.trim().toUpperCase();
    if (!code) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await authFetch("/api/caregiver/link-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unique_patient_id: code }),
      });
      const data = await res.json() as { link?: PatientLink; error?: string };
      if (!res.ok) {
        setSubmitMsg(data.error ?? "Failed to send request");
        return;
      }
      setSubmitMsg("Request sent! The patient will be notified.");
      setPatientCode("");
      void loadLinks();
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  }, [patientCode, loadLinks]);
  const approvedLink = links.find((l) => l.status === "approved" || l.status === "active");
  return (
    <div className="h-full overflow-y-auto" style={{ padding: 18 }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="6" r="3.5" stroke="#f59e0b" strokeWidth="1.2" />
              <circle cx="11" cy="10" r="3.5" stroke="#f59e0b" strokeWidth="1.2" />
              <path d="M8.5 8.5L9 9" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Patient Link
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void loadLinks()}
          className="rounded-lg px-3 py-1.5 text-[11px] flex items-center gap-1.5"
          style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6A4.5 4.5 0 016 1.5M10.5 6A4.5 4.5 0 016 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M6 1.5l1.5 1.5L6 4.5M6 10.5L4.5 9 6 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Refresh
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden mb-4 glass-card-hover" style={glass}>
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="var(--nt-text-lo)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Link a Patient</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--nt-text-xs)", lineHeight: 1.6 }}>
            Enter the patient&apos;s unique 8-character ID to request access to their health data.
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={patientCode}
              onChange={(e) => setPatientCode(e.target.value.toUpperCase())}
              placeholder="Patient ID (e.g. AB12CD34)"
              className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", letterSpacing: "0.1em", fontFamily: "var(--font-jetbrains-mono)" }}
              onKeyDown={(e) => { if (e.key === "Enter") void submitRequest(); }}
            />
            <button
              type="button"
              onClick={() => void submitRequest()}
              disabled={submitting || !patientCode.trim()}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
              style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
            >
              {submitting ? (
                <><div className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />Sending…</>
              ) : (
                "Send Request"
              )}
            </button>
          </div>
          {submitMsg && (
            <div className="mt-3 flex items-center gap-2 text-xs rounded-lg px-3 py-2 animate-slide-up-fade" style={{
              background: submitMsg.includes("sent") ? "rgba(29,158,117,0.08)" : "rgba(216,90,48,0.08)",
              color: submitMsg.includes("sent") ? "#1D9E75" : "#D85A30",
              border: `1px solid ${submitMsg.includes("sent") ? "rgba(29,158,117,0.2)" : "rgba(216,90,48,0.2)"}`,
            }}>
              {submitMsg.includes("sent") ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M6 3.5v2.5M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              )}
              {submitMsg}
            </div>
          )}
        </div>
      </div>
      {approvedLink && (
        <div className="rounded-2xl overflow-hidden mb-4 animate-scale-in glass-card-hover" style={{ ...glass, borderColor: "rgba(29,158,117,0.25)" }}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #14b8a6, #22d3ee)" }} />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#1D9E75" strokeWidth="1.2" /><path d="M5 8l2.5 2.5L11 6" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ color: "#1D9E75", fontSize: 12, fontWeight: 600 }}>Active Patient Link</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)" }}>
                <span style={{ color: "#1D9E75", fontWeight: 700, fontSize: 14 }}>{(approvedLink.users?.full_name ?? approvedLink.users?.display_name ?? "P")[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 15, fontWeight: 600 }}>{approvedLink.users?.full_name ?? approvedLink.users?.display_name ?? "Patient"}</div>
                <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--nt-text-ghost)" }}>
                  <span className="font-mono tracking-wide">{approvedLink.users?.unique_patient_id}</span>
                  {approvedLink.users?.email && <><span>·</span><span>{approvedLink.users.email}</span></>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-2xl p-4 glass-card-hover" style={glass}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Link History</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>
            {links.length} requests
          </span>
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
        ) : links.length === 0 ? (
          <div className="py-6 text-center" style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 opacity-40"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            No link requests yet. Enter a patient ID above to get started.
          </div>
        ) : (
          <div className="grid gap-2">
            {links.map((link, i) => {
              const sc = STATUS_CONFIG[link.status] || {
                color: "var(--nt-text-md)",
                bg: "var(--nt-hover)",
                border: "var(--nt-divider)",
                icon: null,
              };
              return (
                <div
                  key={link.id}
                  className="rounded-xl px-3.5 py-2.5 flex items-center justify-between animate-stagger-in"
                  style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)", animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                      <span style={{ color: sc.color, fontWeight: 700, fontSize: 11 }}>{(link.users?.full_name ?? link.users?.display_name ?? "P")[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--nt-text-hi)" }}>{link.users?.full_name ?? link.users?.display_name ?? link.patient_id}</div>
                      <div className="text-[10px] font-mono" style={{ color: "var(--nt-text-ghost)" }}>{new Date(link.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase shrink-0"
                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                  >
                    {sc.icon}
                    {link.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: "rgba(216,90,48,0.08)", color: "#D85A30", border: "1px solid rgba(216,90,48,0.2)" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M6 3.5v2.5M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
