import { type NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/libs/local-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const emailParam = req.nextUrl.searchParams.get("email") ?? "";
    const email = normalizeEmail(emailParam);

    if (!email) {
      return NextResponse.json({ methods: [] });
    }

    const supabase = getSupabaseServerClient();
    const methods = new Set<string>();

    const { data: credential } = await supabase
      .from("user_credentials")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (credential?.user_id) {
      methods.add("password");
    }

    const { data: users } = await supabase
      .from("users")
      .select("provider")
      .eq("email", email)
      .order("created_at", { ascending: true });

    for (const user of users ?? []) {
      if (!user.provider) {
        continue;
      }

      if (user.provider === "password") {
        methods.add("password");
        continue;
      }

      methods.add(user.provider);
    }

    return NextResponse.json({ methods: Array.from(methods) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check sign-in methods";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
