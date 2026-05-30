"use client";

import { useCallback, useEffect, useState } from "react";

type PatientRecord = {
  id: string;
  patient_id: string;
  record_type: "prescription" | "lab" | "image" | "note" | "other";
  title: string;
  description: string | null;
  file_path: string | null;
  created_at: string;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function ProviderRecordsPanel() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/provider/records", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load records");
      }

      const data = await res.json() as { records?: PatientRecord[] };
      setRecords(data.records ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load records";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Patient Records
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>Prescriptions, images, and clinical files.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadRecords()}
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

      <div className="rounded-2xl p-4" style={glassCard}>
        {isLoading ? (
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading records...</div>
        ) : records.length === 0 ? (
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No records uploaded.</div>
        ) : (
          <div className="grid gap-2">
            {records.map((record) => (
              <div key={record.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{record.title}</div>
                  <span className="text-[10px] uppercase" style={{ color: "var(--nt-text-ghost)" }}>{record.record_type}</span>
                </div>
                {record.description && (
                  <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{record.description}</div>
                )}
                <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                  {new Date(record.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
