"use client";
import { useState, useEffect, useCallback } from "react";
import type { CognitiveReport } from "@/components/cognition-report-panel";
import type { WordTimestamp } from "@/components/input-command-panel";
export type HistoryEntry = {
  id: string;
  timestamp: number;
  inputType: "text" | "transcript";
  inputSnippet: string;
  scores: Record<string, number>;
  report: CognitiveReport;
  sessionId: string;
  wordTimestamps?: WordTimestamp[];
  audioDuration?: number;
};
const MAX_ENTRIES = 100;

const SAVE_RETRY_DELAYS_MS = [300, 900, 1800];

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

type ApiReportRow = {
  id: string;
  created_at: string;
  input_type: "text" | "transcript";
  input_snippet: string;
  scores: Record<string, number>;
  report: CognitiveReport;
  session_id: string;
  word_timestamps?: WordTimestamp[];
  audio_duration?: number;
};

function toHistoryEntry(row: ApiReportRow): HistoryEntry {
  return {
    id: row.id,
    timestamp: new Date(row.created_at).getTime(),
    inputType: row.input_type,
    inputSnippet: row.input_snippet,
    scores: row.scores,
    report: row.report,
    sessionId: row.session_id,
    wordTimestamps: row.word_timestamps,
    audioDuration: row.audio_duration,
  };
}

function authHeaders(idToken: string | null): HeadersInit {
  return idToken
    ? { Authorization: `Bearer ${idToken}` }
    : {};
}

export function useSessionHistory(idToken: string | null, isAuthenticated: boolean) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!isAuthenticated) {
      setEntries([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "GET",
        cache: "no-store",
        headers: authHeaders(idToken),
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json() as { reports?: ApiReportRow[] };
      const mapped = (data.reports ?? []).map(toHistoryEntry);
      setEntries(mapped.slice(0, MAX_ENTRIES));
    } catch {
      // Ignore transient API failures and keep current state.
    } finally {
      setIsLoading(false);
    }
  }, [idToken, isAuthenticated]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const sync = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      await loadEntries();
    };

    const intervalId = window.setInterval(() => {
      void sync();
    }, 15_000);

    const onVisibility = () => {
      void sync();
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, loadEntries]);

  const createReport = useCallback(async (entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    for (let attempt = 0; attempt <= SAVE_RETRY_DELAYS_MS.length; attempt++) {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(idToken),
          },
          body: JSON.stringify(entry),
        });

        if (!res.ok) {
          throw new Error(`Failed to save report: ${res.status}`);
        }

        const data = await res.json() as { report?: ApiReportRow };
        if (!data.report) {
          throw new Error("Missing report in response");
        }

        return toHistoryEntry(data.report);
      } catch {
        const waitMs = SAVE_RETRY_DELAYS_MS[attempt];
        if (waitMs == null) {
          break;
        }

        await sleep(waitMs);
      }
    }

    return null;
  }, [idToken]);

  const addEntry = useCallback(async (entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    if (!isAuthenticated) return;

    const created = await createReport(entry);
    if (created) {
      setEntries((prev) => [created, ...prev].slice(0, MAX_ENTRIES));
      return;
    }

    await loadEntries();
  }, [createReport, isAuthenticated, loadEntries]);

  const removeEntry = useCallback(async (id: string) => {
    if (!isAuthenticated) return;

    const previous = entries;
    setEntries((prev) => prev.filter((entry) => entry.id !== id));

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
        headers: authHeaders(idToken),
      });

      if (!res.ok) {
        setEntries(previous);
      }
    } catch {
      setEntries(previous);
    }
  }, [entries, idToken, isAuthenticated]);
  const clearAll = useCallback(async () => {
    if (!isAuthenticated) return;

    const previous = entries;
    setEntries([]);

    try {
      const res = await fetch("/api/reports/clear", {
        method: "DELETE",
        headers: authHeaders(idToken),
      });

      if (!res.ok) {
        setEntries(previous);
      }
    } catch {
      setEntries(previous);
    }
  }, [entries, idToken, isAuthenticated]);

  return { entries, isLoading, addEntry, removeEntry, clearAll, reload: loadEntries };
}
