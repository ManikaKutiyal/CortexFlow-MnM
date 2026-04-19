import { type NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/libs/local-auth";
import { AuthRequestError, requireVerifiedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  provider: string | null;
  created_at: string;
};

function pickCanonicalUser(
  users: UserRow[],
  firebaseUid: string,
  credentialUserId: string | null
) {
  if (!users.length) {
    return null;
  }

  if (credentialUserId) {
    const credentialMatch = users.find((entry) => entry.id === credentialUserId);
    if (credentialMatch) {
      return credentialMatch;
    }
  }

  const uidMatch = users.find((entry) => entry.id === firebaseUid);
  if (uidMatch) {
    return uidMatch;
  }

  return users[0] ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser(req);
    const supabase = getSupabaseServerClient();

    const now = new Date().toISOString();
    const normalizedEmail = user.email ? normalizeEmail(user.email) : null;
    let credentialUserId: string | null = null;
    let usersByEmail: UserRow[] = [];

    if (normalizedEmail) {
      const { data: credential } = await supabase
        .from("user_credentials")
        .select("user_id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      credentialUserId = credential?.user_id ?? null;

      const { data: existingRows, error: existingRowsError } = await supabase
        .from("users")
        .select("id, email, display_name, photo_url, provider, created_at")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: true });

      if (existingRowsError) {
        return NextResponse.json({ error: existingRowsError.message }, { status: 500 });
      }

      usersByEmail = (existingRows ?? []) as UserRow[];
    } else {
      const { data: existingUserById } = await supabase
        .from("users")
        .select("id, email, display_name, photo_url, provider, created_at")
        .eq("id", user.uid)
        .maybeSingle();

      usersByEmail = existingUserById ? [existingUserById as UserRow] : [];
    }

    const canonicalUser = pickCanonicalUser(usersByEmail, user.uid, credentialUserId);
    const canonicalId = canonicalUser?.id ?? user.uid;
    const displayName = canonicalUser?.display_name || user.name || normalizedEmail?.split("@")[0] || "Researcher";
    const photoUrl = canonicalUser?.photo_url || user.picture || null;
    const provider = user.provider ?? canonicalUser?.provider ?? null;
    const email = normalizedEmail ?? canonicalUser?.email ?? null;

    let data: {
      id: string;
      email: string | null;
      display_name: string | null;
      photo_url: string | null;
      provider: string | null;
      last_login_at: string | null;
    } | null = null;
    let error: { message: string } | null = null;

    if (canonicalUser) {
      const result = await supabase
        .from("users")
        .update({
          email,
          display_name: displayName,
          photo_url: photoUrl,
          provider,
          last_login_at: now,
          updated_at: now,
        })
        .eq("id", canonicalId)
        .select("id, email, display_name, photo_url, provider, last_login_at")
        .single();

      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("users")
        .insert({
          id: canonicalId,
          email,
          display_name: displayName,
          photo_url: photoUrl,
          provider,
          last_login_at: now,
          updated_at: now,
        })
        .select("id, email, display_name, photo_url, provider, last_login_at")
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (normalizedEmail) {
      const duplicateIds = usersByEmail
        .map((entry) => entry.id)
        .filter((id) => id !== canonicalId);

      for (const duplicateId of duplicateIds) {
        const { error: reportsMergeError } = await supabase
          .from("reports")
          .update({ user_id: canonicalId })
          .eq("user_id", duplicateId);

        if (reportsMergeError) {
          return NextResponse.json({ error: reportsMergeError.message }, { status: 500 });
        }

        const { error: sessionsMergeError } = await supabase
          .from("auth_sessions")
          .update({ user_id: canonicalId })
          .eq("user_id", duplicateId);

        if (sessionsMergeError) {
          return NextResponse.json({ error: sessionsMergeError.message }, { status: 500 });
        }

        const { error: duplicateDeleteError } = await supabase
          .from("users")
          .delete()
          .eq("id", duplicateId);

        if (duplicateDeleteError) {
          return NextResponse.json({ error: duplicateDeleteError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Bootstrap failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
