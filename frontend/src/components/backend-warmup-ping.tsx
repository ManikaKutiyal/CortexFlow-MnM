"use client";

import { useEffect, useRef } from "react";

const WARMUP_ENABLED = process.env.NEXT_PUBLIC_BACKEND_WAKE_ENABLED !== "false";

export function BackendWarmupPing() {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!WARMUP_ENABLED || sentRef.current) {
      return;
    }

    const triggerWarmup = () => {
      if (sentRef.current) {
        return;
      }

      sentRef.current = true;

      void fetch("/api/wake-backend", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      }).catch(() => {
        // Silent failure is intentional for background wakeup.
      });
    };

    const scheduleAfterLoad = () => {
      const maybeWindow = window as Window & {
        requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

      if (typeof maybeWindow.requestIdleCallback === "function") {
        const idleId = maybeWindow.requestIdleCallback(triggerWarmup, { timeout: 2500 });
        return () => {
          if (typeof maybeWindow.cancelIdleCallback === "function") {
            maybeWindow.cancelIdleCallback(idleId);
          }
        };
      }

      const timeoutId = window.setTimeout(triggerWarmup, 1200);
      return () => window.clearTimeout(timeoutId);
    };

    if (document.readyState === "complete") {
      return scheduleAfterLoad();
    }

    const onLoad = () => {
      window.removeEventListener("load", onLoad);
      scheduleAfterLoad();
    };

    window.addEventListener("load", onLoad, { once: true });

    return () => {
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
