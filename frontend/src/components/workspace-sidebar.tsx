"use client";
import * as React from "react";
import { Activity, Brain, Clock, FileText, Heart, HelpCircle, LayoutDashboard, Mic, Plus, Shield, Bell, Users, Stethoscope, ClipboardList, TrendingUp, UserPlus, Search, MessageSquare, User } from "lucide-react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
type NavItem = { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; url: string; badge?: number };
type WorkspaceSidebarProps = {
  onNewAnalysis?: () => void;
  onNavItemClick?: (item: NavItem) => void;
  activePage?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  role?: "patient" | "caregiver" | "provider" | null;
  uniquePatientId?: string | null;
};
const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  patient: { label: "Patient", color: "#14b8a6", bg: "rgba(20,184,166,0.1)" },
  caregiver: { label: "Caregiver", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  provider: { label: "Provider", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
};
export function WorkspaceSidebar({
  onNewAnalysis,
  onNavItemClick,
  activePage = "analysis",
  userName = "Researcher",
  userEmail = "",
  onLogout,
  role = "patient",
  uniquePatientId,
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
      { title: "Patient Overview", icon: Heart, url: "#" },
      { title: "Patient Link", icon: UserPlus, url: "#" },
      { title: "Insights", icon: TrendingUp, url: "#" },
      { title: "Care Network", icon: Users, url: "#" },
      { title: "Alerts", icon: Shield, url: "#" },
      { title: "Notifications", icon: Bell, url: "#", badge: notificationCount },
      { title: "Communications", icon: MessageSquare, url: "#" },
      { title: "Care Tasks", icon: ClipboardList, url: "#" },
      { title: "Reports", icon: FileText, url: "#" },
    ]
    : role === "provider"
      ? [
        { title: "Roster", icon: Users, url: "#" },
        { title: "Manage Roster", icon: UserPlus, url: "#" },
        { title: "Patient Records", icon: FileText, url: "#" },
        { title: "Patient Trends", icon: TrendingUp, url: "#" },
        { title: "Orders", icon: ClipboardList, url: "#" },
        { title: "Communications", icon: MessageSquare, url: "#" },
        { title: "Notifications", icon: Bell, url: "#" },
        { title: "Speech Analysis", icon: Stethoscope, url: "#" },
      ]
      : [
        { title: "New Analysis", icon: Plus, url: "#" },
        { title: "Dashboard", icon: LayoutDashboard, url: "#" },
        { title: "History", icon: Clock, url: "#" },
        { title: "Communications", icon: MessageSquare, url: "#" },
      ];
  const navSecondary: NavItem[] = role === "patient"
    ? [
      { title: "Memory Lane", icon: Brain, url: "#" },
      { title: "Cognitive Assessments", icon: Search, url: "#" },
      { title: "Notifications", icon: Bell, url: "#", badge: notificationCount },
      { title: "Safety Center", icon: Shield, url: "#" },
      { title: "Health Tasks", icon: ClipboardList, url: "#" },
      { title: "My Records", icon: FileText, url: "#" },
      { title: "Access Requests", icon: Users, url: "#" },
      { title: "About", icon: HelpCircle, url: "#" },
    ]
    : [
      { title: "About", icon: HelpCircle, url: "#" },
    ];
  const handleClick = (item: NavItem) => {
    if (item.title === "New Analysis") {
      onNewAnalysis?.();
    } else {
      onNavItemClick?.(item);
    }
  };
  const roleBadge = role ? ROLE_BADGES[role] : null;
  return (
    <aside className="sidebar-content-scrim flex flex-col h-full w-[240px] shrink-0 py-4 px-2 gap-1">
      <div className="px-3 py-3 mb-1">
        <div className="flex items-center gap-2">
          <Brain size={18} style={{ color: "var(--nt-icon)" }} />
          <span className="text-xl font-semibold tracking-tight" style={{ color: "var(--nt-text-hi)" }}>
            cortexflow
          </span>
        </div>
        {roleBadge && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleBadge.color }} />
            <span className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: roleBadge.color }}>
              {roleBadge.label}
            </span>
          </div>
        )}
      </div>
      {role === "patient" && (
        <button
          onClick={() => handleClick(navMain[0])}
          className="nt-nav-btn mx-1 mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium"
          style={{ border: "1px solid var(--nt-glass-border)" }}
        >
          <Mic size={14} />
          New Analysis
        </button>
      )}
      <div className="flex flex-col px-1">
        {(role === "patient" ? navMain.slice(1) : navMain).map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.title.toLowerCase();
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className={`nt-nav-btn flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] w-full text-left ${isActive ? "nt-active" : ""}`}
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
      <div className="mt-2 mb-1 px-3">
        <span
          className="text-[10px] uppercase tracking-widest font-medium"
          style={{ color: "var(--nt-text-ghost)" }}
        >
          {role === "patient" ? "Analysis" : "Tools"}
        </span>
      </div>
      {role === "patient" && (
        <div className="flex flex-col px-1">
          {[
            { title: "Brain Regions", icon: Brain, url: "#" },
            { title: "Biomarkers", icon: Activity, url: "#" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={() => handleClick(item)}
                className="nt-nav-btn flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] w-full text-left"
              >
                <Icon size={15} />
                {item.title}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex-1" />
      {role === "patient" && uniquePatientId && (
        <div className="mx-2 mb-2 px-3 py-2 rounded-xl flex items-center justify-between" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
          <div>
            <div className="text-[9px] uppercase font-semibold" style={{ color: "#14b8a6", letterSpacing: "0.1em" }}>Patient ID</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: "var(--nt-text-hi)", letterSpacing: "0.1em" }}>{uniquePatientId}</div>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(uniquePatientId);
                const btn = document.getElementById("copy-pid-btn");
                if (btn) {
                  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                  setTimeout(() => {
                    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                  }, 2000);
                }
              } catch (e) {
                console.error("Failed to copy", e);
              }
            }}
            id="copy-pid-btn"
            className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            title="Copy Patient ID"
            style={{ color: "#14b8a6" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      )}
      <div className="flex flex-col px-1 mb-2">
        {navSecondary.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className="nt-nav-btn flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] w-full text-left"
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
      <div className="mx-1">
        <button
          type="button"
          onClick={() => {
            setShowAccountActions((prev) => !prev);
          }}
          className="nt-nav-btn w-full flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer text-left"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{
              background: roleBadge ? roleBadge.bg : "var(--nt-active)",
              color: roleBadge ? roleBadge.color : "var(--nt-text-lo)",
              border: `1px solid ${roleBadge ? `${roleBadge.color}33` : "var(--nt-divider)"}`,
            }}
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
        {showAccountActions && (
          <div className="mt-1 ml-8 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => onNavItemClick?.({ title: "Profile", icon: User, url: "#" })}
              className="px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: "var(--nt-text-hi)" }}
            >
              <User size={10} />
              My Profile
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5"
                style={{
                  color: "#D85A30",
                  border: "1px solid rgba(216, 90, 48, 0.28)",
                  background: "rgba(216, 90, 48, 0.08)",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M6.5 3V2a1 1 0 00-1-1H2a1 1 0 00-1 1v6a1 1 0 001 1h3.5a1 1 0 001-1V7" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" /><path d="M4 5h5M8 3.5L9.5 5 8 6.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
