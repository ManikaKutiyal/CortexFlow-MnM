"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getSupabaseBrowserClient } from "@/libs/supabase-browser";

type GlobalRefreshContextType = {
  lastRefresh: number;
};

const GlobalRefreshContext = createContext<GlobalRefreshContextType>({ lastRefresh: Date.now() });

export function GlobalRefreshProvider({ children }: { children: React.ReactNode }) {
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    
    // Subscribe to all changes in the public schema
    const channel = supabase
      .channel("global_refresh_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          // Debounce the refresh to avoid spamming multiple updates at exactly the same millisecond
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          timerRef.current = setTimeout(() => {
            setLastRefresh(Date.now());
          }, 500);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <GlobalRefreshContext.Provider value={{ lastRefresh }}>
      {children}
    </GlobalRefreshContext.Provider>
  );
}

/**
 * Hook to automatically trigger a callback when any relevant database change occurs.
 * @param callback The function to run (e.g. your loadData function)
 */
export function useGlobalRefresh(callback: () => void) {
  const { lastRefresh } = useContext(GlobalRefreshContext);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // We do not want to trigger it immediately on mount if it already ran in the component's own useEffect,
    // but the component itself manages its initial load. This just re-triggers on subsequent lastRefresh changes.
    callbackRef.current();
  }, [lastRefresh]);
}
