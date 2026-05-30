import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("emergency_events")
      .select("id, patient_id, urgency, status, location, details, created_at, resolved_at")
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
    const body = await req.json();

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
    };

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("emergency_events")
      .insert(payload)
      .select("id, patient_id, urgency, status, location, details, created_at, resolved_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
