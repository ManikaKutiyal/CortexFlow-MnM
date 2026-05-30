"use client";

import { useCallback, useMemo, useState } from "react";

type QuizOption = {
  option_id: string;
  text: string;
};

type QuizQuestion = {
  question_id: string;
  title: string;
  description: string;
  image_path: string;
  question_type: string;
  options: QuizOption[];
};

type QuizSession = {
  session_id: string;
  user_id: string;
  difficulty_level: string;
  n_questions: number;
  questions: QuizQuestion[];
};

type QuizResult = {
  is_correct: boolean;
  correct_option_id: string;
  response_time_sec: number;
  session_metrics?: Record<string, unknown>;
};

type SpeechFormState = {
  wpm: string;
  pauseRate: string;
  ttr: string;
  jitter: string;
  articulationRate: string;
};

const glassCard: React.CSSProperties = {
  background: "var(--nt-glass)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
  backdropFilter: "blur(14px)",
};

type CognitiveAssessmentPanelProps = {
  userId?: string;
};

export function CognitiveAssessmentPanel({ userId }: CognitiveAssessmentPanelProps) {
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, QuizResult>>({});
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [finalResults, setFinalResults] = useState<Record<string, unknown> | null>(null);

  const [speechForm, setSpeechForm] = useState<SpeechFormState>({
    wpm: "145",
    pauseRate: "0.12",
    ttr: "0.78",
    jitter: "0.15",
    articulationRate: "2.1",
  });
  const [speechResult, setSpeechResult] = useState<Record<string, unknown> | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechLoading, setSpeechLoading] = useState(false);

  const canStartQuiz = Boolean(userId) && !quizLoading;

  const quizSummary = useMemo(() => {
    if (!quizSession) {
      return "Start a memory quiz to track cognitive performance.";
    }

    const answered = Object.keys(quizAnswers).length;
    return `${answered}/${quizSession.questions.length} questions answered.`;
  }, [quizAnswers, quizSession]);

  const createQuiz = useCallback(async () => {
    if (!userId) {
      setQuizError("Sign in to start a quiz.");
      return;
    }

    setQuizLoading(true);
    setQuizError(null);
    setFinalResults(null);

    try {
      const res = await fetch("/api/cognitive/quiz/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          difficulty_level: "mixed",
          n_questions: 8,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to start quiz");
      }

      const data = await res.json() as { session?: QuizSession };
      setQuizSession(data.session ?? null);
      setQuizAnswers({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start quiz";
      setQuizError(message);
    } finally {
      setQuizLoading(false);
    }
  }, [userId]);

  const submitAnswer = useCallback(async (question: QuizQuestion, option: QuizOption) => {
    if (!quizSession) return;

    const alreadyAnswered = Boolean(quizAnswers[question.question_id]);
    if (alreadyAnswered) return;

    const payload = {
      session_id: quizSession.session_id,
      question_id: question.question_id,
      selected_option_id: option.option_id,
      response_time_ms: 3500,
    };

    const res = await fetch("/api/cognitive/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await res.text();
      setQuizError(message || "Failed to submit answer");
      return;
    }

    const data = await res.json() as { result?: QuizResult };
    if (data.result) {
      setQuizAnswers((prev) => ({ ...prev, [question.question_id]: data.result as QuizResult }));
    }
  }, [quizAnswers, quizSession]);

  const completeQuiz = useCallback(async () => {
    if (!quizSession) return;

    const res = await fetch("/api/cognitive/quiz/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: quizSession.session_id }),
    });

    if (!res.ok) {
      const message = await res.text();
      setQuizError(message || "Failed to complete quiz");
      return;
    }

    const data = await res.json() as { results?: Record<string, unknown> };
    setFinalResults(data.results ?? null);
  }, [quizSession]);

  const runSpeechAnalysis = useCallback(async () => {
    setSpeechLoading(true);
    setSpeechError(null);

    const payload = {
      features: {
        wpm: Number(speechForm.wpm),
        pause_rate: Number(speechForm.pauseRate),
        ttr: Number(speechForm.ttr),
        jitter: Number(speechForm.jitter),
        articulation_rate: Number(speechForm.articulationRate),
      },
    };

    const res = await fetch("/api/cognitive/speech/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const message = await res.text();
      setSpeechError(message || "Speech analysis failed");
      setSpeechLoading(false);
      return;
    }

    const data = await res.json() as Record<string, unknown>;
    setSpeechResult(data);
    setSpeechLoading(false);
  }, [speechForm]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" style={{ padding: "18px" }}>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <h1 style={{ color: "var(--nt-text-hi)", fontSize: 18, fontFamily: "var(--font-syne)", fontWeight: 700 }}>
            Cognitive Assessments
          </h1>
          <button
            type="button"
            onClick={() => void createQuiz()}
            disabled={!canStartQuiz}
            className="rounded-lg px-3 py-1 text-[11px] disabled:opacity-50"
            style={{ border: "1px solid var(--nt-divider)", color: "var(--nt-text-md)" }}
          >
            Start Quiz
          </button>
        </div>
        <p style={{ color: "var(--nt-text-xs)", fontSize: 11 }}>{quizSummary}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl p-4" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Memory Quiz</div>
              <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Adaptive difficulty</span>
            </div>
            {quizError && (
              <div className="mb-3 text-xs" style={{ color: "#D85A30" }}>{quizError}</div>
            )}
            {!quizSession ? (
              <div style={{ color: "var(--nt-text-ghost)", fontSize: 12 }}>Start a quiz to see questions.</div>
            ) : (
              <div className="grid gap-3">
                {quizSession.questions.map((question) => {
                  const answer = quizAnswers[question.question_id];
                  return (
                    <div key={question.question_id} className="rounded-xl px-3 py-3" style={{ border: "1px solid var(--nt-divider)", background: "var(--nt-hdr)" }}>
                      <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>{question.title}</div>
                      <div className="text-xs" style={{ color: "var(--nt-text-lo)", marginTop: 4 }}>{question.description}</div>
                      <div className="grid gap-2 mt-3">
                        {question.options.map((option) => {
                          const isCorrect = answer?.correct_option_id === option.option_id;
                          const isSelected = Boolean(answer) && (answer?.correct_option_id === option.option_id || option.option_id === answer?.correct_option_id);
                          return (
                            <button
                              key={option.option_id}
                              type="button"
                              disabled={Boolean(answer)}
                              onClick={() => void submitAnswer(question, option)}
                              className="rounded-lg px-3 py-2 text-left text-xs disabled:opacity-70"
                              style={{
                                border: "1px solid var(--nt-divider)",
                                background: answer
                                  ? (isCorrect ? "rgba(29,158,117,0.12)" : "rgba(216,90,48,0.08)")
                                  : "var(--nt-glass)",
                                color: "var(--nt-text-md)",
                              }}
                            >
                              {option.text}
                              {answer && isSelected && (
                                <span style={{ marginLeft: 8, color: isCorrect ? "#1D9E75" : "#D85A30" }}>
                                  {isCorrect ? "Correct" : "Review"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => void completeQuiz()}
                  className="rounded-xl px-3 py-2 text-sm font-semibold"
                  style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
                >
                  Complete Session
                </button>
              </div>
            )}
          </div>

          {finalResults && (
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>Session Results</div>
              <pre className="text-xs mt-2 whitespace-pre-wrap" style={{ color: "var(--nt-text-lo)" }}>
                {JSON.stringify(finalResults, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl p-4" style={glassCard}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color: "var(--nt-text-hi)", fontSize: 13, fontWeight: 600 }}>Speech Biomarkers</div>
              <span style={{ color: "var(--nt-text-ghost)", fontSize: 10 }}>Quick input</span>
            </div>
            {speechError && (
              <div className="mb-3 text-xs" style={{ color: "#D85A30" }}>{speechError}</div>
            )}
            <div className="grid gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={speechForm.wpm}
                  onChange={(event) => setSpeechForm((prev) => ({ ...prev, wpm: event.target.value }))}
                  placeholder="WPM"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
                <input
                  value={speechForm.pauseRate}
                  onChange={(event) => setSpeechForm((prev) => ({ ...prev, pauseRate: event.target.value }))}
                  placeholder="Pause rate"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={speechForm.ttr}
                  onChange={(event) => setSpeechForm((prev) => ({ ...prev, ttr: event.target.value }))}
                  placeholder="TTR"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
                <input
                  value={speechForm.jitter}
                  onChange={(event) => setSpeechForm((prev) => ({ ...prev, jitter: event.target.value }))}
                  placeholder="Jitter"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
                />
              </div>
              <input
                value={speechForm.articulationRate}
                onChange={(event) => setSpeechForm((prev) => ({ ...prev, articulationRate: event.target.value }))}
                placeholder="Articulation rate"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--nt-hdr)", color: "var(--nt-text-hi)", border: "1px solid var(--nt-divider)" }}
              />
              <button
                type="button"
                onClick={() => void runSpeechAnalysis()}
                disabled={speechLoading}
                className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
              >
                {speechLoading ? "Analyzing..." : "Run Speech Analysis"}
              </button>
            </div>
          </div>

          {speechResult && (
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="text-sm" style={{ color: "var(--nt-text-hi)", fontWeight: 600 }}>Speech Result</div>
              <pre className="text-xs mt-2 whitespace-pre-wrap" style={{ color: "var(--nt-text-lo)" }}>
                {JSON.stringify(speechResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
