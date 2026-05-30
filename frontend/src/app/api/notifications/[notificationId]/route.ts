import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, context: { params: Promise<{ notificationId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { notificationId } = await context.params;
    const body = await req.json();

    if (!body.read) {
      return NextResponse.json({ error: "Only read updates supported" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("recipient_id", user.uid)
      .select("id, title, body, sender_id, created_at, read_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const senderName = data?.sender_id
      ? await supabase
        .from("users")
        .select("display_name, email")
        .eq("id", data.sender_id)
        .maybeSingle()
        .then((res) => res.data?.display_name ?? res.data?.email ?? null)
      : null;

    return NextResponse.json({
      notification: {
        id: data.id,
        title: data.title,
        body: data.body ?? null,
        sender_name: senderName,
        created_at: data.created_at,
        read_at: data.read_at,
      },
    });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to update notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
