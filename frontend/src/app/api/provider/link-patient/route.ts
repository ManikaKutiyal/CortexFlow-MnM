import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("provider_patient_links")
      .select("id, patient_id, created_at, users!provider_patient_links_patient_id_fkey(full_name, email, unique_patient_id)")
      .eq("provider_id", user.uid)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ links: data ?? [] });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to load patients";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (user.role !== "provider") {
      return NextResponse.json({ error: "Only providers can add patients" }, { status: 403 });
    }
    const body = await req.json() as { unique_patient_id?: string };
    const patientCode = String(body.unique_patient_id ?? "").trim().toUpperCase();
    if (!patientCode) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }
    const supabase = getSupabaseServerClient();
    const { data: patient, error: lookupError } = await supabase
      .from("users")
      .select("id, email, full_name, unique_patient_id")
      .eq("unique_patient_id", patientCode)
      .maybeSingle();
    if (lookupError || !patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const { data, error } = await supabase
      .from("provider_patient_links")
      .insert({ provider_id: user.uid, patient_id: patient.id })
      .select("id, patient_id, created_at")
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Patient already in your roster" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ link: data, patient }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to add patient";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
