"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  sender_name: string | null;
  created_at: string;
  read_at: string | null;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function UserNotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/notifications", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load notifications");
      }

      const data = await res.json() as { notifications?: NotificationItem[] };
      setNotifications(data.notifications ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notifications";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  const markRead = useCallback(async (notificationId: string) => {
    const res = await fetch(`/api/notifications/${notificationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });

    if (!res.ok) {
      const message = await res.text();
      setError(message || "Failed to mark as read");
      return;
    }

    const data = await res.json() as { notification?: NotificationItem };
    if (data.notification) {
      setNotifications((prev) => prev.map((item) => (item.id === notificationId ? data.notification as NotificationItem : item)));
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Notifications
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>{unreadCount} unread</p>
        </div>
        <button
          type="button"
          onClick={() => void loadNotifications()}
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
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No notifications yet.</div>
        ) : (
          <div className="grid gap-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                    {notification.title}
                  </div>
                  {!notification.read_at && (
                    <button
                      type="button"
                      onClick={() => void markRead(notification.id)}
                      className="rounded-lg px-2 py-1 text-[10px]"
                      style={{ border: "1px solid rgba(29,158,117,0.35)", color: "#1D9E75" }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
                {notification.body && (
                  <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{notification.body}</div>
                )}
                <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                  {notification.sender_name ? `From ${notification.sender_name} · ` : ""}{new Date(notification.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
