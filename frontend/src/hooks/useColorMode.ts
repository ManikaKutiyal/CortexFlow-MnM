"use client";
import { useState, useEffect } from "react";

export function useColorMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("nt-theme");
    if (stored === "dark" || (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
    }
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("nt-theme", isDark ? "dark" : "light");
  }, [isDark]);
  const toggle = () => {
    setIsDark((prev) => !prev);
  };
  return { isDark, toggle };
}
