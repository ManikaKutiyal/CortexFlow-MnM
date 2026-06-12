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
      .from("emergency_events")
      .select("id, patient_id, urgency, status, location, details, created_at, resolved_at, photo_url, email_sent")
      .eq("patient_id", user.uid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to load events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json() as { urgency?: string; location?: string; detail?: string; photo?: string };
    const urgency = String(body.urgency ?? "high").trim();
    const allowed = new Set(["low", "medium", "high", "critical"]);
    if (!allowed.has(urgency)) {
      return NextResponse.json({ error: "Invalid urgency" }, { status: 400 });
    }
    const payload = {
      patient_id: user.uid,
      triggered_by: user.uid,
      location: body.location ?? null,
      urgency,
      status: "open",
      details: body.detail ? { detail: body.detail } : null,
      photo_url: body.photo ?? null,
    };
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("emergency_events")
      .insert(payload)
      .select("id, patient_id, urgency, status, location, details, created_at, resolved_at, photo_url, email_sent")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    void (async () => {
      try {
        const { data: patientRow } = await supabase
          .from("users")
          .select("full_name, display_name, unique_patient_id")
          .eq("id", user.uid)
          .maybeSingle();
        const patientName = patientRow?.display_name ?? patientRow?.full_name ?? user.name ?? user.email ?? "Patient";
        const patientId = patientRow?.unique_patient_id ?? user.uid;
        const emailOpts = {
          patientName,
          patientId,
          urgency,
          location: body.location ?? null,
          detail: body.detail ?? null,
          photoBase64: body.photo ?? null,
        };
        const recipients: string[] = [];
        const { data: caregiverLink } = await supabase
          .from("caregiver_patient_links")
          .select("caregiver_id")
          .eq("patient_id", user.uid)
          .eq("status", "approved")
          .maybeSingle();
        if (caregiverLink?.caregiver_id) {
          const { data: cg } = await supabase
            .from("users")
            .select("email")
            .eq("id", caregiverLink.caregiver_id)
            .maybeSingle();
          if (cg?.email) recipients.push(cg.email);
        }
        const { data: providerLinks } = await supabase
          .from("provider_patient_links")
          .select("provider_id")
          .eq("patient_id", user.uid);
        for (const pl of providerLinks ?? []) {
          const { data: prov } = await supabase
            .from("users")
            .select("email")
            .eq("id", pl.provider_id)
            .maybeSingle();
          if (prov?.email) recipients.push(prov.email);
        }
        for (const email of recipients) {
          await sendSosEmail({ ...emailOpts, recipientEmail: email });
        }
        if (recipients.length > 0) {
          await supabase
            .from("emergency_events")
            .update({ email_sent: true })
            .eq("id", data.id);
        }
      } catch {
      }
    })();
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
