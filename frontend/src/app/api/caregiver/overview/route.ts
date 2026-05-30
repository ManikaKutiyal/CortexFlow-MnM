import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

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

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const patientId = await resolvePatientId(supabase, user.uid);

    if (!patientId) {
      return NextResponse.json({ patient: null, summary: { open_tasks: 0, open_alerts: 0, total_reports: 0 } });
    }

    const [{ data: patientRow, error: patientError }, { data: profileRow }, { data: tasks }, { data: alerts }, { data: reports }] = await Promise.all([
      supabase.from("users").select("id, email, display_name, photo_url").eq("id", patientId).maybeSingle(),
      supabase.from("patient_profiles").select("condition_notes").eq("user_id", patientId).maybeSingle(),
      supabase.from("care_tasks").select("id, status").eq("patient_id", patientId),
      supabase.from("emergency_events").select("id, status").eq("patient_id", patientId),
      supabase.from("reports").select("id").eq("user_id", patientId),
    ]);

    if (patientError) {
      return NextResponse.json({ error: patientError.message }, { status: 500 });
    }

    const openTasks = (tasks ?? []).filter((task) => task.status !== "completed").length;
    const openAlerts = (alerts ?? []).filter((alert) => alert.status === "open").length;
    const totalReports = (reports ?? []).length;

    return NextResponse.json({
      patient: patientRow
        ? {
          id: patientRow.id,
          name: patientRow.display_name ?? patientRow.email ?? "Patient",
          email: patientRow.email ?? null,
          photo_url: patientRow.photo_url ?? null,
          condition_notes: profileRow?.condition_notes ?? null,
        }
        : null,
      summary: {
        open_tasks: openTasks,
        open_alerts: openAlerts,
        total_reports: totalReports,
      },
    });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
