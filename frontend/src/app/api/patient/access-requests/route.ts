import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    
    const [ { data: caregiverData, error: caregiverError }, { data: providerData, error: providerError } ] = await Promise.all([
      supabase
        .from("caregiver_patient_links")
        .select("id, caregiver_id, status, created_at, users!caregiver_patient_links_caregiver_id_fkey(full_name, display_name, email)")
        .eq("patient_id", user.uid),
      supabase
        .from("provider_patient_links")
        .select("id, provider_id, status, created_at, users!provider_patient_links_provider_id_fkey(full_name, display_name, email)")
        .eq("patient_id", user.uid)
    ]);

    if (caregiverError) throw caregiverError;
    if (providerError) throw providerError;

    const caregiverRequests = (caregiverData ?? []).map((req: any) => ({
      ...req,
      type: "caregiver",
      requester_id: req.caregiver_id,
    }));

    const providerRequests = (providerData ?? []).map((req: any) => ({
      ...req,
      type: "provider",
      requester_id: req.provider_id,
    }));

    const allRequests = [...caregiverRequests, ...providerRequests].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ requests: allRequests });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to load requests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
