"use client";

import { useCallback, useEffect, useState } from "react";

type EmergencyEvent = {
  id: string;
  patient_id: string;
  urgency: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved";
  location: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function CaregiverAlertsPanel() {
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const alertsRes = await fetch("/api/caregiver/alerts", { method: "GET", cache: "no-store" });
      if (!alertsRes.ok) {
        const message = await alertsRes.text();
        throw new Error(message || "Failed to load alerts");
      }

      const alertsData = await alertsRes.json() as { events?: EmergencyEvent[] };
      setEvents(alertsData.events ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load alerts";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Alert Center
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>High-priority alerts for your patient.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadAlerts()}
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
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading alerts...</div>
        ) : events.length === 0 ? (
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No alerts yet.</div>
        ) : (
          <div className="grid gap-2">
            {events.map((event) => (
              <div key={event.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                    {event.urgency.toUpperCase()} · {event.status}
                  </div>
                  <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                {event.location && (
                  <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>
                    {event.location}
                  </div>
                )}
                {event.details && (
                  <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 6 }}>
                    {String(event.details?.detail ?? "")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
