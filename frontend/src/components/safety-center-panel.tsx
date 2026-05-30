"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

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

export function SafetyCenterPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [sosUrgency, setSosUrgency] = useState<EmergencyEvent["urgency"]>("high");
  const [sosLocation, setSosLocation] = useState("");
  const [sosDetail, setSosDetail] = useState("");
  const [sosSaving, setSosSaving] = useState(false);

  const [registerName, setRegisterName] = useState("");
  const [registerRelationship, setRegisterRelationship] = useState("");
  const [registerImage, setRegisterImage] = useState<string | null>(null);
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);

  const [recognizeImage, setRecognizeImage] = useState<string | null>(null);
  const [recognizeStatus, setRecognizeStatus] = useState<string | null>(null);
  const [recognizeMatches, setRecognizeMatches] = useState<FaceMatch[]>([]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);

    try {
      const res = await authFetch("/api/safety/events", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load events");
      }

      const data = await res.json() as { events?: EmergencyEvent[] };
      setEvents(data.events ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load events";
      setEventsError(message);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void loadEvents();
  }, [loadEvents, idToken, isReady]);

  const eventSummary = useMemo(() => {
    if (!events.length) return "No emergency events yet.";
    const openCount = events.filter((event) => event.status === "open").length;
    return `${openCount} open event${openCount === 1 ? "" : "s"}.`;
  }, [events]);

  const submitSos = useCallback(async () => {
    setSosSaving(true);
    setEventsError(null);

    const payload = {
      urgency: sosUrgency,
      location: sosLocation.trim() || null,
      detail: sosDetail.trim() || null,
    };

    try {
      const res = await authFetch("/api/safety/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to create event");
      }

      const data = await res.json() as { event?: EmergencyEvent };
      if (data.event) {
        setEvents((prev) => [data.event as EmergencyEvent, ...prev]);
      }

      setSosDetail("");
      setSosLocation("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create event";
      setEventsError(message);
    } finally {
      setSosSaving(false);
    }
  }, [sosDetail, sosLocation, sosUrgency]);

  const handleFileToBase64 = useCallback(async (file: File) => {
    const reader = new FileReader();

    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });

    return dataUrl;
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
      const message = await res.text();
      setRegisterStatus(message || "Failed to register face");
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
      setRecognizeStatus("Upload a face image to recognize.");
      return;
    }

    const res = await authFetch("/api/safety/face/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData: recognizeImage }),
    });

    if (!res.ok) {
      const message = await res.text();
      setRecognizeStatus(message || "Failed to recognize face");
      return;
    }

    const data = await res.json() as FaceLandmarkResponse;
    if (!data.success) {
      setRecognizeStatus(data.error || "No matches found");
      return;
    }

    setRecognizeMatches(data.results ?? []);
  }, [recognizeImage]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Safety Center
          </h1>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="rounded-lg px-3 py-1 text-[11px]"
            style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
          >
            Refresh
          </button>
        </div>
        <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>{eventSummary}</p>
      </div>

      {eventsError && (
        <div className="mb-4 rounded-lg px-3 py-2" style={{ border: "1px solid rgba(216,90,48,0.35)", color: "#D85A30" }}>
          {eventsError}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl p-4" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Emergency SOS</div>
              <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Instant alert</span>
            </div>
            <div className="grid gap-2">
              <select
                value={sosUrgency}
                onChange={(event) => setSosUrgency(event.target.value as EmergencyEvent["urgency"])}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
              >
                <option value="low">Low urgency</option>
                <option value="medium">Medium urgency</option>
                <option value="high">High urgency</option>
                <option value="critical">Critical urgency</option>
              </select>
              <input
                value={sosLocation}
                onChange={(event) => setSosLocation(event.target.value)}
                placeholder="Location (optional)"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
              />
              <textarea
                value={sosDetail}
                onChange={(event) => setSosDetail(event.target.value)}
                placeholder="What happened?"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 90 }}
              />
              <button
                type="button"
                onClick={() => void submitSos()}
                disabled={sosSaving}
                className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
              >
                {sosSaving ? "Sending..." : "Trigger SOS"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Emergency Timeline</div>
              <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Latest first</span>
            </div>
            {eventsLoading ? (
              <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading events...</div>
            ) : events.length === 0 ? (
              <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No events logged.</div>
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

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl p-4" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Register Face</div>
              <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Family safety</span>
            </div>
            <div className="grid gap-2">
              <input
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="Person name"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
              />
              <input
                value={registerRelationship}
                onChange={(event) => setRegisterRelationship(event.target.value)}
                placeholder="Relationship"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
              />
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await handleFileToBase64(file);
                  setRegisterImage(dataUrl);
                }}
                className="w-full text-xs"
              />
              {registerStatus && (
                <div className="text-xs" style={{ color: registerStatus.includes("success") ? "#1D9E75" : "#D85A30" }}>
                  {registerStatus}
                </div>
              )}
              <button
                type="button"
                onClick={() => void registerFace()}
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
              >
                Register Face
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Recognize Face</div>
              <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Live match</span>
            </div>
            <div className="grid gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await handleFileToBase64(file);
                  setRecognizeImage(dataUrl);
                }}
                className="w-full text-xs"
              />
              {recognizeStatus && (
                <div className="text-xs" style={{ color: "#D85A30" }}>{recognizeStatus}</div>
              )}
              <button
                type="button"
                onClick={() => void recognizeFace()}
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
              >
                Run Recognition
              </button>
            </div>
            {recognizeMatches.length > 0 && (
              <div className="grid gap-2 mt-3">
                {recognizeMatches.map((match) => (
                  <div key={match.face_id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                    <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                      {match.person_name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>
                      {match.relationship} · {(match.confidence * 100).toFixed(1)}% confidence
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
