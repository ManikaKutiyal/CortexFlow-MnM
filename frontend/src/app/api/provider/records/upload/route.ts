import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { patient_id, record_type, title, description, file_path } = body;

    if (!patient_id || !record_type || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify provider is linked to this patient
    const { data: link, error: linkError } = await supabase
      .from("provider_patient_links")
      .select("id")
      .eq("provider_id", user.uid)
      .eq("patient_id", patient_id)
      .eq("status", "active")
      .maybeSingle();

    if (linkError || !link) {
      return NextResponse.json({ error: "Not authorized to upload records for this patient" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("patient_records")
      .insert({
        patient_id,
        record_type,
        title,
        description: description || null,
        file_path: file_path || null,
      })
      .select("id, patient_id, record_type, title, description, file_path, created_at")
      .single();

    if (error) {
      console.error("Failed to insert record:", error);
      return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
    }

    return NextResponse.json({ record: data });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to upload record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
