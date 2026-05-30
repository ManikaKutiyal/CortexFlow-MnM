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

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const patientIds = await resolvePatientIds(supabase, user.uid);

    if (!patientIds.length) {
      return NextResponse.json({ patients: [], tasks: [] });
    }

    const [{ data: patients }, { data: tasks }] = await Promise.all([
      supabase.from("users").select("id, display_name, email").in("id", patientIds),
      supabase
        .from("care_tasks")
        .select("id, patient_id, title, description, task_type, priority, due_at, status, created_at")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const patientMap = new Map(
      (patients ?? []).map((patient) => [patient.id, patient.display_name ?? patient.email ?? "Patient"])
    );

    return NextResponse.json({
      patients: (patients ?? []).map((patient) => ({
        id: patient.id,
        name: patient.display_name ?? patient.email ?? "Patient",
      })),
      tasks: (tasks ?? []).map((task) => ({
        ...task,
        patient_name: patientMap.get(task.patient_id) ?? "Patient",
      })),
    });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const patientIds = await resolvePatientIds(supabase, user.uid);

    const body = await req.json();
    const patientId = String(body.patientId ?? "").trim();
    const title = String(body.title ?? "").trim();

    if (!patientId || !title) {
      return NextResponse.json({ error: "Patient and title are required" }, { status: 400 });
    }

    if (!patientIds.includes(patientId)) {
      return NextResponse.json({ error: "Patient not linked to provider" }, { status: 403 });
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

    const { data: patientRow } = await supabase
      .from("users")
      .select("id, display_name, email")
      .eq("id", patientId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("care_tasks")
      .insert({
        patient_id: patientId,
        created_by: user.uid,
        assigned_to: patientId,
        title,
        description: body.description ?? null,
        task_type: taskType,
        priority,
        due_at: body.dueAt ?? null,
        status: "open",
      })
      .select("id, patient_id, title, description, task_type, priority, due_at, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      task: {
        ...data,
        patient_name: patientRow?.display_name ?? patientRow?.email ?? "Patient",
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
