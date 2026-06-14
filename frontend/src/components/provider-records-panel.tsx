"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useGlobalRefresh } from "@/providers/refresh-provider";
import { getSupabaseBrowserClient } from "@/libs/supabase-browser";
import { Plus, X, UploadCloud, File, FileText, Image as ImageIcon, Activity, Pill } from "lucide-react";

type PatientRecord = {
  id: string;
  patient_id: string;
  patient_name?: string;
  record_type: "prescription" | "lab" | "image" | "note" | "other";
  title: string;
  description: string | null;
  file_path: string | null;
  created_at: string;
};

type ProviderPatient = {
  id: string;
  name: string;
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

export function ProviderRecordsPanel() {
  const { authFetch, idToken, isReady } = useAuthFetch();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [patients, setPatients] = useState<ProviderPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>("all");

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Form State
  const [uploadPatientId, setUploadPatientId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<PatientRecord["record_type"]>("note");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [recordsRes, rosterRes] = await Promise.all([
        authFetch("/api/provider/records", { method: "GET", cache: "no-store" }),
        authFetch("/api/provider/roster", { method: "GET", cache: "no-store" })
      ]);

      if (!recordsRes.ok) throw new Error(await recordsRes.text() || "Failed to load records");
      if (!rosterRes.ok) throw new Error(await rosterRes.text() || "Failed to load patients");

      const recordsData = await recordsRes.json() as { records?: PatientRecord[] };
      const rosterData = await rosterRes.json() as { patients?: ProviderPatient[] };
      
      setRecords(recordsData.records ?? []);
      setPatients(rosterData.patients ?? []);
      
      if (rosterData.patients && rosterData.patients.length > 0 && !uploadPatientId) {
        setUploadPatientId(rosterData.patients[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, uploadPatientId]);

  useEffect(() => {
    if (!isReady) return;
    void loadData();
  }, [loadData, idToken, isReady]);

  useGlobalRefresh(() => {
    if (isReady) void loadData();
  });

  const filteredRecords = useMemo(() => {
    if (selectedPatientFilter === "all") return records;
    return records.filter(r => r.patient_id === selectedPatientFilter);
  }, [records, selectedPatientFilter]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPatientId || !uploadTitle.trim() || !selectedFile) {
      setUploadError("Please fill in all required fields and select a file.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      
      // 1. Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${uploadPatientId}-${Date.now()}.${fileExt}`;
      
      const { error: storageError } = await supabase.storage
        .from('patient_records')
        .upload(fileName, selectedFile);

      if (storageError) throw new Error("Failed to upload file to storage: " + storageError.message);

      const { data: { publicUrl } } = supabase.storage
        .from('patient_records')
        .getPublicUrl(fileName);

      // 2. Save metadata to database
      const res = await authFetch("/api/provider/records/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: uploadPatientId,
          record_type: uploadType,
          title: uploadTitle.trim(),
          description: uploadDescription.trim(),
          file_path: publicUrl
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save record metadata");
      }

      // Reset form and close modal
      setUploadTitle("");
      setUploadDescription("");
      setSelectedFile(null);
      setIsUploadModalOpen(false);
      
      // Reload records to show new entry
      void loadData();

    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "An unexpected error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden relative" style={{ padding: "18px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Patient Records
          </h1>
          <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>Prescriptions, images, and clinical files.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-lg px-3 py-1.5 text-[11px]"
            style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedPatientFilter !== "all") setUploadPatientId(selectedPatientFilter);
              setIsUploadModalOpen(true);
            }}
            className="rounded-lg px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Upload Record
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-xs font-medium" style={{ color: "var(--nt-text-md)" }}>Filter by Patient:</label>
        <select 
          value={selectedPatientFilter}
          onChange={(e) => setSelectedPatientFilter(e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20"
          style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
        >
          <option value="all">All Patients</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg px-3 py-2" style={{ border: "1px solid rgba(216,90,48,0.35)", color: "#D85A30" }}>
          {error}
        </div>
      )}

      <div className="rounded-2xl p-4" style={glassCard}>
        {isLoading ? (
          <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Loading records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center" style={{ color: "var(--nt-text-ghost)" }}>
            <FileText size={32} className="mb-3 opacity-50" />
            <div className="text-sm font-medium">No records uploaded</div>
            <p className="text-xs mt-1">Upload prescriptions, lab results, and other clinical files for your patients.</p>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-4 px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Upload First Record
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecords.map((record) => {
              const Icon = RECORD_ICONS[record.record_type] || File;
              return (
                <div key={record.id} className="rounded-xl p-3 flex flex-col hover:border-blue-300 transition-colors" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 shrink-0">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm truncate" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{record.title}</div>
                        <div className="text-[10px] truncate" style={{ color: "var(--nt-text-md)" }}>{record.patient_name}</div>
                      </div>
                    </div>
                  </div>
                  
                  {record.description && (
                    <div className="text-[11px] line-clamp-2 flex-1" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{record.description}</div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px]" style={{ color: "var(--nt-text-ghost)" }}>
                      {new Date(record.created_at).toLocaleDateString()}
                    </div>
                    {record.file_path && (
                      <a 
                        href={record.file_path} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                      >
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

      {/* Upload Modal Overlay */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <UploadCloud size={18} className="text-blue-600" /> Upload Record
              </h2>
              <button 
                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-5 flex flex-col gap-4">
              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">
                  {uploadError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Patient *</label>
                <select 
                  value={uploadPatientId}
                  onChange={(e) => setUploadPatientId(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2 bg-slate-50 text-slate-900 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                  disabled={isUploading}
                  required
                >
                  <option value="" disabled>Select a patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Record Type *</label>
                <div className="flex flex-wrap gap-2">
                  {(["prescription", "lab", "image", "note", "other"] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setUploadType(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                        uploadType === type 
                          ? "bg-blue-100 text-blue-700 border-2 border-blue-200" 
                          : "bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100"
                      }`}
                      disabled={isUploading}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Title *</label>
                <input 
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Blood Test Results"
                  className="w-full text-sm rounded-xl px-3 py-2 bg-slate-50 text-slate-900 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  disabled={isUploading}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea 
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Optional details about this record..."
                  rows={2}
                  className="w-full text-sm rounded-xl px-3 py-2 bg-slate-50 text-slate-900 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-none"
                  disabled={isUploading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">File Attachment *</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept="image/*,application/pdf,text/plain"
                  disabled={isUploading}
                />
                
                {selectedFile ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 text-sm">
                    <span className="truncate flex-1 text-blue-700 font-medium text-xs">{selectedFile.name}</span>
                    <button 
                      type="button" 
                      onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-blue-400 hover:text-blue-600 ml-2"
                      disabled={isUploading}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <UploadCloud size={20} />
                    <span className="text-xs font-medium">Click to select a file</span>
                  </button>
                )}
              </div>

              <div className="mt-2 pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadPatientId || !uploadTitle.trim() || !selectedFile}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isUploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Record"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
