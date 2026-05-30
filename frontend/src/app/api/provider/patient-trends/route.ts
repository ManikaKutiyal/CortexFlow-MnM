import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

const TREND_DELTA = 0.05;
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

function parseOverallLoad(reportRow: { scores?: unknown; report?: unknown }) {
  const report = reportRow.report as { overall_cognitive_load?: unknown } | undefined;
  if (report && typeof report.overall_cognitive_load === "number") {
    return report.overall_cognitive_load as number;
  }

  const scores = reportRow.scores as Record<string, number | { overall?: number }> | undefined;
  if (!scores) return null;

  const values = Object.values(scores)
    .map((value) => (typeof value === "number" ? value : typeof value?.overall === "number" ? value.overall : null))
    .filter((value): value is number => typeof value === "number");

  if (!values.length) return null;

  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

function parseDomainScores(reportRow: { scores?: unknown }) {
  const scores = reportRow.scores as Record<string, number | { overall?: number }> | undefined;
  const parsed: Record<string, number | null> = {};

  for (const key of DOMAIN_KEYS) {
    const value = scores?.[key];
    parsed[key] = typeof value === "number" ? value : typeof value?.overall === "number" ? value.overall : null;
  }

  return parsed;
}

function riskWeight(level: string | null | undefined) {
  if (level === "high") return 3;
  if (level === "moderate") return 2;
  if (level === "low") return 1;
  return 0;
}

function average(values: number[]) {
  if (!values.length) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

function computeTrend(values: number[]) {
  if (values.length < 4) return "insufficient_data" as const;

  const midpoint = Math.floor(values.length / 2);
  const recent = values.slice(0, midpoint);
  const older = values.slice(midpoint);

  const recentAvg = average(recent) ?? 0;
  const olderAvg = average(older) ?? 0;

  if (recentAvg + TREND_DELTA < olderAvg) return "improving" as const;
  if (recentAvg - TREND_DELTA > olderAvg) return "worsening" as const;
  return "stable" as const;
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
        reports: [],
        metrics: [],
      });
    }

    const { data: patients } = await supabase
      .from("users")
      .select("id, display_name, email")
      .in("id", patientIds);

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
        reports: [],
        metrics: [],
      });
    }

    const [patientRes, profileRes, reportsRes, metricsRes, tasksRes, alertsRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, display_name, email, photo_url")
        .eq("id", selectedPatientId)
        .maybeSingle(),
      supabase
        .from("patient_profiles")
        .select("diagnosis_stage, condition_notes, preferred_language")
        .eq("user_id", selectedPatientId)
        .maybeSingle(),
      supabase
        .from("reports")
        .select("id, created_at, scores, report")
        .eq("user_id", selectedPatientId)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("health_metrics")
        .select("metric_name, metric_value, unit, measured_at")
        .eq("patient_id", selectedPatientId)
        .order("measured_at", { ascending: false })
        .limit(30),
      supabase
        .from("care_tasks")
        .select("id, status, priority, due_at")
        .eq("patient_id", selectedPatientId),
      supabase
        .from("emergency_events")
        .select("id, status, urgency, created_at")
        .eq("patient_id", selectedPatientId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const reports = (reportsRes.data ?? []) as Array<{ id: string; created_at: string; scores?: unknown; report?: unknown }>;
    const reportLoads = reports
      .map((report) => parseOverallLoad(report))
      .filter((value): value is number => typeof value === "number");

    const lastReport = reports[0];
    const lastReportPayload = lastReport?.report as { risk_level?: string; summary?: string } | undefined;

    const summary = {
      avg_cognitive_load: average(reportLoads),
      trend: computeTrend(reportLoads),
      last_report_at: lastReport?.created_at ?? null,
      last_risk_level: lastReportPayload?.risk_level ?? null,
      last_summary: lastReportPayload?.summary ?? null,
    };

    const metrics = (metricsRes.data ?? []) as Array<{ metric_name: string; metric_value: number | null; unit: string | null; measured_at: string | null }>;
    const latestMetricsMap = new Map<string, typeof metrics[0]>();
    for (const metric of metrics) {
      if (!latestMetricsMap.has(metric.metric_name)) {
        latestMetricsMap.set(metric.metric_name, metric);
      }
    }

    const domainScores = DOMAIN_KEYS.map((domain) => {
      const values = reports
        .map((report) => parseDomainScores(report)[domain])
        .filter((value): value is number => typeof value === "number");

      return {
        domain,
        latest: values[0] ?? null,
        average: average(values),
        trend: computeTrend(values),
      };
    });

    const reportSeries = reports
      .slice()
      .reverse()
      .map((report) => {
        const payload = report.report as { risk_level?: string; overall_cognitive_load?: number } | undefined;
        return {
          id: report.id,
          created_at: report.created_at,
          load: payload?.overall_cognitive_load ?? parseOverallLoad(report),
          risk_level: payload?.risk_level ?? null,
          risk_weight: riskWeight(payload?.risk_level),
          scores: parseDomainScores(report),
        };
      });

    const taskRows = (tasksRes.data ?? []) as Array<{ status: string; priority: string | null; due_at: string | null }>;
    const alertRows = (alertsRes.data ?? []) as Array<{ status: string; urgency: string | null; created_at: string | null }>;
    const openTasks = taskRows.filter((task) => task.status !== "completed" && task.status !== "cancelled");
    const openAlerts = alertRows.filter((alert) => alert.status === "open");
    const urgentTasks = openTasks.filter((task) => task.priority === "urgent" || task.priority === "high");
    const latestAlert = alertRows[0] ?? null;

    return NextResponse.json({
      patients: patientList,
      selected_patient_id: selectedPatientId,
      patient: {
        id: patientRes.data?.id ?? selectedPatientId,
        name: patientRes.data?.display_name ?? patientRes.data?.email ?? "Patient",
        email: patientRes.data?.email ?? null,
        photo_url: patientRes.data?.photo_url ?? null,
        diagnosis_stage: profileRes.data?.diagnosis_stage ?? null,
        condition_notes: profileRes.data?.condition_notes ?? null,
        preferred_language: profileRes.data?.preferred_language ?? null,
      },
      summary,
      care_status: {
        open_tasks: openTasks.length,
        urgent_tasks: urgentTasks.length,
        open_alerts: openAlerts.length,
        latest_alert_urgency: latestAlert?.urgency ?? null,
        latest_alert_at: latestAlert?.created_at ?? null,
      },
      series: reportSeries,
      domains: domainScores,
      reports: reports.slice(0, 6).map((report) => {
        const payload = report.report as { risk_level?: string; summary?: string; overall_cognitive_load?: number } | undefined;
        return {
          id: report.id,
          created_at: report.created_at,
          risk_level: payload?.risk_level ?? null,
          summary: payload?.summary ?? null,
          overall_cognitive_load: payload?.overall_cognitive_load ?? parseOverallLoad(report),
        };
      }),
      metrics: Array.from(latestMetricsMap.values()).slice(0, 6),
    });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load patient trends";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
