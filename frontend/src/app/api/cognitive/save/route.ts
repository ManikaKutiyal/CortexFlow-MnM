import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();

    const { type, score, details } = body;

    if (!type || (type !== "memory_quiz" && type !== "speech_analysis")) {
      return NextResponse.json({ error: "Invalid assessment type" }, { status: 400 });
    }

    if (score === undefined || score === null) {
      return NextResponse.json({ error: "Score is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("cognitive_assessments")
      .insert({
        patient_id: user.uid,
        type: type,
        score: score,
        details: details || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "Failed to save assessment to database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error saving assessment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
