import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { id } = await params;
    const body = await req.json() as { status?: string };
    const status = String(body.status ?? "").trim();
    if (status !== "active" && status !== "revoked") {
      return NextResponse.json({ error: "Status must be active or revoked" }, { status: 400 });
    }
    const supabase = getSupabaseServerClient();
    const { data: link, error: fetchError } = await supabase
      .from("caregiver_patient_links")
      .select("id, patient_id, caregiver_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError || !link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    if (link.patient_id !== user.uid) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("caregiver_patient_links")
      .update({ status })
      .eq("id", id)
      .select("id, patient_id, caregiver_id, status")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ link: data });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to update link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
