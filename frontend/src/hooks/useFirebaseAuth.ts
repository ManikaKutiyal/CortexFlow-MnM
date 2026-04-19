"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  ensureFirebaseLocalPersistence,
  getFirebaseAuthInstance,
  isFirebaseClientConfigured,
} from "@/libs/firebase-client";

type SocialProvider = "google";

type AuthProfile = {
  uid: string;
  email: string;
  name: string;
  photoUrl: string;
  providerId: string | null;
};

type AuthActionResult = {
  ok: boolean;
  error?: string;
};

function normalizeAuthError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: string }).code)
      : "";

  const rawMessage =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: string }).message)
      : "Authentication failed";

  const email =
    typeof error === "object" && error !== null && "customData" in error
      ? String(((error as { customData?: { email?: string } }).customData?.email ?? ""))
      : "";

  return { code, rawMessage, email };
}

function profileFromFirebaseUser(user: User): AuthProfile {
  return {
    uid: user.uid,
    email: user.email ?? "",
    name: user.displayName ?? user.email?.split("@")[0] ?? "Researcher",
    photoUrl: user.photoURL ?? "",
    providerId: user.providerData[0]?.providerId ?? null,
  };
}

async function readBackendError(res: Response) {
  const data = await res.json().catch(() => ({} as { error?: string }));
  return data.error || "Authentication failed";
}

export function useFirebaseAuth() {
  const [firebaseChecked, setFirebaseChecked] = useState(() => !isFirebaseClientConfigured());
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [sessionProfile, setSessionProfile] = useState<AuthProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  const missingConfigMessage = "Firebase client env vars are missing. Configure NEXT_PUBLIC_FIREBASE_* in Vercel.";

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        setSessionProfile(null);
        return;
      }

      const data = await res.json() as { user?: AuthProfile | null };
      setSessionProfile(data.user ?? null);
    } catch {
      setSessionProfile(null);
    } finally {
      setSessionChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseClientConfigured()) {
      return;
    }

    const firebaseAuth = getFirebaseAuthInstance();
    if (!firebaseAuth) {
      setFirebaseChecked(true);
      return;
    }

    let unsubscribe = () => {};

    void ensureFirebaseLocalPersistence().finally(() => {
      unsubscribe = onIdTokenChanged(firebaseAuth, async (nextUser) => {
        setFirebaseUser(nextUser);
        if (nextUser) {
          setIdToken(await nextUser.getIdToken());
        } else {
          setIdToken(null);
        }
        setFirebaseChecked(true);
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const checkSignInMethods = useCallback(async (email: string): Promise<string[]> => {
    const trimmed = email.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const res = await fetch(`/api/auth/methods?email=${encodeURIComponent(trimmed)}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json() as { methods?: string[] };
      return data.methods ?? [];
    } catch {
      return [];
    }
  }, []);

  const signInWithSocial = useCallback(async (providerNameValue: SocialProvider): Promise<AuthActionResult> => {
    if (providerNameValue !== "google") {
      return { ok: false, error: "Only Google sign-in is currently enabled." };
    }

    const firebaseAuth = getFirebaseAuthInstance();
    if (!firebaseAuth) {
      return { ok: false, error: missingConfigMessage };
    }

    setIsBusy(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(firebaseAuth, provider);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: normalizeAuthError(error).rawMessage };
    } finally {
      setIsBusy(false);
    }
  }, [missingConfigMessage]);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string): Promise<AuthActionResult> => {
    setIsBusy(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        return { ok: false, error: await readBackendError(res) };
      }

      await loadSession();

      return { ok: true };
    } catch {
      return { ok: false, error: "Signup failed" };
    } finally {
      setIsBusy(false);
    }
  }, [loadSession]);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    setIsBusy(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        return { ok: false, error: await readBackendError(res) };
      }

      await loadSession();

      return { ok: true };
    } catch {
      return { ok: false, error: "Sign in failed" };
    } finally {
      setIsBusy(false);
    }
  }, [loadSession]);

  const logOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => {
      // Ignore transient signout API errors.
    });

    setSessionProfile(null);

    const firebaseAuth = getFirebaseAuthInstance();
    if (firebaseAuth?.currentUser) {
      await signOut(firebaseAuth);
    }
  }, []);

  const profile = useMemo(() => {
    if (firebaseUser) {
      return profileFromFirebaseUser(firebaseUser);
    }

    return sessionProfile;
  }, [firebaseUser, sessionProfile]);

  const isReady = firebaseChecked && sessionChecked;

  return {
    isReady,
    isBusy,
    user: firebaseUser,
    profile,
    idToken,
    checkSignInMethods,
    signInWithSocial,
    signUpWithEmail,
    signInWithEmail,
    logOut,
  };
}

export type { SocialProvider, AuthActionResult };
