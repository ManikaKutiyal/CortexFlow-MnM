import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("reports")
      .select("id, created_at, input_type, input_snippet, scores, report, session_id, word_timestamps, audio_duration")
      .eq("user_id", user.uid)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();
    const body = await req.json();

    const payload = {
      user_id: user.uid,
      input_type: body.inputType,
      input_snippet: body.inputSnippet,
      scores: body.scores,
      report: body.report,
      session_id: body.sessionId,
      word_timestamps: body.wordTimestamps ?? null,
      audio_duration: body.audioDuration ?? null,
    };

    const { data, error } = await supabase
      .from("reports")
      .insert(payload)
      .select("id, created_at, input_type, input_snippet, scores, report, session_id, word_timestamps, audio_duration")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report: data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to create report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
