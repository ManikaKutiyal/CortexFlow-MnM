import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "cortexflow-frontend",
    // This connects traces automatically to the OTEL collector
  });
}
