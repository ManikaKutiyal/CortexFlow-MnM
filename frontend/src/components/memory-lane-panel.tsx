"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type MemoryEntry = {
  id: string;
  title: string;
  description: string | null;
  media_path: string | null;
  media_type: "image" | "audio" | "video" | "text" | null;
  recorded_at: string | null;
  created_at: string;
};

type VoiceNote = {
  id: string;
  memory_id: string | null;
  speaker_name: string | null;
  relationship: string | null;
  duration_seconds: number | null;
  file_path: string | null;
  transcript: string | null;
  created_at: string;
};

type MemoryFormState = {
  title: string;
  description: string;
  mediaPath: string;
  mediaType: "image" | "audio" | "video" | "text";
  recordedAt: string;
};

type VoiceNoteFormState = {
  memoryId: string;
  speakerName: string;
  relationship: string;
  durationSeconds: string;
  filePath: string;
  transcript: string;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function MemoryLanePanel() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [memoryForm, setMemoryForm] = useState<MemoryFormState>({
    title: "",
    description: "",
    mediaPath: "",
    mediaType: "image",
    recordedAt: "",
  });
  const [voiceNoteForm, setVoiceNoteForm] = useState<VoiceNoteFormState>({
    memoryId: "",
    speakerName: "",
    relationship: "",
    durationSeconds: "",
    filePath: "",
    transcript: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [entriesRes, notesRes] = await Promise.all([
        fetch("/api/memory-lane/entries", { method: "GET", cache: "no-store" }),
        fetch("/api/memory-lane/voice-notes", { method: "GET", cache: "no-store" }),
      ]);

      if (!entriesRes.ok) {
        const msg = await entriesRes.text();
        throw new Error(msg || "Failed to load memories");
      }
      if (!notesRes.ok) {
        const msg = await notesRes.text();
        throw new Error(msg || "Failed to load voice notes");
      }

      const entriesPayload = await entriesRes.json() as { entries?: MemoryEntry[] };
      const notesPayload = await notesRes.json() as { notes?: VoiceNote[] };

      setEntries(entriesPayload.entries ?? []);
      setVoiceNotes(notesPayload.notes ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load memory lane";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canSubmitMemory = memoryForm.title.trim().length > 1;
  const canSubmitVoiceNote = voiceNoteForm.filePath.trim().length > 0 || voiceNoteForm.transcript.trim().length > 0;

  const memorySummary = useMemo(() => {
    const count = entries.length;
    if (!count) return "No memories yet.";
    return `${count} memory item${count === 1 ? "" : "s"}.`;
  }, [entries.length]);

  const submitMemory = useCallback(async () => {
    if (!canSubmitMemory) return;

    const payload = {
      title: memoryForm.title.trim(),
      description: memoryForm.description.trim() || null,
      mediaPath: memoryForm.mediaPath.trim() || null,
      mediaType: memoryForm.mediaType,
      recordedAt: memoryForm.recordedAt || null,
    };

    const res = await fetch("/api/memory-lane/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await res.text();
      setError(message || "Failed to create memory entry");
      return;
    }

    const data = await res.json() as { entry?: MemoryEntry };
    if (data.entry) {
      setEntries((prev) => [data.entry as MemoryEntry, ...prev]);
    }

    setMemoryForm({
      title: "",
      description: "",
      mediaPath: "",
      mediaType: "image",
      recordedAt: "",
    });
  }, [canSubmitMemory, memoryForm]);

  const submitVoiceNote = useCallback(async () => {
    if (!canSubmitVoiceNote) return;

    const payload = {
      memoryId: voiceNoteForm.memoryId || null,
      speakerName: voiceNoteForm.speakerName.trim() || null,
      relationship: voiceNoteForm.relationship.trim() || null,
      durationSeconds: voiceNoteForm.durationSeconds ? Number(voiceNoteForm.durationSeconds) : null,
      filePath: voiceNoteForm.filePath.trim() || null,
      transcript: voiceNoteForm.transcript.trim() || null,
    };

    const res = await fetch("/api/memory-lane/voice-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await res.text();
      setError(message || "Failed to save voice note");
      return;
    }

    const data = await res.json() as { note?: VoiceNote };
    if (data.note) {
      setVoiceNotes((prev) => [data.note as VoiceNote, ...prev]);
    }

    setVoiceNoteForm({
      memoryId: "",
      speakerName: "",
      relationship: "",
      durationSeconds: "",
      filePath: "",
      transcript: "",
    });
  }, [canSubmitVoiceNote, voiceNoteForm]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Memory Lane
          </h1>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg px-3 py-1 text-[11px]"
            style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
          >
            Refresh
          </button>
        </div>
        <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>{memorySummary}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg px-3 py-2" style={{ border: "1px solid rgba(216,90,48,0.35)", color: "#D85A30" }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading memory lane...</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>New Memory</div>
                <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Patient view</span>
              </div>
              <div className="grid gap-2">
                <input
                  value={memoryForm.title}
                  onChange={(event) => setMemoryForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Memory title"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
                <textarea
                  value={memoryForm.description}
                  onChange={(event) => setMemoryForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Short description"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 80 }}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={memoryForm.mediaPath}
                    onChange={(event) => setMemoryForm((prev) => ({ ...prev, mediaPath: event.target.value }))}
                    placeholder="Media URL or storage path"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                  />
                  <select
                    value={memoryForm.mediaType}
                    onChange={(event) => setMemoryForm((prev) => ({ ...prev, mediaType: event.target.value as MemoryFormState["mediaType"] }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                  >
                    <option value="image">Image</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                  </select>
                </div>
                <input
                  value={memoryForm.recordedAt}
                  onChange={(event) => setMemoryForm((prev) => ({ ...prev, recordedAt: event.target.value }))}
                  type="datetime-local"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
                <button
                  type="button"
                  onClick={() => void submitMemory()}
                  disabled={!canSubmitMemory}
                  className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
                >
                  Save Memory
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Memories</div>
                <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Latest first</span>
              </div>
              {entries.length === 0 ? (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No memories yet.</div>
              ) : (
                <div className="grid gap-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                      <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{entry.title}</div>
                      {entry.description && (
                        <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{entry.description}</div>
                      )}
                      <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                        {entry.media_type ? `${entry.media_type} memory` : "memory"} {entry.recorded_at ? `- ${new Date(entry.recorded_at).toLocaleString()}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Voice Notes</div>
                <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Family support</span>
              </div>
              <div className="grid gap-2">
                <select
                  value={voiceNoteForm.memoryId}
                  onChange={(event) => setVoiceNoteForm((prev) => ({ ...prev, memoryId: event.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                >
                  <option value="">Link to memory (optional)</option>
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.title}</option>
                  ))}
                </select>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={voiceNoteForm.speakerName}
                    onChange={(event) => setVoiceNoteForm((prev) => ({ ...prev, speakerName: event.target.value }))}
                    placeholder="Speaker name"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                  />
                  <input
                    value={voiceNoteForm.relationship}
                    onChange={(event) => setVoiceNoteForm((prev) => ({ ...prev, relationship: event.target.value }))}
                    placeholder="Relationship"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={voiceNoteForm.durationSeconds}
                    onChange={(event) => setVoiceNoteForm((prev) => ({ ...prev, durationSeconds: event.target.value }))}
                    placeholder="Duration (seconds)"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                  />
                  <input
                    value={voiceNoteForm.filePath}
                    onChange={(event) => setVoiceNoteForm((prev) => ({ ...prev, filePath: event.target.value }))}
                    placeholder="Audio URL or storage path"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                  />
                </div>
                <textarea
                  value={voiceNoteForm.transcript}
                  onChange={(event) => setVoiceNoteForm((prev) => ({ ...prev, transcript: event.target.value }))}
                  placeholder="Optional transcript"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)", minHeight: 80 }}
                />
                <button
                  type="button"
                  onClick={() => void submitVoiceNote()}
                  disabled={!canSubmitVoiceNote}
                  className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
                >
                  Save Voice Note
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Recent Notes</div>
                <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Latest first</span>
              </div>
              {voiceNotes.length === 0 ? (
                <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>No voice notes yet.</div>
              ) : (
                <div className="grid gap-2">
                  {voiceNotes.map((note) => (
                    <div key={note.id} className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                      <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>
                        {note.speaker_name || "Family note"}
                      </div>
                      {note.relationship && (
                        <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{note.relationship}</div>
                      )}
                      {note.transcript && (
                        <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 6 }}>{note.transcript}</div>
                      )}
                      <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)", marginTop: 6 }}>
                        {note.duration_seconds ? `${note.duration_seconds}s` : ""} {note.created_at ? `- ${new Date(note.created_at).toLocaleString()}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
