"use client";

import { useCallback, useEffect, useState } from "react";

type ProviderPatient = {
  id: string;
  name: string;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  patient_id: string | null;
  created_at: string;
  read_at: string | null;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function ProviderNotificationsPanel() {
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/provider/notifications", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load notifications");
      }

      const data = await res.json() as { patients?: ProviderPatient[]; notifications?: NotificationItem[] };
      setPatients(data.patients ?? []);
      setNotifications(data.notifications ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notifications";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canSend = title.trim().length > 1 && patientId;

  const sendNotification = useCallback(async () => {
    if (!canSend) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/provider/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, title: title.trim(), body: body.trim() || null }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to send notification");
      }

      const data = await res.json() as { notification?: NotificationItem };
      if (data.notification) {
        setNotifications((prev) => [data.notification as NotificationItem, ...prev]);
      }

      setTitle("");
      setBody("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send notification";
      setError(message);
    } finally {
      setSending(false);
    }
  }, [body, canSend, patientId, title]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Provider Notifications
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>Send updates to patients.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
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

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Send Notification</div>
          </div>
          <div className="grid gap-2">
            <select
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Message"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 90 }}
            />
            <button
              type="button"
              onClick={() => void sendNotification()}
              disabled={!canSend || sending}
              className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
            >
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Recent Notifications</div>
          </div>
          {isLoading ? (
            <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No notifications yet.</div>
          ) : (
            <div className="grid gap-2">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{notification.title}</div>
                  {notification.body && (
                    <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{notification.body}</div>
                  )}
                  <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
