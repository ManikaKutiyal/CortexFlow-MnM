import { type NextRequest, NextResponse } from "next/server";
import { AuthRequestError, requireAuthenticatedUser } from "@/libs/server-auth";
import { broadcastPatientAlert } from "@/libs/notifications-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();

    const { patientId, message, senderName } = body;

    if (!patientId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // This triggers the email engine that was built previously
    // It will email the patient, their caregivers, and their providers.
    await broadcastPatientAlert(
      patientId,
      `⚠️ EMERGENCY ALERT from ${senderName || "User"}`,
      `Emergency Mode has been activated in the chat.\n\nMessage: "${message}"\n\nPlease log in immediately to assist.`,
      "danger"
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
