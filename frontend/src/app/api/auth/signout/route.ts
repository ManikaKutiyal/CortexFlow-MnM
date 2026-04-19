import { type NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, clearSessionCookie, deleteSessionById } from "@/libs/local-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get(AUTH_SESSION_COOKIE)?.value;

    if (sessionId) {
      await deleteSessionById(sessionId);
    }

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
