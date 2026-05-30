import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

const DOMAIN_KEYS = ["lexical", "semantic", "prosody", "syntax", "affective"] as const;

async function resolvePatientIds(supabase: ReturnType<typeof getSupabaseServerClient>, providerId: string) {
  const { data, error } = await supabase
    .from("provider_patient_links")
    .select("patient_id")
    .eq("provider_id", providerId)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.patient_id).filter(Boolean) as string[];
}

function parseScores(value: unknown) {
  const scores = value as Record<string, number | { overall?: number }> | undefined;
  const parsed: Record<string, number | null> = {};

  for (const key of DOMAIN_KEYS) {
    const score = scores?.[key];
    parsed[key] = typeof score === "number" ? score : typeof score?.overall === "number" ? score.overall : null;
  }

  return parsed;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function riskWeight(level: string | null | undefined) {
  if (level === "high") return 3;
  if (level === "moderate") return 2;
  if (level === "low") return 1;
  return 0;
}

function parseWordCount(snippet: string | null | undefined) {
  if (!snippet) return null;
  const words = snippet.trim().split(/\s+/).filter(Boolean);
  return words.length || null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const patientIds = await resolvePatientIds(supabase, user.uid);

    if (!patientIds.length) {
      return NextResponse.json({
        patients: [],
        selected_patient_id: null,
        summary: null,
        sessions: [],
        domains: [],
        risk_mix: [],
      });
    }

    const { data: patients, error: patientError } = await supabase
      .from("users")
      .select("id, display_name, email")
      .in("id", patientIds);

    if (patientError) {
      throw new Error(patientError.message);
    }

    const patientList = (patients ?? []).map((patient) => ({
      id: patient.id,
      name: patient.display_name ?? patient.email ?? "Patient",
    }));

    const requestedId = req.nextUrl.searchParams.get("patientId") ?? "";
    const selectedPatientId = requestedId && patientIds.includes(requestedId)
      ? requestedId
      : patientList[0]?.id ?? null;

    if (!selectedPatientId) {
      return NextResponse.json({
        patients: patientList,
        selected_patient_id: null,
        summary: null,
        sessions: [],
        domains: [],
        risk_mix: [],
      });
    }

    const { data: reports, error: reportError } = await supabase
      .from("reports")
      .select("id, created_at, input_type, input_snippet, scores, report, word_timestamps, audio_duration")
      .eq("user_id", selectedPatientId)
      .order("created_at", { ascending: false })
      .limit(24);

    if (reportError) {
      throw new Error(reportError.message);
    }

    const rows = (reports ?? []) as Array<{
      id: string;
      created_at: string;
      input_type: string;
      input_snippet: string | null;
      scores: unknown;
      report: unknown;
      word_timestamps: unknown;
      audio_duration: number | null;
    }>;

    const sessions = rows.map((row) => {
      const report = row.report as {
        risk_level?: string;
        summary?: string;
        recommendation?: string;
        overall_cognitive_load?: number;
        risk_indicators?: Array<{ indicator?: string; severity?: string; explanation?: string }>;
      } | undefined;
      const scores = parseScores(row.scores);
      const wordTimestamps = Array.isArray(row.word_timestamps) ? row.word_timestamps : [];
      const excerptWordCount = parseWordCount(row.input_snippet);
      const wordCount = excerptWordCount ?? (wordTimestamps.length ? wordTimestamps.length : null);
      const durationMinutes = row.audio_duration && row.audio_duration > 0 ? row.audio_duration / 60 : null;
      const wordsPerMinute = durationMinutes && wordCount ? wordCount / durationMinutes : null;

      return {
        id: row.id,
        created_at: row.created_at,
        input_type: row.input_type,
        snippet: row.input_snippet ?? "",
        scores,
        load: typeof report?.overall_cognitive_load === "number" ? report.overall_cognitive_load : average(Object.values(scores).filter((score): score is number => typeof score === "number")),
        risk_level: report?.risk_level ?? null,
        risk_weight: riskWeight(report?.risk_level),
        summary: report?.summary ?? null,
        recommendation: report?.recommendation ?? null,
        indicators: report?.risk_indicators ?? [],
        audio_duration: row.audio_duration ?? null,
        word_count: wordCount,
        words_per_minute: wordsPerMinute,
      };
    });

    const latest = sessions[0] ?? null;
    const domainSummaries = DOMAIN_KEYS.map((domain) => {
      const values = sessions
        .map((session) => session.scores[domain])
        .filter((score): score is number => typeof score === "number");

      return {
        domain,
        latest: values[0] ?? null,
        average: average(values),
        peak: values.length ? Math.max(...values) : null,
      };
    });

    const riskMix = ["low", "moderate", "high"].map((level) => ({
      level,
      count: sessions.filter((session) => session.risk_level === level).length,
    }));

    return NextResponse.json({
      patients: patientList,
      selected_patient_id: selectedPatientId,
      summary: latest ? {
        latest_at: latest.created_at,
        latest_risk_level: latest.risk_level,
        latest_load: latest.load,
        latest_summary: latest.summary,
        avg_load: average(sessions.map((session) => session.load).filter((load): load is number => typeof load === "number")),
        avg_words_per_minute: average(sessions.map((session) => session.words_per_minute).filter((wpm): wpm is number => typeof wpm === "number")),
        sessions_count: sessions.length,
      } : null,
      sessions,
      domains: domainSummaries,
      risk_mix: riskMix,
    });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load speech analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
