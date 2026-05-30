import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

type Role = "patient" | "caregiver" | "provider";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const role = String(body.role ?? "").trim() as Role;

    if (!role || !["patient", "caregiver", "provider"].includes(role)) {
      return NextResponse.json({ error: "Role must be patient, caregiver, or provider." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update({
        role,
        needs_role_selection: false,
        role_selected_at: now,
        updated_at: now,
      })
      .eq("id", user.uid)
      .select("id, email, display_name, photo_url, provider, role, needs_role_selection")
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
