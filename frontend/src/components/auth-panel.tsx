"use client";

import { useState } from "react";
import type { AuthActionResult, SocialProvider } from "@/hooks/useFirebaseAuth";

type AuthPanelProps = {
  backendAwake: boolean;
  isBusy: boolean;
  onSocialSignIn: (provider: SocialProvider) => Promise<AuthActionResult>;
  onEmailSignIn: (email: string, password: string) => Promise<AuthActionResult>;
  onEmailSignUp: (name: string, email: string, password: string) => Promise<AuthActionResult>;
  onCheckMethods: (email: string) => Promise<string[]>;
};

export function AuthPanel({
  backendAwake,
  isBusy,
  onSocialSignIn,
}: AuthPanelProps) {
  const [message, setMessage] = useState<string | null>(null);

  const runGoogleSignIn = async () => {
    setMessage(null);
    const result = await onSocialSignIn("google");
    if (!result.ok && result.error) {
      setMessage(result.error);
    }
  };

  return (
    <div className="w-full max-w-[980px] px-4 sm:px-6">
      <div
        className="flex flex-col items-center text-center gap-8 rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto"
        style={{
          background: "var(--nt-glass-hi)",
          border: "1px solid var(--nt-glass-border)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 32px 80px rgba(5, 15, 26, 0.24)",
        }}
      >
        <div className="space-y-4">
          <span
            className="text-[10px] uppercase tracking-[0.24em]"
            style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}
          >
            account access
          </span>
          <h2
            className="text-2xl sm:text-3xl leading-tight"
            style={{ color: "var(--nt-text-hi)", fontFamily: "var(--font-syne)", fontWeight: 700 }}
          >
            Sign in to your Cognitive Workspace
          </h2>
          <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: "var(--nt-text-lo)" }}>
            Your reports stick to your account like glitter, so every insight is waiting for you when you come back, no memory gymnastics needed.
          </p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-4">
          <button
            type="button"
            onClick={() => void runGoogleSignIn()}
            disabled={!backendAwake || isBusy}
            className="rounded-xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-45 w-full shadow-sm"
            style={{
              background: "var(--nt-btn-bg)",
              color: "var(--nt-btn-fg)",
            }}
          >
            Continue with Google
          </button>
          
          {message && (
            <p className="text-[11px] leading-relaxed" style={{ color: "#D85A30" }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
