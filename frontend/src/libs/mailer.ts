import nodemailer from "nodemailer";
type SosEmailOptions = {
  patientName: string;
  patientId: string;
  urgency: string;
  location: string | null;
  detail: string | null;
  photoBase64: string | null;
  recipientEmail: string;
};
const URGENCY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "#dcfce7", text: "#166534", label: "LOW" },
  medium: { bg: "#fef3c7", text: "#92400e", label: "MEDIUM" },
  high: { bg: "#fed7aa", text: "#9a3412", label: "HIGH" },
  critical: { bg: "#fecaca", text: "#991b1b", label: "CRITICAL" },
  info: { bg: "#dbeafe", text: "#1e40af", label: "INFO" },
};
export async function sendSosEmail(opts: SosEmailOptions): Promise<void> {
  const senderEmail = process.env.SOS_SENDER_EMAIL;
  const senderPassword = process.env.SOS_SENDER_PASSWORD;
  if (!senderEmail || !senderPassword) {
    return;
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: senderEmail, pass: senderPassword },
  });
  const uc = URGENCY_COLORS[opts.urgency] ?? URGENCY_COLORS.high;
  const timestamp = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="height:4px;background:linear-gradient(90deg,${uc.bg === "#fecaca" ? "#ef4444" : "#D85A30"},${uc.bg === "#fecaca" ? "#dc2626" : "#f97316"})"></td></tr>
  <tr><td style="padding:32px 32px 24px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle">
          <div style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.02em">CortexFlow</div>
          <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;margin-top:2px">Safety Alert System</div>
        </td>
        <td align="right" style="vertical-align:middle">
          <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:${uc.bg};color:${uc.text};font-size:11px;font-weight:700;letter-spacing:0.08em">
            ${uc.label}
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px"><div style="height:1px;background:#e2e8f0"></div></td></tr>
  <tr><td style="padding:24px 32px">
    <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1.3">
      ${opts.urgency === "info" ? "Access Request" : "⚠️ Emergency SOS Alert"}
    </div>
    <div style="font-size:13px;color:#64748b;margin-top:8px">${timestamp}</div>
  </td></tr>
  <tr><td style="padding:0 32px 24px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Patient</div>
        <div style="font-size:15px;font-weight:600;color:#0f172a">${opts.patientName}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">ID: ${opts.patientId}</div>
      </td></tr>
      ${opts.location ? `<tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Location</div>
        <div style="font-size:14px;color:#0f172a">${opts.location}</div>
      </td></tr>` : ""}
      ${opts.detail ? `<tr><td style="padding:16px 20px">
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">Details</div>
        <div style="font-size:14px;color:#334155;line-height:1.6">${opts.detail}</div>
      </td></tr>` : ""}
    </table>
  </td></tr>
  ${opts.photoBase64 ? `<tr><td style="padding:0 32px 24px">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px">Attached Photo</div>
    <img src="cid:sosphoto" alt="SOS Photo" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0" />
  </td></tr>` : ""}
  <tr><td style="padding:0 32px 32px">
    <div style="padding:16px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
      <div style="font-size:12px;color:#166534;line-height:1.6">
        <strong>Action Required:</strong> Please check on ${opts.patientName} immediately or contact emergency services if needed. Log into CortexFlow for full patient details.
      </div>
    </div>
  </td></tr>
  <tr><td style="padding:0 32px"><div style="height:1px;background:#e2e8f0"></div></td></tr>
  <tr><td style="padding:20px 32px">
    <div style="font-size:11px;color:#94a3b8;line-height:1.6">
      This is an automated alert from CortexFlow Safety Center. Do not reply to this email.
      <br>© ${new Date().getFullYear()} CortexFlow — Cognitive Health Platform
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  const attachments: nodemailer.SendMailOptions["attachments"] = [];
  if (opts.photoBase64) {
    const base64Data = opts.photoBase64.replace(/^data:image\/\w+;base64,/, "");
    attachments.push({
      filename: "sos-photo.jpg",
      content: Buffer.from(base64Data, "base64"),
      cid: "sosphoto",
    });
  }
  await transporter.sendMail({
    from: `"CortexFlow Safety" <${senderEmail}>`,
    to: opts.recipientEmail,
    subject: opts.urgency === "info"
      ? `CortexFlow — Access request for ${opts.patientName}`
      : `⚠️ SOS Alert — ${opts.patientName} [${uc.label}]`,
    html,
    attachments,
  });
}

export type EmailSeverity = "info" | "warning" | "danger" | "success";

export interface SendEmailParams {
  to: string;
  subject: string;
  title: string;
  body: string;
  severity?: EmailSeverity;
  actionUrl?: string;
  actionText?: string;
}

export async function sendNotificationEmail(params: SendEmailParams): Promise<boolean> {
  const senderEmail = process.env.SOS_SENDER_EMAIL;
  const senderPassword = process.env.SOS_SENDER_PASSWORD;

  if (!senderEmail || !senderPassword) {
    console.warn("SMTP credentials not configured. Skipping email send.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: senderEmail, pass: senderPassword },
  });

  const getSeverityColor = (severity: EmailSeverity) => {
    switch (severity) {
      case "danger": return { bg: "#fecaca", text: "#991b1b", border: "#dc2626", label: "URGENT" };
      case "warning": return { bg: "#fef3c7", text: "#92400e", border: "#f59e0b", label: "ALERT" };
      case "success": return { bg: "#dcfce7", text: "#166534", border: "#16a34a", label: "SUCCESS" };
      case "info":
      default: return { bg: "#dbeafe", text: "#1e40af", border: "#2563eb", label: "INFO" };
    }
  };

  const colors = getSeverityColor(params.severity ?? "info");
  const timestamp = new Date().toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa;padding:32px 16px">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <tr><td style="height:4px;background:${colors.border}"></td></tr>
    <tr><td style="padding:32px 32px 24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle">
            <div style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.02em">CortexFlow</div>
            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;margin-top:2px">Notification Center</div>
          </td>
          <td align="right" style="vertical-align:middle">
            <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:${colors.bg};color:${colors.text};font-size:11px;font-weight:700;letter-spacing:0.08em">
              ${colors.label}
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 32px"><div style="height:1px;background:#e2e8f0"></div></td></tr>
    <tr><td style="padding:24px 32px">
      <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1.3">
        ${params.title}
      </div>
      <div style="font-size:13px;color:#64748b;margin-top:8px">${timestamp}</div>
    </td></tr>
    <tr><td style="padding:0 32px 24px">
      <div style="font-size:15px;color:#334155;line-height:1.6">
        ${params.body.replace(/\n/g, "<br>")}
      </div>
    </td></tr>
    ${params.actionUrl && params.actionText ? `<tr><td style="padding:0 32px 32px">
      <a href="${params.actionUrl}" style="display:inline-block;padding:12px 24px;background:${colors.border};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${params.actionText}</a>
    </td></tr>` : ""}
    <tr><td style="padding:0 32px"><div style="height:1px;background:#e2e8f0"></div></td></tr>
    <tr><td style="padding:20px 32px">
      <div style="font-size:11px;color:#94a3b8;line-height:1.6">
        This is an automated notification from CortexFlow. Do not reply to this email.
        <br>© ${new Date().getFullYear()} CortexFlow — Cognitive Health Platform
      </div>
    </td></tr>
  </table>
  </td></tr>
  </table>
  </body>
  </html>`;

  try {
    await transporter.sendMail({
      from: `"CortexFlow Notifications" <${senderEmail}>`,
      to: params.to,
      subject: params.subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}
