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
      return NextResponse.json({ patients: [], notifications: [] });
    }

    const [{ data: patients }, { data: notifications }] = await Promise.all([
      supabase.from("users").select("id, display_name, email").in("id", patientIds),
      supabase
        .from("notifications")
        .select("id, title, body, patient_id, created_at, read_at")
        .eq("sender_id", user.uid)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const patientList = (patients ?? []).map((patient) => ({
      id: patient.id,
      name: patient.display_name ?? patient.email ?? "Patient",
    }));

    return NextResponse.json({
      patients: patientList,
      notifications: notifications ?? [],
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
    const body = await req.json();

    const patientId = String(body.patientId ?? "").trim();
    const title = String(body.title ?? "").trim();

    if (!patientId || !title) {
      return NextResponse.json({ error: "Patient and title are required" }, { status: 400 });
    }

    const payload = {
      recipient_id: patientId,
      sender_id: user.uid,
      patient_id: patientId,
      type: "provider_message",
      title,
      body: body.body ?? null,
    };

    const { data, error } = await supabase
      .from("notifications")
      .insert(payload)
      .select("id, title, body, patient_id, created_at, read_at")
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
