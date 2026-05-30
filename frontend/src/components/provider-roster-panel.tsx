"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ProviderPatient = {
  id: string;
  name: string;
  email: string | null;
  photo_url: string | null;
  open_tasks: number;
  open_alerts: number;
  total_reports: number;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function ProviderRosterPanel() {
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadRoster = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/provider/roster", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load roster");
      }

      const data = await res.json() as { patients?: ProviderPatient[] };
      setPatients(data.patients ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load roster";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const needle = search.toLowerCase();
    return patients.filter((patient) =>
      patient.name.toLowerCase().includes(needle)
      || (patient.email ?? "").toLowerCase().includes(needle)
    );
  }, [patients, search]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Provider Roster
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>Manage your patients in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadRoster()}
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
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search patients..."
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
        />
      </div>

      <div className="rounded-2xl p-4" style={glassCard}>
        {isLoading ? (
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading roster...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No patients yet.</div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((patient) => (
              <div key={patient.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{patient.name}</div>
                  <span className="text-[10px] uppercase" style={{ color: "var(--nt-text-ghost)" }}>
                    {patient.open_alerts > 0 ? "alerts" : "stable"}
                  </span>
                </div>
                {patient.email && (
                  <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{patient.email}</div>
                )}
                <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                  {patient.open_tasks} open tasks · {patient.total_reports} reports
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
