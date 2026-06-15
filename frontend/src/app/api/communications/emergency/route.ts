import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { broadcastPatientAlert } from "@/libs/notifications-service";
import { getSupabaseServerClient } from "@/libs/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();

    const { patientId, message, senderName } = body;

    if (!patientId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    const { data: userData } = await supabase.from("users").select("display_name, role").eq("id", user.uid).single();
    let finalSenderName = userData?.display_name || "User";

    if (userData?.role === "provider") {
      const { data: providerData } = await supabase.from("provider_profiles").select("org_name").eq("user_id", user.uid).single();
      if (providerData?.org_name) {
        finalSenderName = providerData.org_name;
      }
    }

    // This triggers the email engine that was built previously
    // It will email the patient, their caregivers, and their providers.
    await broadcastPatientAlert(
      patientId,
      `You have a new message from ${finalSenderName}`,
      `Emergency Mode has been activated in the chat.\n\nMessage: "${message}"\n\nPlease log in immediately to assist.`,
      "danger",
      user.uid
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Emergency alert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
