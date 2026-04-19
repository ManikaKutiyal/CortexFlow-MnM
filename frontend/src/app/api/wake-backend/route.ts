import { NextResponse } from "next/server";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export const runtime = "nodejs";
export const maxDuration = 15;

async function checkBackendAwake() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return false;
    }

    const payload = await res.json().catch(() => ({}));
    return Boolean(payload?.ok);
  } catch {
    return false;
  }
}

export async function GET() {
  const ok = await checkBackendAwake();
  return NextResponse.json({ ok }, { status: ok ? 200 : 202 });
}

export async function POST() {
  const ok = await checkBackendAwake();
  return NextResponse.json({ ok }, { status: ok ? 200 : 202 });
}
