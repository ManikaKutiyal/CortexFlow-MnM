import logging
import os
import re
import json
from pythonjsonlogger import jsonlogger
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentation

# Medical PHI / PII Redaction Patterns
PHI_PATTERNS = [
    (r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]"),  # SSN
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", "[REDACTED_EMAIL]"), # Emails
    (r"\b(?:\+?1[-.●]?)?\(?([0-9]{3})\)?[-.●]?([0-9]{3})[-.●]?([0-9]{4})\b", "[REDACTED_PHONE]"), # Phone
    (r"(?i)(patient_id|patient|name|dob|diagnosis)['\":\s]+([a-zA-Z0-9_\-\s]+)", r"\1: [REDACTED_PHI]") # Keys
]

def redact_phi(text: str) -> str:
    if not isinstance(text, str):
        return text
    for pattern, replacement in PHI_PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text

def sentry_before_send(event, hint):
    """Sentry hook to scrub PHI before it leaves the server."""
    # Scrub exception values
    if "exception" in event and "values" in event["exception"]:
        for exc in event["exception"]["values"]:
            if "value" in exc:
                exc["value"] = redact_phi(str(exc["value"]))
    
    # Scrub breadcrumbs
    if "breadcrumbs" in event and "values" in event["breadcrumbs"]:
        for crumb in event["breadcrumbs"]["values"]:
            if "message" in crumb:
                crumb["message"] = redact_phi(str(crumb["message"]))
            if "data" in crumb:
                for k, v in crumb["data"].items():
                    crumb["data"][k] = redact_phi(str(v))
    
    # Scrub request body
    if "request" in event and "data" in event["request"]:
        req_data = event["request"]["data"]
        if isinstance(req_data, str):
            event["request"]["data"] = redact_phi(req_data)
        elif isinstance(req_data, dict):
            event["request"]["data"] = {k: redact_phi(str(v)) for k, v in req_data.items()}

    return event

class PHILogFilter(logging.Filter):
    def filter(self, record):
        record.msg = redact_phi(str(record.msg))
        if hasattr(record, "args") and record.args:
            record.args = tuple(redact_phi(str(arg)) for arg in record.args)
        return True

def setup_observability(app: FastAPI):
    """Initialize OTEL, Sentry, and Structured Logging."""
    
    # 1. Structured JSON Logging with PHI Filter
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    logHandler = logging.StreamHandler()
    # Add our PHI filter to scrub logs before they hit JSON
    logHandler.addFilter(PHILogFilter())
    
    formatter = jsonlogger.JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s')
    logHandler.setFormatter(formatter)
    logger.addHandler(logHandler)

    # 2. Sentry (RUM & Crash Reporting)
    SENTRY_DSN = os.getenv("SENTRY_DSN", "")
    if SENTRY_DSN:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
            integrations=[
                StarletteIntegration(),
                FastApiIntegration(),
            ],
            before_send=sentry_before_send,
            environment=os.getenv("ENV", "production")
        )
        logger.info("Sentry initialized with PHI redaction.")

    # 3. OpenTelemetry (OTEL)
    provider = TracerProvider()
    processor = BatchSpanProcessor(ConsoleSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    FastAPIInstrumentation.instrument_app(app)
    logger.info("OpenTelemetry instrumented.")
