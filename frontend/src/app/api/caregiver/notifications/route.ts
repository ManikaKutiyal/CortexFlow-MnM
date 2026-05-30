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
      return NextResponse.json({ notifications: [], patient_name: null });
    }

    const [{ data: notifications }, { data: patient }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, patient_id, created_at")
        .eq("sender_id", user.uid)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("users")
        .select("display_name, email")
        .eq("id", patientId)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      notifications: notifications ?? [],
      patient_name: patient?.display_name ?? patient?.email ?? null,
    });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load notifications";
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

    const payload = {
      recipient_id: patientId,
      sender_id: user.uid,
      patient_id: patientId,
      type: "caregiver_message",
      title,
      body: body.body ?? null,
    };

    const { data, error } = await supabase
      .from("notifications")
      .insert(payload)
      .select("id, title, body, patient_id, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to send notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
