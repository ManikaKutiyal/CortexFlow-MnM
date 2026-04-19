import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export type SessionUser = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  provider: string | null;
};

export const AUTH_SESSION_COOKIE = "cortexflow_session";
const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedDigest] = storedHash.split(":");
  if (!salt || !expectedDigest) {
    return false;
  }

  const actualDigest = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedDigest, "hex");

  if (actualDigest.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualDigest, expectedBuffer);
}

export async function createSession(userId: string) {
  const supabase = getSupabaseServerClient();
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  const { error } = await supabase.from("auth_sessions").insert({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { sessionId, expiresAt };
}

export async function deleteSessionById(sessionId: string) {
  const supabase = getSupabaseServerClient();
  await supabase.from("auth_sessions").delete().eq("id", sessionId);
}

export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: sessionId,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export async function getSessionUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const sessionId = req.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!sessionId) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("auth_sessions")
    .select("id, user_id, expires_at, users!inner(id, email, display_name, photo_url, provider)")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await deleteSessionById(sessionId);
    return null;
  }

  const rawUser = Array.isArray(data.users) ? data.users[0] : data.users;
  if (!rawUser) {
    return null;
  }

  return {
    uid: rawUser.id,
    email: rawUser.email ?? null,
    name: rawUser.display_name ?? null,
    picture: rawUser.photo_url ?? null,
    provider: rawUser.provider ?? null,
  };
}

export function providerDisplayName(provider: string) {
  switch (provider) {
    case "google.com":
      return "Google";
    case "github.com":
      return "GitHub";
    case "facebook.com":
      return "Facebook";
    case "twitter.com":
      return "Twitter/X";
    case "microsoft.com":
      return "Microsoft";
    case "apple.com":
      return "Apple";
    default:
      return provider;
  }
}
