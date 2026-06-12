import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

def send_developer_alert(subject: str, html_body: str):
    """
    Sends a critical alert email to the developer team directly from the AWS backend.
    """
    sender_email = os.getenv("SOS_SENDER_EMAIL")
    sender_password = os.getenv("SOS_SENDER_PASSWORD")
    dev_emails_raw = os.getenv("DEVELOPER_ALERT_EMAILS", "")
    
    if not sender_email or not sender_password or not dev_emails_raw:
        logger.warning("SMTP credentials or developer emails not configured. Skipping alert.")
        return False
        
    recipient_list = [email.strip() for email in dev_emails_raw.split(",") if email.strip()]
    if not recipient_list:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[CortexFlow ALERT] {subject}"
    msg["From"] = f"CortexFlow Backend <{sender_email}>"
    msg["To"] = ", ".join(recipient_list)

    # Attach the HTML body
    part = MIMEText(html_body, "html")
    msg.attach(part)

    try:
        # Use Gmail SMTP
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.send_message(msg)
        logger.info(f"Developer alert email sent successfully to {recipient_list}")
        return True
    except Exception as e:
        logger.error(f"Failed to send developer alert email: {e}")
        return False

def format_incident_email(incident_type: str, severity: str, details: str, stack_trace: str = "") -> str:
    """Formats a beautiful HTML email for incidents."""
    
    color = "#dc2626" if severity.upper() == "CRITICAL" else "#f59e0b"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f7fa; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: {color}; padding: 15px; color: white;">
                <h2 style="margin: 0; font-size: 20px;">🚨 CortexFlow System Incident</h2>
            </div>
            <div style="padding: 20px;">
                <p><strong>Incident Type:</strong> {incident_type}</p>
                <p><strong>Severity:</strong> <span style="color: {color}; font-weight: bold;">{severity.upper()}</span></p>
                <p><strong>Environment:</strong> Backend (AWS)</p>
                <hr style="border: 1px solid #eee; my: 15px;">
                <h3>Details</h3>
                <p style="white-space: pre-wrap;">{details}</p>
                """
    if stack_trace:
        html += f"""
                <h3>Stack Trace</h3>
                <pre style="background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">{stack_trace}</pre>
        """
        
    html += """
            </div>
            <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                Automated message from CortexFlow Backend Monitoring (AWS)
            </div>
        </div>
    </body>
    </html>
    """
    return html
