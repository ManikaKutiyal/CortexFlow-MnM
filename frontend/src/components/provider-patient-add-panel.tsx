"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
type LinkedPatient = {
  id: string;
  patient_id: string;
  created_at: string;
  users?: {
    full_name: string | null;
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
export function ProviderPatientAddPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [patients, setPatients] = useState<LinkedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientCode, setPatientCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/provider/link-patient", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text() || "Failed to load");
      const data = await res.json() as { links?: LinkedPatient[] };
      setPatients(data.links ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isReady) return;
    void loadPatients();
  }, [loadPatients, idToken, isReady]);
  const addPatient = useCallback(async () => {
    const code = patientCode.trim().toUpperCase();
    if (!code) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await authFetch("/api/provider/link-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unique_patient_id: code }),
      });
      const data = await res.json() as { patient?: { full_name?: string }; error?: string };
      if (!res.ok) {
        setSubmitMsg({ text: data.error ?? "Failed to add patient", ok: false });
        return;
      }
      setSubmitMsg({ text: `${data.patient?.full_name ?? "Patient"} added to your roster.`, ok: true });
      setPatientCode("");
      void loadPatients();
    } catch (err) {
      setSubmitMsg({ text: err instanceof Error ? err.message : "Failed to add", ok: false });
    } finally {
      setSubmitting(false);
    }
  }, [patientCode, loadPatients]);
  return (
    <div className="h-full overflow-y-auto" style={{ padding: 18 }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="4" width="10" height="9" rx="1.5" stroke="#8b5cf6" strokeWidth="1.2" />
              <path d="M8 7.5v3M6.5 9h3" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M5 4V2.5a3 3 0 016 0V4" stroke="#8b5cf6" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Manage Roster
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void loadPatients()}
          className="rounded-lg px-3 py-1.5 text-[11px] flex items-center gap-1.5"
          style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6A4.5 4.5 0 016 1.5M10.5 6A4.5 4.5 0 016 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M6 1.5l1.5 1.5L6 4.5M6 10.5L4.5 9 6 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Refresh
        </button>
      </div>
      <div className="rounded-2xl overflow-hidden mb-4 glass-card-hover" style={glass}>
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #8b5cf6, #ec4899)" }} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="var(--nt-text-lo)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Add Patient by ID</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--nt-text-xs)", lineHeight: 1.6 }}>
            Enter the patient&apos;s unique 8-character ID to add them to your roster for monitoring.
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={patientCode}
              onChange={(e) => setPatientCode(e.target.value.toUpperCase())}
              placeholder="Patient ID (e.g. AB12CD34)"
              className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", letterSpacing: "0.1em", fontFamily: "var(--font-jetbrains-mono)" }}
              onKeyDown={(e) => { if (e.key === "Enter") void addPatient(); }}
            />
            <button
              type="button"
              onClick={() => void addPatient()}
              disabled={submitting || !patientCode.trim()}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
              style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
            >
              {submitting ? (
                <><div className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />Adding…</>
              ) : (
                "Add Patient"
              )}
            </button>
          </div>
          {submitMsg && (
            <div className="mt-3 flex items-center gap-2 text-xs rounded-lg px-3 py-2 animate-slide-up-fade" style={{
              background: submitMsg.ok ? "rgba(29,158,117,0.08)" : "rgba(216,90,48,0.08)",
              color: submitMsg.ok ? "#1D9E75" : "#D85A30",
              border: `1px solid ${submitMsg.ok ? "rgba(29,158,117,0.2)" : "rgba(216,90,48,0.2)"}`,
            }}>
              {submitMsg.ok ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M6 3.5v2.5M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              )}
              {submitMsg.text}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-2xl p-4 glass-card-hover" style={glass}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="3.5" stroke="var(--nt-text-lo)" strokeWidth="1.1" /><circle cx="10" cy="9" r="3" stroke="var(--nt-text-lo)" strokeWidth="1.1" /><path d="M7.5 7.5l1 1" stroke="var(--nt-text-lo)" strokeWidth="1" strokeLinecap="round" /></svg>
            <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Patient Roster</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>
            {patients.length} patients
          </span>
        </div>
        {loading ? (
          <div className="grid gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl px-3 py-3" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                <div className="h-3 w-28 rounded animate-shimmer" />
                <div className="h-2.5 w-40 rounded animate-shimmer mt-2" style={{ animationDelay: "0.15s" }} />
              </div>
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="py-6 text-center" style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 opacity-40"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            No patients in your roster yet. Add one above.
          </div>
        ) : (
          <div className="grid gap-2">
            {patients.map((p, i) => (
              <div
                key={p.id}
                className="rounded-xl px-3.5 py-3 flex items-center justify-between animate-stagger-in"
                style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)", animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}
                  >
                    <span style={{ color: "#8b5cf6", fontWeight: 700, fontSize: 14 }}>
                      {(p.users?.full_name ?? "P")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--nt-text-hi)" }}>
                      {p.users?.full_name ?? "Patient"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nt-text-ghost)" }}>
                      {p.users?.email}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono tracking-wide" style={{ color: "var(--nt-text-lo)" }}>
                    {p.users?.unique_patient_id}
                  </div>
                  <div className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--nt-text-ghost)" }}>
                    {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </div>
            ))}
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
