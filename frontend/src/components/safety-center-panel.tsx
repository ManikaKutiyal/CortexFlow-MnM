"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useGlobalRefresh } from "@/providers/refresh-provider";
type EmergencyEvent = {
  id: string;
  patient_id: string;
  urgency: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved";
  location: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
  photo_url: string | null;
  email_sent: boolean | null;
};
type FaceMatch = {
  face_id: string;
  person_name: string;
  relationship: string;
  confidence: number;
  face_location?: number[];
};
type FaceLandmarkResponse = {
  success: boolean;
  results?: FaceMatch[];
  error?: string;
};
const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};
const URGENCY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  low: { color: "#1D9E75", bg: "rgba(29,158,117,0.08)", border: "rgba(29,158,117,0.2)", label: "Low" },
  medium: { color: "#BA7517", bg: "rgba(186,117,23,0.08)", border: "rgba(186,117,23,0.2)", label: "Medium" },
  high: { color: "#D85A30", bg: "rgba(216,90,48,0.08)", border: "rgba(216,90,48,0.2)", label: "High" },
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", label: "Critical" },
};
function WebcamCapture({ onCapture, onClose }: { onCapture: (dataUrl: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }).then((stream) => {
      if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => {});
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  }, [onCapture]);
  return (
    <div className="rounded-xl overflow-hidden animate-scale-in" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} />
      <div className="flex gap-2 p-2.5">
        <button
          type="button"
          onClick={capture}
          className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
          style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" /></svg>
          Capture
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-xs"
          style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
function ShimmerRow() {
  return (
    <div className="rounded-xl px-3 py-3 flex flex-col gap-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
      <div className="h-3 w-32 rounded animate-shimmer" />
      <div className="h-2.5 w-48 rounded animate-shimmer" style={{ animationDelay: "0.15s" }} />
    </div>
  );
}
export function SafetyCenterPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [sosUrgency, setSosUrgency] = useState<EmergencyEvent["urgency"]>("high");
  const [sosLocation, setSosLocation] = useState("");
  const [sosDetail, setSosDetail] = useState("");
  const [sosPhoto, setSosPhoto] = useState<string | null>(null);
  const [showSosWebcam, setShowSosWebcam] = useState(false);
  const [sosSaving, setSosSaving] = useState(false);
  const [sosEmailSent, setSosEmailSent] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerRelationship, setRegisterRelationship] = useState("");
  const [registerImage, setRegisterImage] = useState<string | null>(null);
  const [showRegisterWebcam, setShowRegisterWebcam] = useState(false);
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);
  const [recognizeImage, setRecognizeImage] = useState<string | null>(null);
  const [showRecognizeWebcam, setShowRecognizeWebcam] = useState(false);
  const [recognizeStatus, setRecognizeStatus] = useState<string | null>(null);
  const [recognizeMatches, setRecognizeMatches] = useState<FaceMatch[]>([]);
  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const res = await authFetch("/api/safety/events", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(await res.text() || "Failed to load events");
      const data = await res.json() as { events?: EmergencyEvent[] };
      setEvents(data.events ?? []);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!isReady) return;
    void loadEvents();
  }, [loadEvents, idToken, isReady]);

  useGlobalRefresh(() => {
    if (isReady) void loadEvents();
  });
  const eventSummary = useMemo(() => {
    if (!events.length) return null;
    const openCount = events.filter((e) => e.status === "open").length;
    return { open: openCount, total: events.length };
  }, [events]);
  const submitSos = useCallback(async () => {
    setSosSaving(true);
    setSosEmailSent(false);
    setEventsError(null);
    const payload = {
      urgency: sosUrgency,
      location: sosLocation.trim() || null,
      detail: sosDetail.trim() || null,
      photo: sosPhoto ?? undefined,
    };
    try {
      const res = await authFetch("/api/safety/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to create event");
      const data = await res.json() as { event?: EmergencyEvent };
      if (data.event) {
        setEvents((prev) => [data.event as EmergencyEvent, ...prev]);
        if (data.event.email_sent) setSosEmailSent(true);
      }
      setSosDetail("");
      setSosLocation("");
      setSosPhoto(null);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSosSaving(false);
    }
  }, [sosDetail, sosLocation, sosUrgency, sosPhoto]);
  const handleFileToBase64 = useCallback(async (file: File): Promise<string> => {
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }, []);
  const registerFace = useCallback(async () => {
    setRegisterStatus(null);
    if (!registerImage || !registerName.trim()) {
      setRegisterStatus("Provide a name and face image.");
      return;
    }
    const payload = {
      imageData: registerImage,
      personName: registerName.trim(),
      relationship: registerRelationship.trim() || "Unknown",
      additionalInfo: "",
    };
    const res = await authFetch("/api/safety/face/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setRegisterStatus(await res.text() || "Failed to register face");
      return;
    }
    setRegisterStatus("Face registered successfully.");
    setRegisterName("");
    setRegisterRelationship("");
    setRegisterImage(null);
  }, [registerImage, registerName, registerRelationship]);
  const recognizeFace = useCallback(async () => {
    setRecognizeStatus(null);
    setRecognizeMatches([]);
    if (!recognizeImage) {
      setRecognizeStatus("Upload or capture a face image to recognize.");
      return;
    }
    const res = await authFetch("/api/safety/face/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData: recognizeImage }),
    });
    if (!res.ok) {
      setRecognizeStatus(await res.text() || "Failed to recognize face");
      return;
    }
    const data = await res.json() as FaceLandmarkResponse;
    if (!data.success) {
      setRecognizeStatus(data.error || "No matches found");
      return;
    }
    setRecognizeMatches(data.results ?? []);
  }, [recognizeImage]);
  const urgencyConf = URGENCY_CONFIG[sosUrgency] ?? URGENCY_CONFIG.high;
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex flex-col gap-1.5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(216,90,48,0.15), rgba(239,68,68,0.15))", border: "1px solid rgba(216,90,48,0.2)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1l1.5 3h3.5l-2.5 2.5 1 3.5L8 8l-3.5 2 1-3.5L3 4h3.5L8 1z" stroke="#D85A30" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
              Safety Center
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="rounded-lg px-3 py-1.5 text-[11px] flex items-center gap-1.5"
            style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 6A4.5 4.5 0 016 1.5M10.5 6A4.5 4.5 0 016 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M6 1.5l1.5 1.5L6 4.5M6 10.5L4.5 9 6 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Refresh
          </button>
        </div>
        {eventSummary && (
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--nt-text-xs)" }}>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: eventSummary.open > 0 ? "#D85A30" : "#1D9E75" }} />
              {eventSummary.open} open
            </span>
            <span>{eventSummary.total} total events</span>
          </div>
        )}
      </div>
      {eventsError && (
        <div className="mb-4 rounded-xl px-3.5 py-2.5 flex items-center gap-2 animate-slide-up-fade" style={{ border: "1px solid rgba(216,90,48,0.25)", background: "rgba(216,90,48,0.06)", color: "#D85A30" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" /><path d="M7 4v3M7 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span className="text-xs">{eventsError}</span>
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl overflow-hidden glass-card-hover" style={glassCard}>
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${urgencyConf.color}, rgba(239,68,68,0.6))` }} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v5l3 3" stroke={urgencyConf.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="8" r="6.5" stroke={urgencyConf.color} strokeWidth="1.2" /></svg>
                  <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Emergency SOS</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide" style={{ background: urgencyConf.bg, color: urgencyConf.color, border: `1px solid ${urgencyConf.border}` }}>
                  {urgencyConf.label}
                </span>
              </div>
              <div className="grid gap-2.5">
                <select
                  value={sosUrgency}
                  onChange={(e) => setSosUrgency(e.target.value as EmergencyEvent["urgency"])}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                >
                  <option value="low">Low urgency</option>
                  <option value="medium">Medium urgency</option>
                  <option value="high">High urgency</option>
                  <option value="critical">Critical urgency</option>
                </select>
                <input
                  value={sosLocation}
                  onChange={(e) => setSosLocation(e.target.value)}
                  placeholder="Location (optional)"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
                <textarea
                  value={sosDetail}
                  onChange={(e) => setSosDetail(e.target.value)}
                  placeholder="Describe the situation…"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 80, resize: "vertical" }}
                />
                {!showSosWebcam && (
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => setShowSosWebcam(true)}
                      className="rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
                      style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" /><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.1" /></svg>
                      {sosPhoto ? "Retake" : "Attach Photo"}
                    </button>
                    <label className="rounded-lg px-3 py-2 text-xs cursor-pointer flex items-center gap-1.5" style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-ghost)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setSosPhoto(await handleFileToBase64(file));
                        }}
                      />
                    </label>
                  </div>
                )}
                {showSosWebcam && (
                  <WebcamCapture
                    onCapture={(url) => { setSosPhoto(url); setShowSosWebcam(false); }}
                    onClose={() => setShowSosWebcam(false)}
                  />
                )}
                {sosPhoto && !showSosWebcam && (
                  <div className="relative rounded-xl overflow-hidden animate-scale-in" style={{ maxHeight: 120 }}>
                    <img src={sosPhoto} alt="SOS photo" style={{ width: "100%", objectFit: "cover", maxHeight: 120 }} />
                    <button
                      type="button"
                      onClick={() => setSosPhoto(null)}
                      className="absolute top-1.5 right-1.5 rounded-full w-6 h-6 text-xs flex items-center justify-center backdrop-blur-sm"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {sosEmailSent && (
                  <div className="flex items-center gap-2 text-xs rounded-xl px-3.5 py-2.5 animate-slide-up-fade" style={{ background: "rgba(29,158,117,0.08)", color: "#1D9E75", border: "1px solid rgba(29,158,117,0.2)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 7l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Email notifications sent to your linked caregiver / provider.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void submitSos()}
                  disabled={sosSaving}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${sosSaving ? "" : "animate-sos-pulse"}`}
                  style={{ background: "linear-gradient(135deg, #D85A30, #ef4444)", color: "#fff" }}
                >
                  {sosSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending Alert…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v6M8 11v1M3 4l2 2M11 4l-2 2M1 8h2M13 8h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      Trigger SOS
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-4 glass-card-hover" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M3 3.5l4 3.5M7 7l4-3.5M3 10.5l4-3.5M7 7l4 3.5" stroke="var(--nt-text-lo)" strokeWidth="1" strokeLinecap="round" /></svg>
                <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Emergency Timeline</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>
                {events.length} events
              </span>
            </div>
            {eventsLoading ? (
              <div className="grid gap-2"><ShimmerRow /><ShimmerRow /></div>
            ) : events.length === 0 ? (
              <div className="py-6 text-center" style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 opacity-40"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 8v4M12 16v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                No events logged yet.
              </div>
            ) : (
              <div className="grid gap-2">
                {events.map((event, i) => {
                  const ec = URGENCY_CONFIG[event.urgency] ?? URGENCY_CONFIG.high;
                  return (
                    <div
                      key={event.id}
                      className="rounded-xl px-3.5 py-2.5 flex items-start gap-3 animate-stagger-in"
                      style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)", animationDelay: `${i * 40}ms` }}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: ec.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold" style={{ color: ec.color }}>{event.urgency.toUpperCase()}</span>
                            <span className="px-1.5 py-px rounded text-[9px]" style={{ background: event.status === "open" ? ec.bg : "var(--nt-hover)", color: event.status === "open" ? ec.color : "var(--nt-text-ghost)", border: `1px solid ${event.status === "open" ? ec.border : "var(--nt-divider)"}` }}>
                              {event.status}
                            </span>
                            {event.email_sent && <span className="text-[9px] font-mono" style={{ color: "#1D9E75" }}>✓ emailed</span>}
                          </div>
                          <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--nt-text-ghost)" }}>
                            {new Date(event.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {event.location && <div className="text-xs mt-1" style={{ color: "var(--nt-text-lo)" }}>{event.location}</div>}
                        {event.details && <div className="text-xs mt-1" style={{ color: "var(--nt-text-xs)" }}>{String(event.details?.detail ?? "")}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl overflow-hidden glass-card-hover" style={glassCard}>
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="3" stroke="var(--nt-text-lo)" strokeWidth="1.2" /><path d="M2 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="var(--nt-text-lo)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Register Face</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>family safety</span>
              </div>
              <div className="grid gap-2.5">
                <input
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="Person name"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
                <input
                  value={registerRelationship}
                  onChange={(e) => setRegisterRelationship(e.target.value)}
                  placeholder="Relationship (e.g. Daughter, Son)"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
                {!showRegisterWebcam && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRegisterWebcam(true)}
                      className="rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
                      style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" /><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.1" /></svg>
                      Webcam
                    </button>
                    <label className="rounded-lg px-3 py-2 text-xs cursor-pointer flex items-center gap-1.5" style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-ghost)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setRegisterImage(await handleFileToBase64(file));
                        }}
                      />
                    </label>
                  </div>
                )}
                {showRegisterWebcam && (
                  <WebcamCapture
                    onCapture={(url) => { setRegisterImage(url); setShowRegisterWebcam(false); }}
                    onClose={() => setShowRegisterWebcam(false)}
                  />
                )}
                {registerImage && !showRegisterWebcam && (
                  <div className="relative rounded-xl overflow-hidden animate-scale-in" style={{ maxHeight: 100 }}>
                    <img src={registerImage} alt="Face preview" style={{ width: "100%", objectFit: "cover", maxHeight: 100 }} />
                    <button
                      type="button"
                      onClick={() => setRegisterImage(null)}
                      className="absolute top-1.5 right-1.5 rounded-full w-6 h-6 text-xs flex items-center justify-center backdrop-blur-sm"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {registerStatus && (
                  <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: registerStatus.includes("success") ? "rgba(29,158,117,0.08)" : "rgba(216,90,48,0.08)", color: registerStatus.includes("success") ? "#1D9E75" : "#D85A30", border: `1px solid ${registerStatus.includes("success") ? "rgba(29,158,117,0.2)" : "rgba(216,90,48,0.2)"}` }}>
                    {registerStatus.includes("success") ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M6 3.5v2.5M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    )}
                    {registerStatus}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void registerFace()}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M2 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                  Register Face
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden glass-card-hover" style={glassCard}>
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #14b8a6, #22d3ee)" }} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="var(--nt-text-lo)" strokeWidth="1.2" /><circle cx="7" cy="7" r="2.5" stroke="var(--nt-text-lo)" strokeWidth="1.2" /><path d="M1 4h12M1 10h12M4 1v12M10 1v12" stroke="var(--nt-text-lo)" strokeWidth="0.5" opacity="0.3" /></svg>
                  <span style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-syne)" }}>Recognize Face</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ color: "var(--nt-text-ghost)", background: "var(--nt-hover)" }}>live match</span>
              </div>
              <div className="grid gap-2.5">
                {!showRecognizeWebcam && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRecognizeWebcam(true)}
                      className="rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
                      style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" /><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.1" /></svg>
                      Webcam
                    </button>
                    <label className="rounded-lg px-3 py-2 text-xs cursor-pointer flex items-center gap-1.5" style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-ghost)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setRecognizeImage(await handleFileToBase64(file));
                        }}
                      />
                    </label>
                  </div>
                )}
                {showRecognizeWebcam && (
                  <WebcamCapture
                    onCapture={(url) => { setRecognizeImage(url); setShowRecognizeWebcam(false); }}
                    onClose={() => setShowRecognizeWebcam(false)}
                  />
                )}
                {recognizeImage && !showRecognizeWebcam && (
                  <div className="relative rounded-xl overflow-hidden animate-scale-in" style={{ maxHeight: 100 }}>
                    <img src={recognizeImage} alt="Recognize preview" style={{ width: "100%", objectFit: "cover", maxHeight: 100 }} />
                    <button
                      type="button"
                      onClick={() => setRecognizeImage(null)}
                      className="absolute top-1.5 right-1.5 rounded-full w-6 h-6 text-xs flex items-center justify-center backdrop-blur-sm"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {recognizeStatus && (
                  <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: "rgba(216,90,48,0.08)", color: "#D85A30", border: "1px solid rgba(216,90,48,0.2)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" /><path d="M6 3.5v2.5M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    {recognizeStatus}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void recognizeFace()}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" /></svg>
                  Run Recognition
                </button>
              </div>
              {recognizeMatches.length > 0 && (
                <div className="grid gap-2 mt-3">
                  {recognizeMatches.map((match, i) => (
                    <div
                      key={match.face_id}
                      className="rounded-xl px-3.5 py-2.5 flex items-center gap-3 animate-stagger-in"
                      style={{ border: "1px solid rgba(29,158,117,0.2)", background: "rgba(29,158,117,0.04)", animationDelay: `${i * 60}ms` }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.2)" }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="3" stroke="#1D9E75" strokeWidth="1.2" /><path d="M2 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="#1D9E75" strokeWidth="1.2" strokeLinecap="round" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold" style={{ color: "var(--nt-text-hi)" }}>{match.person_name}</div>
                        <div className="text-xs" style={{ color: "var(--nt-text-lo)" }}>{match.relationship}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold" style={{ color: "#1D9E75" }}>{(match.confidence * 100).toFixed(1)}%</div>
                        <div className="text-[9px] font-mono" style={{ color: "var(--nt-text-ghost)" }}>confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
