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
      return NextResponse.json({ tasks: [] });
    }

    const { data, error } = await supabase
      .from("care_tasks")
      .select("id, patient_id, title, description, task_type, priority, due_at, status, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: data ?? [] });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const patientId = await resolvePatientId(supabase, user.uid);

    if (!patientId) {
      return NextResponse.json({ error: "No linked patient" }, { status: 404 });
    }

    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const taskType = String(body.taskType ?? "general").trim();
    const allowedTypes = new Set(["medication", "appointment", "exercise", "checkin", "general"]);
    if (!allowedTypes.has(taskType)) {
      return NextResponse.json({ error: "Invalid task type" }, { status: 400 });
    }

    const priority = String(body.priority ?? "medium").trim();
    const allowedPriorities = new Set(["low", "medium", "high", "urgent"]);
    if (!allowedPriorities.has(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    const payload = {
      patient_id: patientId,
      created_by: user.uid,
      assigned_to: user.uid,
      title,
      description: body.description ?? null,
      task_type: taskType,
      priority,
      due_at: body.dueAt ?? null,
      status: "open",
    };

    const { data, error } = await supabase
      .from("care_tasks")
      .insert(payload)
      .select("id, patient_id, title, description, task_type, priority, due_at, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
