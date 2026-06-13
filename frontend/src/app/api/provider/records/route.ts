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
      return NextResponse.json({ records: [] });
    }

    const { data, error } = await supabase
      .from("patient_records")
      .select("id, patient_id, record_type, title, description, file_path, created_at")
      .in("patient_id", patientIds)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: usersData } = await supabase
      .from("users")
      .select("id, display_name, email")
      .in("id", patientIds);

    const userMap = new Map((usersData ?? []).map((u) => [u.id, u.display_name || u.email || "Unknown Patient"]));

    const enrichedRecords = (data ?? []).map((record) => ({
      ...record,
      patient_name: userMap.get(record.patient_id) || "Unknown Patient",
    }));

    return NextResponse.json({ records: enrichedRecords });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
