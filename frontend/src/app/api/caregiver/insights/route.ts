import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

const DAYS_WINDOW = 7;
const TREND_DELTA = 0.05;

async function resolvePatientId(supabase: ReturnType<typeof getSupabaseServerClient>, caregiverId: string) {
  const { data, error } = await supabase
    .from("caregiver_patient_links")
    .select("patient_id")
    .eq("caregiver_id", caregiverId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.patient_id ?? null;
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

function buildRecommendations(payload: {
  tasksOpen: number;
  tasksDueSoon: number;
  openAlerts: number;
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
}) {
  const recommendations: string[] = [];

  if (payload.openAlerts > 0) {
    recommendations.push("Review open safety alerts and confirm resolution steps.");
  }

  if (payload.tasksDueSoon > 0) {
    recommendations.push("Prioritize tasks due in the next 48 hours.");
  }

  if (payload.tasksOpen > 5) {
    recommendations.push("Consider delegating or splitting larger care tasks to avoid overload.");
  }

  if (payload.trend === "worsening") {
    recommendations.push("Schedule an extra check-in and capture an updated speech sample this week.");
  }

  if (!recommendations.length) {
    recommendations.push("Maintain the current care plan and keep logging observations.");
  }

  return recommendations;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const patientId = await resolvePatientId(supabase, user.uid);

    if (!patientId) {
      return NextResponse.json({
        patient: null,
        summary: {
          total_reports: 0,
          avg_cognitive_load: null,
          trend: "insufficient_data",
          last_report_at: null,
          last_risk_level: null,
          last_summary: null,
        },
        tasks: { open: 0, due_soon: 0 },
        alerts: { open: 0, last_alert_at: null },
        recommendations: ["Link a patient to start receiving insights."],
        recent_reports: [],
      });
    }

    const now = Date.now();
    const sinceDate = new Date(now - DAYS_WINDOW * 24 * 60 * 60 * 1000).toISOString();

    const [patientRow, reportsRes, tasksRes, alertsRes] = await Promise.all([
      supabase.from("users").select("id, display_name").eq("id", patientId).maybeSingle(),
      supabase
        .from("reports")
        .select("id, created_at, scores, report")
        .eq("user_id", patientId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("care_tasks")
        .select("id, status, due_at")
        .eq("patient_id", patientId),
      supabase
        .from("emergency_events")
        .select("id, status, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    ]);

    const reports = (reportsRes.data ?? []) as Array<{ id: string; created_at: string; scores?: unknown; report?: unknown }>;
    const tasks = (tasksRes.data ?? []) as Array<{ status: string; due_at: string | null }>;
    const alerts = (alertsRes.data ?? []) as Array<{ status: string; created_at: string }>;

    const reportLoads = reports
      .map((report) => parseOverallLoad(report))
      .filter((value): value is number => typeof value === "number");

    const recentLoads = reports
      .filter((report) => report.created_at >= sinceDate)
      .map((report) => parseOverallLoad(report))
      .filter((value): value is number => typeof value === "number");

    const lastReport = reports[0];
    const lastReportPayload = lastReport?.report as { risk_level?: string; summary?: string; overall_cognitive_load?: number } | undefined;

    const avgLoad = average(recentLoads.length ? recentLoads : reportLoads);
    const trend = computeTrend(reportLoads);

    const openTasks = tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length;
    const dueSoon = tasks.filter((task) => {
      if (!task.due_at) return false;
      const due = new Date(task.due_at).getTime();
      return due <= now + 48 * 60 * 60 * 1000 && due >= now - 60 * 60 * 1000;
    }).length;

    const openAlerts = alerts.filter((alert) => alert.status === "open").length;
    const lastAlertAt = alerts[0]?.created_at ?? null;

    const recommendations = buildRecommendations({
      tasksOpen: openTasks,
      tasksDueSoon: dueSoon,
      openAlerts,
      trend,
    });

    return NextResponse.json({
      patient: patientRow.data ? { id: patientRow.data.id, name: patientRow.data.display_name ?? null } : null,
      summary: {
        total_reports: reports.length,
        avg_cognitive_load: avgLoad,
        trend,
        last_report_at: lastReport?.created_at ?? null,
        last_risk_level: lastReportPayload?.risk_level ?? null,
        last_summary: lastReportPayload?.summary ?? null,
      },
      tasks: { open: openTasks, due_soon: dueSoon },
      alerts: { open: openAlerts, last_alert_at: lastAlertAt },
      recommendations,
      recent_reports: reports.slice(0, 5).map((report) => {
        const payload = report.report as { risk_level?: string; summary?: string } | undefined;
        return {
          id: report.id,
          created_at: report.created_at,
          risk_level: payload?.risk_level ?? null,
          summary: payload?.summary ?? null,
        };
      }),
    });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
