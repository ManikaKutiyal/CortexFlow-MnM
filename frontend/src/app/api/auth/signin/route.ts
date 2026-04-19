import { type NextRequest, NextResponse } from "next/server";
import {
  createSession,
  normalizeEmail,
  providerDisplayName,
  setSessionCookie,
  verifyPassword,
} from "@/libs/local-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: credential } = await supabase
      .from("user_credentials")
      .select("user_id, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (!credential) {
      const { data: providerRows } = await supabase
        .from("users")
        .select("provider")
        .eq("email", email)
        .order("created_at", { ascending: true });

      const socialProvider = (providerRows ?? []).find((row) => row.provider && row.provider !== "password")?.provider;

      if (socialProvider) {
        const providerName = providerDisplayName(socialProvider);
        return NextResponse.json(
          { error: `This email is linked to ${providerName} sign-in. Please use that method.` },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = verifyPassword(password, credential.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, email, display_name, photo_url, provider")
      .eq("id", credential.user_id)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const now = new Date().toISOString();
    await supabase.from("users").update({ last_login_at: now, updated_at: now }).eq("id", user.id);

    const { sessionId } = await createSession(user.id);

    const response = NextResponse.json({
      user: {
        uid: user.id,
        email: user.email ?? email,
        name: user.display_name ?? user.email?.split("@")[0] ?? "Researcher",
        photoUrl: user.photo_url ?? "",
        providerId: user.provider ?? "password",
      },
    });

    setSessionCookie(response, sessionId);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signin failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
