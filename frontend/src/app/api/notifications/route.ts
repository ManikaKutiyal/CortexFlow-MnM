import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const supabase = getSupabaseServerClient();

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id, title, body, sender_id, created_at, read_at")
      .eq("recipient_id", user.uid)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const senderIds = Array.from(new Set((notifications ?? []).map((item) => item.sender_id).filter(Boolean))) as string[];
    let senderMap = new Map<string, string>();

    if (senderIds.length) {
      const { data: senders } = await supabase
        .from("users")
        .select("id, display_name, email")
        .in("id", senderIds);

      senderMap = new Map((senders ?? []).map((sender) => [sender.id, sender.display_name ?? sender.email ?? "Sender"]));
    }

    const payload = (notifications ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body ?? null,
      sender_name: item.sender_id ? senderMap.get(item.sender_id) ?? null : null,
      created_at: item.created_at,
      read_at: item.read_at,
    }));

    return NextResponse.json({ notifications: payload });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
