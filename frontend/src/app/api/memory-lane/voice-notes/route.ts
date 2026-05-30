import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("voice_notes")
      .select("id, memory_id, speaker_name, relationship, duration_seconds, file_path, transcript, created_at")
      .eq("patient_id", user.uid)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: data ?? [] });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load voice notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();

    const filePath = String(body.filePath ?? "").trim();
    const transcript = String(body.transcript ?? "").trim();

    if (!filePath && !transcript) {
      return NextResponse.json({ error: "Audio path or transcript is required" }, { status: 400 });
    }

    const payload = {
      patient_id: user.uid,
      memory_id: body.memoryId ?? null,
      speaker_name: body.speakerName ?? null,
      relationship: body.relationship ?? null,
      duration_seconds: typeof body.durationSeconds === "number" ? body.durationSeconds : null,
      file_path: filePath || null,
      transcript: transcript || null,
    };

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("voice_notes")
      .insert(payload)
      .select("id, memory_id, speaker_name, relationship, duration_seconds, file_path, transcript, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create voice note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
