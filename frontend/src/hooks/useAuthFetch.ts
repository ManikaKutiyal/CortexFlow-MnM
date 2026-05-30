"use client";
import { useCallback, useRef } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

export function useAuthFetch() {
  const { idToken, isReady } = useFirebaseAuth();
  const tokenRef = useRef<string | null>(idToken);
  
  // Update ref during render to ensure it's always up to date 
  // before any child components' useEffects run.
  tokenRef.current = idToken;

  const authFetch = useCallback(
    (url: string, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers as HeadersInit | undefined);
      if (tokenRef.current) {
        headers.set("Authorization", `Bearer ${tokenRef.current}`);
      }
      return fetch(url, { ...init, headers });
    },
    []
  );
  
  return { authFetch, idToken, isReady };
}
