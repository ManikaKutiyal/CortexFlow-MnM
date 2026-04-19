"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthActionResult, SocialProvider } from "@/hooks/useFirebaseAuth";

type AuthPanelProps = {
  backendAwake: boolean;
  isBusy: boolean;
  onSocialSignIn: (provider: SocialProvider) => Promise<AuthActionResult>;
  onEmailSignIn: (email: string, password: string) => Promise<AuthActionResult>;
  onEmailSignUp: (name: string, email: string, password: string) => Promise<AuthActionResult>;
  onCheckMethods: (email: string) => Promise<string[]>;
};

type AuthMode = "signin" | "signup";

function providerLabel(providerId: string) {
  switch (providerId) {
    case "google.com":
      return "Google";
    case "github.com":
      return "GitHub";
    case "facebook.com":
      return "Facebook";
    case "twitter.com":
      return "Twitter/X";
    case "microsoft.com":
      return "Microsoft";
    case "apple.com":
      return "Apple";
    default:
      return providerId;
  }
}

export function AuthPanel({
  backendAwake,
  isBusy,
  onSocialSignIn,
  onEmailSignIn,
  onEmailSignUp,
  onCheckMethods,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [methods, setMethods] = useState<string[]>([]);
  const [isCheckingMethods, setIsCheckingMethods] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = email.trim();

    if (!trimmed) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsCheckingMethods(true);
      const nextMethods = await onCheckMethods(trimmed);
      if (!cancelled) {
        setMethods(nextMethods);
        setIsCheckingMethods(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [email, onCheckMethods]);

  const socialOnlyProvider = useMemo(() => {
    if (!methods.length || methods.includes("password")) {
      return null;
    }

    return methods[0] ?? null;
  }, [methods]);

  const providerBlockedHint = useMemo(() => {
    if (!socialOnlyProvider || !email.trim()) {
      return null;
    }

    const provider = providerLabel(socialOnlyProvider);
    return `This email is linked to ${provider}. Please continue with ${provider} sign-in instead of the form.`;
  }, [socialOnlyProvider, email]);

  const canSubmitForm = backendAwake && !isBusy && !socialOnlyProvider;

  const runGoogleSignIn = async () => {
    setMessage(null);
    const result = await onSocialSignIn("google");
    if (!result.ok && result.error) {
      setMessage(result.error);
    }
  };

  const runEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter both email and password.");
      return;
    }

    if (mode === "signup" && password.trim().length < 6) {
      setMessage("Use at least 6 characters for your password.");
      return;
    }

    if (providerBlockedHint) {
      setMessage(providerBlockedHint);
      return;
    }

    const result =
      mode === "signup"
        ? await onEmailSignUp(name, email, password)
        : await onEmailSignIn(email, password);

    if (!result.ok && result.error) {
      setMessage(result.error);
    }
  };

  return (
    <div className="w-full max-w-[980px] px-4 sm:px-6">
      <div
        className="grid gap-4 sm:gap-5 rounded-3xl p-4 sm:p-6 md:grid-cols-[1.15fr_1fr]"
        style={{
          background: "var(--nt-glass-hi)",
          border: "1px solid var(--nt-glass-border)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 32px 80px rgba(5, 15, 26, 0.24)",
        }}
      >
        <div className="flex flex-col justify-between gap-6">
          <div className="space-y-3">
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
            <p className="text-sm leading-relaxed" style={{ color: "var(--nt-text-lo)" }}>
              Your reports stick to your account like glitter, so every insight is waiting for you when you come back, no memory gymnastics needed.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => void runGoogleSignIn()}
              disabled={!backendAwake || isBusy}
              className="rounded-xl px-3 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-45"
              style={{
                border: "1px solid var(--nt-divider)",
                color: "var(--nt-text-md)",
                background: "var(--nt-hover)",
              }}
            >
              Continue with Google
            </button>
          </div>
        </div>

        <div
          className="rounded-2xl p-3 sm:p-4"
          style={{
            border: "1px solid var(--nt-divider)",
            background: "var(--nt-glass)",
          }}
        >
          <div className="mb-3 flex rounded-lg p-1" style={{ background: "var(--nt-hover)" }}>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="flex-1 rounded-md py-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{
                background: mode === "signin" ? "var(--nt-btn-bg)" : "transparent",
                color: mode === "signin" ? "var(--nt-btn-fg)" : "var(--nt-text-ghost)",
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="flex-1 rounded-md py-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{
                background: mode === "signup" ? "var(--nt-btn-bg)" : "transparent",
                color: mode === "signup" ? "var(--nt-btn-fg)" : "var(--nt-text-ghost)",
              }}
            >
              Sign up
            </button>
          </div>

          <form className="space-y-3" onSubmit={runEmailSubmit}>
            {mode === "signup" && (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--nt-hdr)",
                  color: "var(--nt-text-hi)",
                  border: "1px solid var(--nt-divider)",
                }}
              />
            )}

            <input
              value={email}
              onChange={(event) => {
                const nextEmail = event.target.value;
                setEmail(nextEmail);

                if (!nextEmail.trim()) {
                  setMethods([]);
                  setIsCheckingMethods(false);
                }
              }}
              placeholder="Email address"
              type="email"
              autoComplete="email"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--nt-hdr)",
                color: "var(--nt-text-hi)",
                border: "1px solid var(--nt-divider)",
              }}
            />

            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--nt-hdr)",
                color: "var(--nt-text-hi)",
                border: "1px solid var(--nt-divider)",
              }}
            />

            {isCheckingMethods && (
              <p className="text-[11px]" style={{ color: "var(--nt-text-ghost)" }}>
                Checking sign-in methods...
              </p>
            )}

            {providerBlockedHint && (
              <p className="text-[11px] leading-relaxed" style={{ color: "#D85A30" }}>
                {providerBlockedHint}
              </p>
            )}

            {message && (
              <p className="text-[11px] leading-relaxed" style={{ color: "#D85A30" }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmitForm}
              className="h-10 w-full rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-45"
              style={{
                background: "var(--nt-btn-bg)",
                color: "var(--nt-btn-fg)",
              }}
            >
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
