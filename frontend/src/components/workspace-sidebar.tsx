"use client";
import * as React from "react";
import { Activity, Brain, Clock, FileText, HelpCircle, LayoutDashboard, Mic, Plus } from "lucide-react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type NavItem = { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; url: string; badge?: number };
{}
type WorkspaceSidebarProps = {
  onNewAnalysis?: () => void;
  onNavItemClick?: (item: NavItem) => void;
  activePage?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  role?: "patient" | "caregiver" | "provider" | null;
};
{}
export function WorkspaceSidebar({
  onNewAnalysis,
  onNavItemClick,
  activePage = "analysis",
  userName = "Researcher",
  userEmail = "",
  onLogout,
  role = "patient",
}: WorkspaceSidebarProps) {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [showAccountActions, setShowAccountActions] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(0);

  const loadNotificationCount = React.useCallback(async () => {
    if (role !== "patient" && role !== "caregiver") {
      setNotificationCount(0);
      return;
    }

    try {
      const res = await authFetch("/api/notifications", { method: "GET", cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { notifications?: Array<{ read_at: string | null }> };
      const unread = (data.notifications ?? []).filter((item) => !item.read_at).length;
      setNotificationCount(unread);
    } catch {
      setNotificationCount(0);
    }
  }, [role]);

  React.useEffect(() => {
    if (!isReady) return;
    void loadNotificationCount();
  }, [loadNotificationCount, idToken, isReady]);

  const navMain: NavItem[] = role === "caregiver"
    ? [
      { title: "Dashboard", icon: LayoutDashboard, url: "#" },
      { title: "Patient Overview", icon: Brain, url: "#" },
      { title: "Insights", icon: Brain, url: "#" },
      { title: "Care Network", icon: Activity, url: "#" },
      { title: "Alerts", icon: Activity, url: "#" },
      { title: "Notifications", icon: Activity, url: "#", badge: notificationCount },
      { title: "Care Tasks", icon: Clock, url: "#" },
      { title: "Reports", icon: FileText, url: "#" },
    ]
    : role === "provider"
      ? [
        { title: "Roster", icon: LayoutDashboard, url: "#" },
        { title: "Patient Records", icon: FileText, url: "#" },
        { title: "Patient Trends", icon: Brain, url: "#" },
        { title: "Orders", icon: Clock, url: "#" },
        { title: "Notifications", icon: Activity, url: "#" },
        { title: "Reports", icon: FileText, url: "#" },
        { title: "Speech Analysis", icon: Brain, url: "#" },
      ]
      : [
        { title: "New Analysis", icon: Plus, url: "#" },
        { title: "Dashboard", icon: LayoutDashboard, url: "#" },
        { title: "History", icon: Clock, url: "#" },
        { title: "Reports", icon: FileText, url: "#" },
      ];

  const navSecondary: NavItem[] = role === "patient"
    ? [
      { title: "Memory Lane", icon: HelpCircle, url: "#" },
      { title: "Cognitive Assessments", icon: Brain, url: "#" },
      { title: "Notifications", icon: Activity, url: "#", badge: notificationCount },
      { title: "Safety Center", icon: Activity, url: "#" },
      { title: "Health Tasks", icon: Clock, url: "#" },
      { title: "About", icon: HelpCircle, url: "#" },
    ]
    : [
      { title: "About", icon: HelpCircle, url: "#" },
    ];

  const handleClick = (item: NavItem) => {
    if (item.title === "New Analysis") onNewAnalysis?.();
    onNavItemClick?.(item);
  };

  return (
    <aside className="sidebar-content-scrim flex flex-col h-full w-[240px] shrink-0 py-4 px-2 gap-1">
      {/* Logo */}
      <div className="px-3 py-3 mb-2">
        <div className="flex items-center gap-2">
          <Brain size={18} style={{ color: "var(--nt-icon)" }} />
          <span className="text-xl font-semibold tracking-tight" style={{ color: "var(--nt-text-hi)" }}>
            cortexflow
          </span>
        </div>
      </div>
{}
      {/* New Analysis button */}
      {role === "patient" && (
        <button
          onClick={() => handleClick(navMain[0])}
          className="nt-nav-btn mx-1 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
          style={{ border: "1px solid var(--nt-glass-border)" }}
        >
          <Mic size={14} />
          New Analysis
        </button>
      )}
      {/* Main nav */}
      <div className="flex flex-col gap-0.5 px-1">
        {(role === "patient" ? navMain.slice(1) : navMain).map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.title.toLowerCase();
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className={`nt-nav-btn flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm w-full text-left ${isActive ? "nt-active" : ""}`}
            >
              <Icon size={15} />
              <span className="flex-1">{item.title}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(29,158,117,0.18)", color: "#1D9E75" }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section label */}
      <div className="mt-4 mb-1 px-4">
        <span
          className="text-[10px] uppercase tracking-widest font-medium"
          style={{ color: "var(--nt-text-ghost)" }}
        >
          {role === "patient" ? "Analysis" : "Tools"}
        </span>
      </div>
{}
      {role === "patient" && (
        <div className="flex flex-col gap-0.5 px-1">
          {[
            { title: "Brain Regions", icon: Brain, url: "#" },
            { title: "Biomarkers", icon: Activity, url: "#" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={() => handleClick(item)}
                className="nt-nav-btn flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm w-full text-left"
              >
                <Icon size={15} />
                {item.title}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1" />
{}
      {/* Secondary nav */}
      <div className="flex flex-col gap-0.5 px-1 mb-2">
        {navSecondary.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className="nt-nav-btn flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm w-full text-left"
            >
              <Icon size={15} />
              <span className="flex-1">{item.title}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(29,158,117,0.18)", color: "#1D9E75" }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* User */}
      <div className="mx-1">
        <button
          type="button"
          onClick={() => {
            if (!onLogout) return;
            setShowAccountActions((prev) => !prev);
          }}
          className="nt-nav-btn w-full flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer text-left"
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
            style={{ background: "var(--nt-active)", color: "var(--nt-text-lo)" }}
          >
            {userName?.[0]?.toUpperCase() ?? "R"}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium truncate" style={{ color: "var(--nt-text-md)" }}>{userName}</span>
            {userEmail && (
              <span className="text-[10px] truncate" style={{ color: "var(--nt-text-ghost)" }}>{userEmail}</span>
            )}
          </div>
        </button>

        {showAccountActions && onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-1 ml-8 px-2.5 py-1 rounded-md text-[10px] font-medium"
            style={{
              color: "#D85A30",
              border: "1px solid rgba(216, 90, 48, 0.28)",
              background: "rgba(216, 90, 48, 0.08)",
            }}
          >
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}
