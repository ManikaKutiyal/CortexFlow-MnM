import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { taskId } = await context.params;
    const body = await req.json();
    const status = String(body.status ?? "").trim();
    const allowed = new Set(["open", "in_progress", "completed", "cancelled"]);

    if (!allowed.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const updatePayload: Record<string, unknown> = { status };
    if (status === "completed") {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("care_tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .eq("patient_id", user.uid)
      .select("id, patient_id, title, description, task_type, priority, due_at, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
