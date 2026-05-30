import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";

export const runtime = "nodejs";

const VOICE_REMINDER_URL = (process.env.VOICE_REMINDER_URL ?? "http://localhost:5003").replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  try {
    await requireAuthenticatedUser(req);
    const body = await req.json();
    const text = String(body.text ?? "").trim();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const res = await fetch(`${VOICE_REMINDER_URL}/process-voice-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const message = await res.text();
      return NextResponse.json({ error: message || "Failed to parse reminder" }, { status: res.status });
    }

    const data = await res.json() as { reminder?: unknown; success?: boolean; message?: string };

    if (data.success === false) {
      return NextResponse.json({ error: data.message || "Failed to parse reminder" }, { status: 502 });
    }

    return NextResponse.json({ reminder: data.reminder ?? null });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to parse reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
