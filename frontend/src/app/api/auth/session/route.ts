import { type NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/libs/local-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email ?? "",
        name: user.name ?? user.email?.split("@")[0] ?? "Researcher",
        photoUrl: user.picture ?? "",
        providerId: user.provider ?? "password",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load auth session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
