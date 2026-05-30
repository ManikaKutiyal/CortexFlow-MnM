"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type CaregiverOverview = {
  patient: {
    id: string;
    name: string;
    email: string | null;
    photo_url: string | null;
    condition_notes: string | null;
  } | null;
  summary: {
    open_tasks: number;
    open_alerts: number;
    total_reports: number;
  };
};

type CaregiverNotification = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function CaregiverOverviewPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [overview, setOverview] = useState<CaregiverOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<CaregiverNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifySaving, setNotifySaving] = useState(false);
  const [patientName, setPatientName] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/caregiver/overview", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load overview");
      }

      const data = await res.json() as CaregiverOverview;
      setOverview(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load overview";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotifyError(null);

    try {
      const res = await authFetch("/api/caregiver/notifications", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load notifications");
      }

      const data = await res.json() as { notifications?: CaregiverNotification[]; patient_name?: string | null };
      setNotifications(data.notifications ?? []);
      setPatientName(data.patient_name ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notifications";
      setNotifyError(message);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void loadOverview();
    void loadNotifications();
  }, [loadOverview, loadNotifications, idToken, isReady]);

  const patientLabel = useMemo(() => {
    if (!overview?.patient) return "No patient linked.";
    return `${overview.patient.name}${overview.patient.email ? ` · ${overview.patient.email}` : ""}`;
  }, [overview]);

  const notifyPatientLabel = useMemo(() => {
    return overview?.patient?.name ?? patientName ?? "Linked patient";
  }, [overview, patientName]);

  const canSend = notifyTitle.trim().length > 1;

  const sendNotification = useCallback(async () => {
    if (!canSend) return;

    setNotifySaving(true);
    setNotifyError(null);

    try {
      const res = await authFetch("/api/caregiver/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: notifyTitle.trim(), body: notifyBody.trim() || null }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to send notification");
      }

      const data = await res.json() as { notification?: CaregiverNotification };
      if (data.notification) {
        setNotifications((prev) => [data.notification as CaregiverNotification, ...prev]);
      }

      setNotifyTitle("");
      setNotifyBody("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send notification";
      setNotifyError(message);
    } finally {
      setNotifySaving(false);
    }
  }, [canSend, notifyBody, notifyTitle]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Caregiver Overview
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>{patientLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
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
        <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading overview...</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl p-4" style={glassCard}>
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Patient</div>
            <div className="text-sm mt-2" style={{ color: "var(--nt-text-md)" }}>
              {overview?.patient?.name ?? "Unassigned"}
            </div>
            {overview?.patient?.condition_notes && (
              <div className="text-xs mt-2" style={{ color: "var(--nt-text-lo)" }}>
                {overview.patient.condition_notes}
              </div>
            )}
          </div>
          <div className="rounded-2xl p-4" style={glassCard}>
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Open Tasks</div>
            <div className="text-2xl mt-2" style={{ color: "var(--nt-text-hi)", fontWeight: 700 }}>
              {overview?.summary.open_tasks ?? 0}
            </div>
          </div>
          <div className="rounded-2xl p-4" style={glassCard}>
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Open Alerts</div>
            <div className="text-2xl mt-2" style={{ color: "var(--nt-text-hi)", fontWeight: 700 }}>
              {overview?.summary.open_alerts ?? 0}
            </div>
          </div>
          <div className="rounded-2xl p-4 lg:col-span-3" style={glassCard}>
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Report History</div>
            <div className="text-sm mt-2" style={{ color: "var(--nt-text-md)" }}>
              {overview?.summary.total_reports ?? 0} total analysis reports.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] mt-4">
        <div className="rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Notify Patient</div>
            <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>{notifyPatientLabel}</span>
          </div>
          {notifyError && (
            <div className="mb-3 rounded-lg px-3 py-2" style={{ border: "1px solid rgba(216,90,48,0.35)", color: "#D85A30" }}>
              {notifyError}
            </div>
          )}
          <div className="grid gap-2">
            <input
              value={notifyTitle}
              onChange={(event) => setNotifyTitle(event.target.value)}
              placeholder="Title"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
            />
            <textarea
              value={notifyBody}
              onChange={(event) => setNotifyBody(event.target.value)}
              placeholder="Message"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 90 }}
            />
            <button
              type="button"
              onClick={() => void sendNotification()}
              disabled={!canSend || notifySaving}
              className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
            >
              {notifySaving ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={glassCard}>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Sent Notifications</div>
          </div>
          {notificationsLoading ? (
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
