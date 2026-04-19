import { type NextRequest, NextResponse } from "next/server";
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      let detail = text;

      try {
        const parsed = JSON.parse(text) as { detail?: unknown; error?: unknown };
        if (typeof parsed.detail === "string" && parsed.detail.trim()) {
          detail = parsed.detail.trim();
        } else if (typeof parsed.error === "string" && parsed.error.trim()) {
          detail = parsed.error.trim();
        }
      } catch {
        // Keep raw response text when backend does not return JSON.
      }

      return NextResponse.json({ error: detail }, { status: res.status });
    }

    // Pipe the streaming NDJSON response through unchanged
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
