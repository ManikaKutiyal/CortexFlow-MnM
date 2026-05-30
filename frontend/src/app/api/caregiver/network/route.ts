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
      return NextResponse.json({ patient: null, members: [], notes: [] });
    }

    const [patientRow, patientProfile, patientUserProfile, providerLinks, caregiverLinks, notesRes] = await Promise.all([
      supabase.from("users").select("id, display_name, email").eq("id", patientId).maybeSingle(),
      supabase.from("patient_profiles").select("primary_caregiver_id, primary_provider_id, condition_notes").eq("user_id", patientId).maybeSingle(),
      supabase.from("user_profiles").select("emergency_contact_name, emergency_contact_phone").eq("user_id", patientId).maybeSingle(),
      supabase.from("provider_patient_links").select("provider_id").eq("patient_id", patientId).eq("status", "active"),
      supabase.from("caregiver_patient_links").select("caregiver_id").eq("patient_id", patientId).eq("status", "active"),
      supabase
        .from("patient_records")
        .select("id, title, description, created_at")
        .eq("patient_id", patientId)
        .eq("record_type", "note")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const providerIds = Array.from(
      new Set((providerLinks.data ?? []).map((row) => row.provider_id).filter(Boolean))
    ) as string[];
    const caregiverIds = Array.from(
      new Set((caregiverLinks.data ?? []).map((row) => row.caregiver_id).filter(Boolean))
    ) as string[];

    const { data: providerRows } = providerIds.length
      ? await supabase.from("users").select("id, display_name, email").in("id", providerIds)
      : { data: [] as Array<{ id: string; display_name: string | null; email: string | null }> };

    const { data: caregiverRows } = caregiverIds.length
      ? await supabase.from("users").select("id, display_name, email").in("id", caregiverIds)
      : { data: [] as Array<{ id: string; display_name: string | null; email: string | null }> };
    const providerList = providerRows ?? [];
    const caregiverList = caregiverRows ?? [];

    const members = [
      patientRow.data
        ? {
          id: patientRow.data.id,
          name: patientRow.data.display_name ?? patientRow.data.email ?? "Patient",
          email: patientRow.data.email ?? null,
          role: "patient" as const,
          detail: patientProfile.data?.condition_notes ?? null,
        }
        : null,
      ...caregiverList.map((row) => ({
        id: row.id,
        name: row.display_name ?? row.email ?? "Caregiver",
        email: row.email ?? null,
        role: "caregiver" as const,
        detail: row.id === patientProfile.data?.primary_caregiver_id ? "Primary caregiver" : null,
      })),
      ...providerList.map((row) => ({
        id: row.id,
        name: row.display_name ?? row.email ?? "Provider",
        email: row.email ?? null,
        role: "provider" as const,
        detail: row.id === patientProfile.data?.primary_provider_id ? "Primary provider" : null,
      })),
      patientUserProfile.data?.emergency_contact_name
        ? {
          id: "emergency-contact",
          name: patientUserProfile.data.emergency_contact_name,
          email: null,
          role: "contact" as const,
          detail: patientUserProfile.data.emergency_contact_phone ?? null,
        }
        : null,
    ].filter(Boolean) as Array<{ id: string; name: string; email: string | null; role: "patient" | "caregiver" | "provider" | "contact"; detail: string | null }>;

    return NextResponse.json({
      patient: patientRow.data ? { id: patientRow.data.id, name: patientRow.data.display_name ?? null } : null,
      members,
      notes: (notesRes.data ?? []).map((note) => ({
        id: note.id,
        title: note.title,
        description: note.description ?? null,
        created_at: note.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load care network";
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

    const { data, error } = await supabase
      .from("patient_records")
      .insert({
        patient_id: patientId,
        uploaded_by: user.uid,
        record_type: "note",
        title,
        description: body.description ?? null,
      })
      .select("id, title, description, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      note: {
        id: data.id,
        title: data.title,
        description: data.description ?? null,
        created_at: data.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to save note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
