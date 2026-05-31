import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

function generatePatientId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json() as { role?: string; full_name?: string; phone?: string };
    const role = String(body.role ?? "").trim();
    const allowed = new Set(["patient", "caregiver", "provider"]);
    if (!allowed.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const supabase = getSupabaseServerClient();
    const updates: Record<string, unknown> = {
      role,
      needs_role_selection: false,
      full_name: body.full_name?.trim() ?? null,
      phone: body.phone?.trim() ?? null,
    };
    if (role === "patient") {
      const pid = generatePatientId();
      updates.unique_patient_id = pid;
    }
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.uid)
      .select("id, role, needs_role_selection, unique_patient_id, full_name, phone")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ user: data });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to set role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
