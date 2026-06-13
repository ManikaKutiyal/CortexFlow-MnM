"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useGlobalRefresh } from "@/providers/refresh-provider";

type CareNetworkMember = {
  id: string;
  name: string;
  email: string | null;
  role: "patient" | "caregiver" | "provider" | "contact";
  detail: string | null;
};

type CareNote = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

type CareNetworkResponse = {
  patient: { id: string; name: string | null } | null;
  members: CareNetworkMember[];
  notes: CareNote[];
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function CaregiverNetworkPanel() {
  const { authFetch, idToken } = useAuthFetch();
  const [network, setNetwork] = useState<CareNetworkResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const loadNetwork = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/caregiver/network", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load care network");
      }

      const data = await res.json() as CareNetworkResponse;
      setNetwork(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load care network";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isReady) return;
    void loadNetwork();
  }, [loadNetwork, idToken, isReady]);

  useGlobalRefresh(() => {
    if (isReady) void loadNetwork();
  });

  const patientLabel = useMemo(() => {
    if (!network?.patient) return "No patient linked.";
    return network.patient.name ?? "Linked patient";
  }, [network]);

  const canSaveNote = noteTitle.trim().length > 1;

  const saveNote = useCallback(async () => {
    if (!canSaveNote) return;

    setNoteSaving(true);
    setError(null);

    try {
      const res = await authFetch("/api/caregiver/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle.trim(), description: noteBody.trim() || null }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to save note");
      }

      const data = await res.json() as { note?: CareNote };
      if (data.note) {
        setNetwork((prev) => prev ? { ...prev, notes: [data.note as CareNote, ...prev.notes] } : prev);
      }

      setNoteTitle("");
      setNoteBody("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save note";
      setError(message);
    } finally {
      setNoteSaving(false);
    }
  }, [canSaveNote, noteBody, noteTitle]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Care Network
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>{patientLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadNetwork()}
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
        <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading care network...</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl p-4" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Network Members</div>
            </div>
            {network?.members?.length ? (
              <div className="grid gap-2">
                {network.members.map((member) => (
                  <div key={`${member.role}-${member.id}`} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{member.name}</div>
                      <span className="text-[10px] uppercase" style={{ color: "var(--nt-text-ghost)" }}>{member.role}</span>
                    </div>
                    {member.email && (
                      <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{member.email}</div>
                    )}
                    {member.detail && (
                      <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>{member.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No network details available.</div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Care Notes</div>
                <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Visible to team</span>
              </div>
              <div className="grid gap-2">
                <input
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder="Note title"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
                <textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="Observations, context, follow-up"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 90 }}
                />
                <button
                  type="button"
                  onClick={() => void saveNote()}
                  disabled={!canSaveNote || noteSaving}
                  className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
                >
                  {noteSaving ? "Saving..." : "Save Note"}
                </button>
               </div>
             </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Recent Notes</div>
              </div>
              {network?.notes?.length ? (
                <div className="grid gap-2">
                  {network.notes.map((note) => (
                    <div key={note.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{note.title}</div>
                        <span className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      {note.description && (
                        <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{note.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No notes yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
