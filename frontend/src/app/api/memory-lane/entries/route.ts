import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("patient_memories")
      .select("id, title, description, media_path, media_type, recorded_at, created_at")
      .eq("patient_id", user.uid)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data ?? [] });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load memories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();

    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const mediaType = String(body.mediaType ?? "").trim();
    const allowedTypes = new Set(["image", "audio", "video", "text"]);
    if (mediaType && !allowedTypes.has(mediaType)) {
      return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
    }

    const payload = {
      patient_id: user.uid,
      created_by: user.uid,
      title,
      description: body.description ?? null,
      media_path: body.mediaPath ?? null,
      media_type: mediaType || null,
      recorded_at: body.recordedAt ?? null,
    };

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("patient_memories")
      .insert(payload)
      .select("id, title, description, media_path, media_type, recorded_at, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
