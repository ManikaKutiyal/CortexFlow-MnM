import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();

    const { data: links, error: linkError } = await supabase
      .from("provider_patient_links")
      .select("patient_id")
      .eq("provider_id", user.uid)
      .eq("status", "active");

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    const patientIds = (links ?? []).map((link) => link.patient_id);
    if (!patientIds.length) {
      return NextResponse.json({ patients: [] });
    }

    const { data: patients, error: patientError } = await supabase
      .from("users")
      .select("id, email, display_name, full_name, photo_url, unique_patient_id")
      .in("id", patientIds);

    if (patientError) {
      return NextResponse.json({ error: patientError.message }, { status: 500 });
    }

    const [{ data: tasks }, { data: alerts }, { data: reports }] = await Promise.all([
      supabase.from("care_tasks").select("id, patient_id, status").in("patient_id", patientIds),
      supabase.from("emergency_events").select("id, patient_id, status").in("patient_id", patientIds),
      supabase.from("reports").select("id, user_id").in("user_id", patientIds),
    ]);

    const taskCounts = new Map<string, number>();
    for (const task of tasks ?? []) {
      if (task.status !== "completed") {
        taskCounts.set(task.patient_id, (taskCounts.get(task.patient_id) ?? 0) + 1);
      }
    }

    const alertCounts = new Map<string, number>();
    for (const alert of alerts ?? []) {
      if (alert.status === "open") {
        alertCounts.set(alert.patient_id, (alertCounts.get(alert.patient_id) ?? 0) + 1);
      }
    }

    const reportCounts = new Map<string, number>();
    for (const report of reports ?? []) {
      reportCounts.set(report.user_id, (reportCounts.get(report.user_id) ?? 0) + 1);
    }

    const payload = (patients ?? []).map((patient) => ({
      id: patient.id,
      name: patient.full_name ?? patient.display_name ?? patient.email ?? "Patient",
      email: patient.email ?? null,
      photo_url: patient.photo_url ?? null,
      unique_patient_id: patient.unique_patient_id ?? null,
      open_tasks: taskCounts.get(patient.id) ?? 0,
      open_alerts: alertCounts.get(patient.id) ?? 0,
      total_reports: reportCounts.get(patient.id) ?? 0,
    }));

    return NextResponse.json({ patients: payload });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load roster";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
