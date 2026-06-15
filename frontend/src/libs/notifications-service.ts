import { getSupabaseServerClient } from "@/libs/supabase-server";
import { sendNotificationEmail, EmailSeverity } from "./mailer";

export interface CreateNotificationParams {
  recipientId: string;
  senderId?: string;
  patientId?: string;
  type: string;
  title: string;
  body: string;
  severity?: EmailSeverity;
  actionUrl?: string;
  actionText?: string;
}

export const createAndSendNotification = async (params: CreateNotificationParams) => {
  const supabase = getSupabaseServerClient();

  // 1. Insert into Supabase
  const payload = {
    recipient_id: params.recipientId,
    sender_id: params.senderId ?? null,
    patient_id: params.patientId ?? null,
    type: params.type,
    title: params.title,
    body: params.body,
  };

  const { data: notification, error: insertError } = await supabase
    .from("notifications")
    .insert(payload)
    .select("id, title, body, patient_id, created_at, read_at")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert notification: ${insertError.message}`);
  }

  // 2. Fetch Recipient Email
  const { data: recipient, error: userError } = await supabase
    .from("users")
    .select("email, display_name")
    .eq("id", params.recipientId)
    .maybeSingle();

  if (userError || !recipient?.email) {
    console.warn("Recipient email not found, skipping email notification.", userError);
    return notification;
  }

  // 3. Send Email
  const subjectPrefix = params.severity === "danger" ? "[URGENT] CortexFlow Alert" : "[CortexFlow] Notification";
  const subject = `${subjectPrefix}: ${params.title}`;

  // Fire and forget (don't await so we don't block the API response entirely if SMTP is slow)
  sendNotificationEmail({
    to: recipient.email,
    subject,
    title: params.title,
    body: params.body,
    severity: params.severity ?? "info",
    actionUrl: params.actionUrl,
    actionText: params.actionText,
  }).catch((err) => {
    console.error("Async email dispatch failed:", err);
  });

  return notification;
};

export const broadcastPatientAlert = async (
  patientId: string,
  title: string,
  body: string,
  severity: EmailSeverity = "danger",
  excludeId?: string
) => {
  const supabase = getSupabaseServerClient();
  const recipients: string[] = [];

  // Find linked caregivers
  const { data: caregivers } = await supabase
    .from("caregiver_patient_links")
    .select("caregiver_id")
    .eq("patient_id", patientId)
    .in("status", ["active", "approved"]);

  if (caregivers) {
    recipients.push(...caregivers.map((c) => c.caregiver_id));
  }

  // Find linked providers
  const { data: providers } = await supabase
    .from("provider_patient_links")
    .select("provider_id")
    .eq("patient_id", patientId)
    .eq("status", "active");

  if (providers) {
    recipients.push(...providers.map((p) => p.provider_id));
  }

  recipients.push(patientId);

  const uniqueRecipients = Array.from(new Set(recipients)).filter(id => id !== excludeId);

  const promises = uniqueRecipients.map((recipientId) => 
    createAndSendNotification({
      recipientId,
      patientId,
      type: "system_alert",
      title,
      body,
      severity,
    }).catch(err => {
      console.error(`Failed to broadcast to recipient ${recipientId}`, err);
    })
  );

  await Promise.all(promises);
};
