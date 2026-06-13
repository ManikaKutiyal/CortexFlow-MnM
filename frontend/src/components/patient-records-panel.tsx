"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { File, FileText, Image as ImageIcon, Activity, Pill, Download, Calendar } from "lucide-react";

type PatientRecord = {
  id: string;
  record_type: "prescription" | "lab" | "image" | "note" | "other";
  title: string;
  description: string | null;
  file_path: string | null;
  created_at: string;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

const RECORD_ICONS = {
  prescription: Pill,
  lab: Activity,
  image: ImageIcon,
  note: FileText,
  other: File,
};

export function PatientRecordsPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/patient/records", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to load records");
      }

      const data = await res.json() as { records?: PatientRecord[] };
      setRecords(data.records ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your records");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isReady) return;
    void loadRecords();
  }, [loadRecords, idToken, isReady]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(56,189,248,0.15))", border: "1px solid rgba(20,184,166,0.2)" }}
          >
            <FileText size={20} style={{ color: "#14b8a6" }} />
          </div>
          <div>
            <h1 style={{ color: "var(--nt-text-hi)", fontSize: 20, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
              My Records
            </h1>
            <p className="text-xs" style={{ color: "var(--nt-text-xs)", marginTop: 2 }}>
              Clinical files and lab results from your provider.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadRecords()}
          className="rounded-lg px-3 py-1.5 text-[11px] flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(216,90,48,0.06)", border: "1px solid rgba(216,90,48,0.2)", color: "#D85A30" }}>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="rounded-2xl p-4 glass-card-hover" style={glassCard}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            <span className="ml-3 text-sm font-medium text-slate-500">Loading your records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: "var(--nt-text-ghost)" }}>
            <FileText size={48} className="mb-4 opacity-30" />
            <div className="text-base font-semibold" style={{ color: "var(--nt-text-hi)" }}>No records found</div>
            <p className="text-sm mt-2 max-w-sm" style={{ color: "var(--nt-text-md)" }}>
              Your healthcare providers have not uploaded any medical records or lab results to your profile yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {records.map((record) => {
              const Icon = RECORD_ICONS[record.record_type] || File;
              return (
                <div key={record.id} className="relative group rounded-xl p-4 flex flex-col transition-all duration-200" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  
                  {/* Glowing hover border effect */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ border: "1px solid rgba(20,184,166,0.4)" }} />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-teal-50 text-teal-600 shrink-0 border border-teal-100">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm truncate pr-2" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{record.title}</div>
                        <div className="text-[10px] uppercase font-medium mt-0.5" style={{ color: "var(--nt-text-md)", letterSpacing: "0.05em" }}>{record.record_type}</div>
                      </div>
                    </div>
                  </div>
                  
                  {record.description ? (
                    <div className="text-xs line-clamp-3 flex-1" style={{ color: "var(--nt-text-lo)" }}>
                      {record.description}
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "var(--nt-text-ghost)" }}>
                      <Calendar size={12} />
                      {new Date(record.created_at).toLocaleDateString()}
                    </div>
                    {record.file_path && (
                      <a 
                        href={record.file_path} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        <Download size={14} />
                        View File
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
