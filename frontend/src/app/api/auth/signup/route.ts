import { type NextRequest, NextResponse } from "next/server";
import {
  createSession,
  hashPassword,
  normalizeEmail,
  setSessionCookie,
} from "@/libs/local-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Use at least 6 characters for your password." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existingCredential } = await supabase
      .from("user_credentials")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (existingCredential?.user_id) {
      return NextResponse.json(
        { error: "This email already has an account. Please sign in." },
        { status: 409 }
      );
    }

    const { data: usersByEmail } = await supabase
      .from("users")
      .select("id, provider, display_name")
      .eq("email", email)
      .order("created_at", { ascending: true });

    const linkedUser =
      (usersByEmail ?? []).find((user) => user.provider === "password")
      ?? (usersByEmail ?? []).find((user) => Boolean(user.provider))
      ?? (usersByEmail ?? [])[0]
      ?? null;

    const userId = linkedUser?.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const displayName = linkedUser?.display_name || name || email.split("@")[0] || "Researcher";
    const provider = linkedUser?.provider ?? "password";

    let userWriteError: string | null = null;

    if (linkedUser) {
      const { error } = await supabase
        .from("users")
        .update({
          email,
          display_name: displayName,
          provider,
          last_login_at: now,
          updated_at: now,
        })
        .eq("id", userId);

      userWriteError = error?.message ?? null;
    } else {
      const { error } = await supabase.from("users").insert({
        id: userId,
        email,
        display_name: displayName,
        provider,
        last_login_at: now,
        updated_at: now,
      });

      userWriteError = error?.message ?? null;
    }

    if (userWriteError) {
      return NextResponse.json({ error: userWriteError }, { status: 500 });
    }

    const { error: credentialError } = await supabase.from("user_credentials").insert({
      user_id: userId,
      email,
      password_hash: hashPassword(password),
      updated_at: now,
    });

    if (credentialError) {
      if (!linkedUser) {
        await supabase.from("users").delete().eq("id", userId);
      }

      return NextResponse.json({ error: credentialError.message }, { status: 500 });
    }

    const { sessionId } = await createSession(userId);

    const response = NextResponse.json({
      user: {
        uid: userId,
        email,
        name: displayName,
        photoUrl: "",
        providerId: provider,
      },
    });

    setSessionCookie(response, sessionId);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
