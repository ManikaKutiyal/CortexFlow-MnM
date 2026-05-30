import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FACE_RECOGNITION_URL = (process.env.FACE_RECOGNITION_URL ?? "http://localhost:5002").replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${FACE_RECOGNITION_URL}/face/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: detail || "Face recognition failed" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Face recognition failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
