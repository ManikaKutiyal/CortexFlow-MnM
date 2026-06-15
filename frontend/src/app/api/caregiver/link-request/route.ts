import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";
import { sendSosEmail } from "@/libs/mailer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("caregiver_patient_links")
      .select("id, patient_id, status, created_at, users!caregiver_patient_links_patient_id_fkey(full_name, display_name, email, unique_patient_id)")
      .eq("caregiver_id", user.uid)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ links: data ?? [] });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to load links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (user.role !== "caregiver") {
      return NextResponse.json({ error: "Only caregivers can send link requests" }, { status: 403 });
    }
    const body = await req.json() as { unique_patient_id?: string };
    const patientCode = String(body.unique_patient_id ?? "").trim().toUpperCase();
    if (!patientCode) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }
    const supabase = getSupabaseServerClient();
    const { data: patient, error: lookupError } = await supabase
      .from("users")
      .select("id, email, full_name, display_name")
      .eq("unique_patient_id", patientCode)
      .maybeSingle();
    if (lookupError || !patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const { data, error } = await supabase
      .from("caregiver_patient_links")
      .insert({ caregiver_id: user.uid, patient_id: patient.id, status: "pending" })
      .select("id, patient_id, status, created_at")
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A link already exists for this patient" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (patient.email) {
      void sendSosEmail({
        patientName: patient.display_name ?? patient.full_name ?? "Patient",
        patientId: patientCode,
        urgency: "info",
        location: null,
        detail: `A caregiver has requested access to your health data. Please review in your CortexFlow dashboard.`,
        photoBase64: null,
        recipientEmail: patient.email,
      }).catch(() => {});
    }
    return NextResponse.json({ link: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to create link request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json() as { patient_id?: string };
    const patientId = String(body.patient_id ?? "").trim();
    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("caregiver_patient_links")
      .delete()
      .eq("caregiver_id", user.uid)
      .eq("patient_id", patientId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to remove patient";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
