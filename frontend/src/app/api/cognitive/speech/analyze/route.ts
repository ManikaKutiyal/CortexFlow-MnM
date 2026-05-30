import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const COGNITIVE_BACKEND_URL = (process.env.COGNITIVE_BACKEND_URL ?? "http://localhost:5001").replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${COGNITIVE_BACKEND_URL}/speech/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: detail || "Speech analysis failed" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speech analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
