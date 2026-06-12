import * as Sentry from "@sentry/nextjs";

const PHI_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[REDACTED_SSN]" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, replacement: "[REDACTED_EMAIL]" },
  { pattern: /\b(?:\+?1[-.●]?)?\(?([0-9]{3})\)?[-.●]?([0-9]{3})[-.●]?([0-9]{4})\b/g, replacement: "[REDACTED_PHONE]" },
  { pattern: /(patient_id|patient|name|dob|diagnosis)['":\s]+([a-zA-Z0-9_\-\s]+)/gi, replacement: "$1: [REDACTED_PHI]" }
];

function redactPHI(text: string): string {
  if (typeof text !== "string") return text;
  let redacted = text;
  for (const { pattern, replacement } of PHI_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  beforeSend(event) {
    // Redact exceptions
    if (event.exception?.values) {
      event.exception.values.forEach((ex) => {
        if (ex.value) ex.value = redactPHI(ex.value);
      });
    }

    // Redact breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs.forEach((crumb) => {
        if (crumb.message) crumb.message = redactPHI(crumb.message);
        if (crumb.data) {
          for (const key in crumb.data) {
            if (typeof crumb.data[key] === "string") {
              crumb.data[key] = redactPHI(crumb.data[key] as string);
            }
          }
        }
      });
    }

    return event;
  },
});
