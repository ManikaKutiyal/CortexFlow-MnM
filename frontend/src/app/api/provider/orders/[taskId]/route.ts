import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

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

export async function PATCH(req: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { taskId } = await context.params;
    const supabase = getSupabaseServerClient();
    const patientIds = await resolvePatientIds(supabase, user.uid);

    const body = await req.json();
    const status = String(body.status ?? "").trim();
    const allowed = new Set(["open", "in_progress", "completed", "cancelled"]);

    if (!allowed.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("care_tasks")
      .select("id, patient_id")
      .eq("id", taskId)
      .maybeSingle();

    if (!existing || !patientIds.includes(existing.patient_id)) {
      return NextResponse.json({ error: "Task not accessible" }, { status: 403 });
    }

    const updatePayload: Record<string, unknown> = { status };
    if (status === "completed") {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("care_tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .select("id, patient_id, title, description, task_type, priority, due_at, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: patientRow } = await supabase
      .from("users")
      .select("id, display_name, email")
      .eq("id", data.patient_id)
      .maybeSingle();

    return NextResponse.json({
      task: {
        ...data,
        patient_name: patientRow?.display_name ?? patientRow?.email ?? "Patient",
      },
    }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to update order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
