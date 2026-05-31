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
const glass: React.CSSProperties = {
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
      if (!res.ok) throw new Error(await res.text() || "Failed to load overview");
      const data = await res.json() as CaregiverOverview;
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setIsLoading(false);
    }
  }, []);
  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotifyError(null);
    try {
      const res = await authFetch("/api/caregiver/notifications", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text() || "Failed to load notifications");
      const data = await res.json() as { notifications?: CaregiverNotification[]; patient_name?: string | null };
      setNotifications(data.notifications ?? []);
      setPatientName(data.patient_name ?? null);
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : "Failed to load notifications");
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
      if (!res.ok) throw new Error(await res.text() || "Failed to send notification");
      const data = await res.json() as { notification?: CaregiverNotification };
      if (data.notification) setNotifications((prev) => [data.notification as CaregiverNotification, ...prev]);
      setNotifyTitle("");
      setNotifyBody("");
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setNotifySaving(false);
    }
  }, [canSend, notifyBody, notifyTitle]);
  const STAT_CARDS = [
    {
      label: "Open Tasks",
      value: overview?.summary.open_tasks ?? 0,
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
    },
    {
      label: "Open Alerts",
      value: overview?.summary.open_alerts ?? 0,
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l5.5 9.5H2.5L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M8 7v2M8 11v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
      color: (overview?.summary.open_alerts ?? 0) > 0 ? "#D85A30" : "#1D9E75",
      bg: (overview?.summary.open_alerts ?? 0) > 0 ? "rgba(216,90,48,0.08)" : "rgba(29,158,117,0.08)",
    },
    {
      label: "Total Reports",
      value: overview?.summary.total_reports ?? 0,
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" /><path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" /></svg>,
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.08)",
    },
  ];
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: 18 }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3C5.5 3 3.5 5.5 3.5 8C3.5 12 8 15 8 15C8 15 12.5 12 12.5 8C12.5 5.5 10.5 3 8 3Z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="8" cy="7.5" r="1.5" fill="#f59e0b" />
            </svg>
          </div>
          <div>
            <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
              Caregiver Overview
            </h1>
            <p className="text-[11px]" style={{ color: "var(--nt-text-xs)" }}>{patientLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
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
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl p-4" style={glass}>
              <div className="h-3 w-20 rounded animate-shimmer mb-3" />
              <div className="h-6 w-12 rounded animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {overview?.patient && (
            <div className="rounded-2xl overflow-hidden mb-4 glass-card-hover animate-scale-in" style={{ ...glass, borderColor: "rgba(245,158,11,0.2)" }}>
              <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
              <div className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 18 }}>{overview.patient.name[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div style={{ color: "var(--nt-text-hi)", fontSize: 16, fontWeight: 600, fontFamily: "var(--font-syne)" }}>{overview.patient.name}</div>
                  {overview.patient.email && <div className="text-xs mt-0.5" style={{ color: "var(--nt-text-ghost)" }}>{overview.patient.email}</div>}
                  {overview.patient.condition_notes && <div className="text-xs mt-1" style={{ color: "var(--nt-text-lo)" }}>{overview.patient.condition_notes}</div>}
                </div>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            {STAT_CARDS.map((card, i) => (
              <div key={card.label} className="rounded-2xl p-4 glass-card-hover animate-stagger-in" style={{ ...glass, animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: card.color }}>{card.icon}</span>
                  <span className="text-[9px] uppercase font-mono tracking-wide" style={{ color: "var(--nt-text-ghost)" }}>{card.label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne)" }}>{card.value}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl overflow-hidden glass-card-hover" style={glass}>
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #3b82f6, #14b8a6)" }} />
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 11l4-4 3 3 3-5" stroke="var(--nt-text-lo)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Notify Patient</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>
                {notifyPatientLabel}
              </span>
            </div>
            {notifyError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(216,90,48,0.06)", border: "1px solid rgba(216,90,48,0.2)", color: "#D85A30" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M6 3.5v2.5M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                {notifyError}
              </div>
            )}
            <div className="grid gap-2.5">
              <input
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
              />
              <textarea
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                placeholder="Message body (optional)"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 90, resize: "vertical" }}
              />
              <button
                type="button"
                onClick={() => void sendNotification()}
                disabled={!canSend || notifySaving}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
              >
                {notifySaving ? (
                  <><div className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />Sending…</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 6-12 6V8l8-1-8-1V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-2xl p-4 glass-card-hover" style={glass}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3h10a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="var(--nt-text-lo)" strokeWidth="1.1" /><path d="M1 4l6 4 6-4" stroke="var(--nt-text-lo)" strokeWidth="1.1" /></svg>
              <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Sent Notifications</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>
              {notifications.length} sent
            </span>
          </div>
          {notificationsLoading ? (
            <div className="grid gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-xl px-3 py-3" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="h-3 w-28 rounded animate-shimmer" />
                  <div className="h-2.5 w-40 rounded animate-shimmer mt-2" style={{ animationDelay: "0.15s" }} />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center" style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 opacity-40"><path d="M3 8l9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" /></svg>
              No notifications sent yet.
            </div>
          ) : (
            <div className="grid gap-2">
              {notifications.map((n, i) => (
                <div
                  key={n.id}
                  className="rounded-xl px-3.5 py-2.5 animate-stagger-in"
                  style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)", animationDelay: `${i * 40}ms` }}
                >
                  <div className="text-sm font-semibold" style={{ color: "var(--nt-text-hi)" }}>{n.title}</div>
                  {n.body && <div className="text-xs mt-1" style={{ color: "var(--nt-text-lo)" }}>{n.body}</div>}
                  <div className="text-[10px] font-mono mt-1.5" style={{ color: "var(--nt-text-ghost)" }}>
                    {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
