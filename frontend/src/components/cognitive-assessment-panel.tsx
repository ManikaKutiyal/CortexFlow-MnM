"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Brain, Activity, Check, X, RefreshCw } from "lucide-react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

const WORD_BANK = [
  "APPLE", "TRAIN", "RIVER", "CHAIR", "CLOCK", "HOUSE", "SMILE", "BREAD", "NIGHT", "DREAM",
  "PLANT", "SUGAR", "WATER", "LIGHT", "MUSIC", "PAPER", "MONEY", "PHONE", "TIGER", "BEACH",
  "CHIEF", "PIZZA", "STORM", "NOISE", "CLOUD", "HEART", "PIANO", "BIRD", "STORY", "SPACE"
];

const SPEECH_PROMPT = "Please read the following passage out loud:\n\n\"The quick brown fox jumps over the lazy dog. When the sunlight strikes raindrops in the air, they act like a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors. These take the shape of a long round arch, with its path high above, and its two ends apparently beyond the horizon.\"";

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

export function CognitiveAssessmentPanel() {
  const { authFetch, isReady } = useAuthFetch();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<"memory" | "speech">("memory");

  // --- MEMORY QUIZ STATE ---
  const [quizPhase, setQuizPhase] = useState<"idle" | "memorize" | "recall" | "result">("idle");
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [quizTimer, setQuizTimer] = useState(0);

  // --- SPEECH ASSESSMENT STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [assessmentState, setAssessmentState] = useState<"idle" | "recording" | "transcribing" | "analyzing" | "done" | "error">("idle");
  const [progressLogs, setProgressLogs] = useState<{ step: string; status: string }[]>([]);
  const [speechReport, setSpeechReport] = useState<any>(null);
  const [speechScores, setSpeechScores] = useState<any>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Timer Effect for Memory Quiz
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (quizPhase === "memorize" && quizTimer > 0) {
      interval = setInterval(() => setQuizTimer(t => t - 1), 1000);
    } else if (quizPhase === "memorize" && quizTimer === 0) {
      setQuizPhase("recall");
    }
    return () => clearInterval(interval);
  }, [quizPhase, quizTimer]);

  // Memory Quiz Logic
  const startMemoryQuiz = () => {
    const shuffled = [...WORD_BANK].sort(() => 0.5 - Math.random());
    const targets = shuffled.slice(0, 5);
    const distractors = shuffled.slice(5, 15);
    
    setTargetWords(targets);
    setDisplayedWords([...targets, ...distractors].sort(() => 0.5 - Math.random()));
    setSelectedWords([]);
    setQuizPhase("memorize");
    setQuizTimer(10); // 10 seconds to memorize
  };

  const toggleWordSelection = (word: string) => {
    if (quizPhase !== "recall") return;
    setSelectedWords(prev => {
      if (prev.includes(word)) return prev.filter(w => w !== word);
      if (prev.length < 5) return [...prev, word];
      return prev;
    });
  };

  const submitMemoryQuiz = async () => {
    setQuizPhase("result");
    
    const score = selectedWords.filter(w => targetWords.includes(w)).length;
    try {
      await authFetch("/api/cognitive/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "memory_quiz",
          score: score,
          details: {
            targetWords,
            selectedWords,
            displayedWords
          }
        }),
      });
    } catch (e) {
      console.error("Failed to save memory quiz result", e);
    }
  };

  const memoryScore = useMemo(() => {
    if (quizPhase !== "result") return 0;
    return selectedWords.filter(w => targetWords.includes(w)).length;
  }, [quizPhase, selectedWords, targetWords]);

  // Speech Assessment Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAssessmentState("recording");
      setSpeechError(null);
      setProgressLogs([]);
      setSpeechReport(null);
      setSpeechScores(null);
    } catch (err) {
      console.error("Mic access denied:", err);
      setSpeechError("Microphone access denied or unavailable.");
      setAssessmentState("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      setAssessmentState("transcribing");
    }
  };

  const processAudio = async (blob: Blob) => {
    if (!isReady) return;

    try {
      // 1. Transcribe
      setProgressLogs([{ step: "Transcribing audio", status: "running" }]);
      const formData = new FormData();
      formData.append("audio", blob, "assessment.webm");

      const transcribeRes = await authFetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) {
        throw new Error("Failed to transcribe audio.");
      }

      const { transcript, pauseMap, duration } = await transcribeRes.json();
      
      setProgressLogs(prev => prev.map(p => p.step === "Transcribing audio" ? { ...p, status: "done" } : p));
      setAssessmentState("analyzing");

      // 2. Analyze (Streaming)
      const analyzeRes = await authFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: transcript,
          pause_map: pauseMap,
          audio_duration: duration || 10.0,
        }),
      });

      if (!analyzeRes.ok || !analyzeRes.body) {
        throw new Error("Failed to start analysis.");
      }

      const reader = analyzeRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.type === "step") {
              setProgressLogs(prev => {
                const existing = prev.findIndex(p => p.step === data.step);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = { step: data.step, status: data.status };
                  return updated;
                }
                return [...prev, { step: data.step, status: data.status }];
              });
            } else if (data.type === "end") {
              setSpeechReport(data.report);
              setSpeechScores(data.scores);
              setAssessmentState("done");

              // Save to database
              authFetch("/api/cognitive/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "speech_analysis",
                  score: data.report.overall_cognitive_load,
                  details: {
                    report: data.report,
                    scores: data.scores
                  }
                }),
              }).catch(e => console.error("Failed to save speech analysis", e));

            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error("Parse error streaming ndjson", e);
          }
        }
      }

    } catch (err) {
      console.error(err);
      setSpeechError(err instanceof Error ? err.message : "Assessment failed.");
      setAssessmentState("error");
    }
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 20, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Cognitive Assessments
          </h1>
          <p style={{ color: "var(--nt-text-lo)", fontSize: 13, marginTop: 4 }}>
            Interactive clinical screening and tracking.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("memory")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: activeTab === "memory" ? "var(--nt-glass)" : "transparent",
              color: activeTab === "memory" ? "var(--nt-text-hi)" : "var(--nt-text-lo)",
              border: `1px solid ${activeTab === "memory" ? "var(--nt-glass-border)" : "transparent"}`,
            }}
          >
            Word Recall Quiz
          </button>
          <button
            onClick={() => setActiveTab("speech")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: activeTab === "speech" ? "var(--nt-glass)" : "transparent",
              color: activeTab === "speech" ? "var(--nt-text-hi)" : "var(--nt-text-lo)",
              border: `1px solid ${activeTab === "speech" ? "var(--nt-glass-border)" : "transparent"}`,
            }}
          >
            Speech Analysis
          </button>
        </div>
      </div>

      {activeTab === "memory" && (
        <div className="max-w-2xl mx-auto rounded-2xl p-6" style={glassCard}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(29, 158, 117, 0.15)", color: "#1D9E75" }}>
              <Brain size={20} />
            </div>
            <div>
              <h2 style={{ color: "var(--nt-text-hi)", fontSize: 16, fontWeight: 600 }}>Memory Recall</h2>
              <p style={{ color: "var(--nt-text-lo)", fontSize: 12 }}>Test short-term verbal memory retention.</p>
            </div>
          </div>

          {quizPhase === "idle" && (
            <div className="text-center py-10">
              <p style={{ color: "var(--nt-text-md)", marginBottom: 20 }}>
                You will be shown 5 words for 10 seconds. Try to remember them all!
              </p>
              <button
                onClick={startMemoryQuiz}
                className="px-6 py-3 rounded-xl font-bold transition-all"
                style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
              >
                Start Memory Quiz
              </button>
            </div>
          )}

          {quizPhase === "memorize" && (
            <div className="text-center py-8">
              <div className="text-4xl font-bold mb-8" style={{ color: "#D85A30" }}>0:{quizTimer.toString().padStart(2, "0")}</div>
              <div className="flex flex-wrap justify-center gap-4">
                {targetWords.map(word => (
                  <div key={word} className="px-6 py-4 rounded-xl text-xl font-bold tracking-widest" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--nt-divider)" }}>
                    {word}
                  </div>
                ))}
              </div>
            </div>
          )}

          {quizPhase === "recall" && (
            <div className="py-4">
              <p className="text-center mb-6 font-semibold" style={{ color: "var(--nt-text-hi)" }}>
                Select the 5 words you saw ({selectedWords.length}/5 selected)
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {displayedWords.map(word => {
                  const isSelected = selectedWords.includes(word);
                  return (
                    <button
                      key={word}
                      onClick={() => toggleWordSelection(word)}
                      className="py-3 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        background: isSelected ? "var(--nt-btn-bg)" : "rgba(255,255,255,0.05)",
                        color: isSelected ? "var(--nt-btn-fg)" : "var(--nt-text-md)",
                        border: "1px solid var(--nt-divider)",
                      }}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex justify-center">
                <button
                  onClick={submitMemoryQuiz}
                  disabled={selectedWords.length !== 5}
                  className="px-8 py-3 rounded-xl font-bold disabled:opacity-50 transition-all"
                  style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
                >
                  Submit Answers
                </button>
              </div>
            </div>
          )}

          {quizPhase === "result" && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ background: memoryScore >= 4 ? "rgba(29, 158, 117, 0.15)" : "rgba(216, 90, 48, 0.15)" }}>
                <span className="text-3xl font-bold" style={{ color: memoryScore >= 4 ? "#1D9E75" : "#D85A30" }}>
                  {memoryScore}/5
                </span>
              </div>
              <h3 className="text-xl font-bold mb-6" style={{ color: "var(--nt-text-hi)" }}>
                {memoryScore === 5 ? "Perfect Score!" : memoryScore >= 3 ? "Good Job!" : "Keep Practicing!"}
              </h3>
              
              <div className="max-w-md mx-auto text-left mb-8 space-y-3">
                {displayedWords.filter(w => targetWords.includes(w) || selectedWords.includes(w)).map(word => {
                  const wasTarget = targetWords.includes(word);
                  const wasSelected = selectedWords.includes(word);
                  
                  let statusColor = "var(--nt-text-ghost)";
                  let StatusIcon = Check;
                  
                  if (wasTarget && wasSelected) {
                    statusColor = "#1D9E75";
                    StatusIcon = Check;
                  } else if (wasSelected && !wasTarget) {
                    statusColor = "#D85A30";
                    StatusIcon = X;
                  } else if (wasTarget && !wasSelected) {
                    statusColor = "#E6A23C";
                    StatusIcon = Activity;
                  }

                  if (!wasTarget && !wasSelected) return null;

                  return (
                    <div key={word} className="flex items-center justify-between px-4 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <span style={{ color: "var(--nt-text-hi)", fontWeight: 500 }}>{word}</span>
                      <div className="flex items-center gap-2" style={{ color: statusColor, fontSize: 12 }}>
                        {wasTarget && wasSelected && <span>Correct</span>}
                        {wasTarget && !wasSelected && <span>Missed</span>}
                        {!wasTarget && wasSelected && <span>Incorrect</span>}
                        <StatusIcon size={14} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setQuizPhase("idle")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all"
                style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-hi)" }}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "speech" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recording & Input Side */}
          <div className="rounded-2xl p-6 flex flex-col gap-6" style={glassCard}>
            <div>
              <h2 style={{ color: "var(--nt-text-hi)", fontSize: 16, fontWeight: 600 }}>Vocal Biomarker Assessment</h2>
              <p style={{ color: "var(--nt-text-lo)", fontSize: 12, marginTop: 4 }}>
                Read the prompt aloud clearly at your normal speaking pace.
              </p>
            </div>

            <div className="rounded-xl p-5" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--nt-divider)" }}>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed" style={{ color: "var(--nt-text-hi)" }}>
                {SPEECH_PROMPT}
              </pre>
            </div>

            <div className="flex justify-center py-4">
              {assessmentState === "idle" || assessmentState === "error" || assessmentState === "done" ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all"
                  style={{ background: "#D85A30", color: "#fff", boxShadow: "0 4px 12px rgba(216, 90, 48, 0.3)" }}
                >
                  <Mic size={18} />
                  Start Recording
                </button>
              ) : assessmentState === "recording" ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all animate-pulse"
                  style={{ background: "#E84E4E", color: "#fff" }}
                >
                  <Square size={18} fill="currentColor" />
                  Stop Recording
                </button>
              ) : (
                <div className="flex items-center gap-3 px-6 py-3 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--nt-divider)" }}>
                  <RefreshCw size={18} className="animate-spin" style={{ color: "var(--nt-text-md)" }} />
                  <span style={{ color: "var(--nt-text-hi)" }}>Processing...</span>
                </div>
              )}
            </div>

            {speechError && (
              <div className="rounded-lg p-3 text-sm text-center" style={{ background: "rgba(216, 90, 48, 0.1)", border: "1px solid rgba(216, 90, 48, 0.2)", color: "#D85A30" }}>
                {speechError}
              </div>
            )}
          </div>

          {/* Results Side */}
          <div className="rounded-2xl p-6" style={glassCard}>
            <h2 className="mb-4" style={{ color: "var(--nt-text-hi)", fontSize: 16, fontWeight: 600 }}>Analysis Progress</h2>
            
            {assessmentState === "idle" && !speechReport && (
              <div className="h-40 flex items-center justify-center text-center">
                <p style={{ color: "var(--nt-text-ghost)", fontSize: 13 }}>
                  Start a recording to analyze vocal biomarkers.
                </p>
              </div>
            )}

            {progressLogs.length > 0 && !speechReport && (
              <div className="space-y-3 mt-4">
                {progressLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    {log.status === "done" ? (
                      <Check size={16} color="#1D9E75" />
                    ) : log.status === "running" ? (
                      <RefreshCw size={14} className="animate-spin" color="#D85A30" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-dashed" style={{ borderColor: "var(--nt-divider)" }} />
                    )}
                    <span style={{ color: log.status === "pending" ? "var(--nt-text-ghost)" : "var(--nt-text-hi)" }}>
                      {log.step}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {speechReport && (
              <div className="animate-fade-in">
                <div className="mb-6 pb-6" style={{ borderBottom: "1px solid var(--nt-divider)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontWeight: 700 }}>Clinical Summary</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{
                      background: speechReport.risk_level === "High Risk" ? "rgba(216,90,48,0.15)" : "rgba(29,158,117,0.15)",
                      color: speechReport.risk_level === "High Risk" ? "#D85A30" : "#1D9E75"
                    }}>
                      {speechReport.risk_level}
                    </span>
                  </div>
                  <p style={{ color: "var(--nt-text-md)", fontSize: 14, lineHeight: 1.6 }}>
                    {speechReport.summary}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 style={{ color: "var(--nt-text-hi)", fontSize: 14, fontWeight: 600 }}>Domain Indicators</h4>
                  <div className="grid gap-3">
                    {["lexical", "semantic", "prosody", "syntax", "affective"].map(domain => {
                      const scoreData = speechScores?.[domain];
                      if (!scoreData) return null;
                      
                      const val = scoreData.overall * 100;
                      return (
                        <div key={domain} className="bg-black/20 p-3 rounded-lg border border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="capitalize text-sm font-medium" style={{ color: "var(--nt-text-hi)" }}>{domain}</span>
                            <span className="text-xs" style={{ color: "var(--nt-text-lo)" }}>{val.toFixed(1)} / 100</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ 
                                width: `${val}%`, 
                                background: val < 40 ? "#D85A30" : val < 70 ? "#E6A23C" : "#1D9E75" 
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-black/30 border border-white/5">
                  <p style={{ color: "var(--nt-text-ghost)", fontSize: 11, fontStyle: "italic", lineHeight: 1.4 }}>
                    {speechReport.disclaimer}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
