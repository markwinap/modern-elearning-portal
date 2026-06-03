"use client";

import { useEffect, useState } from "react";
import { App, ConfigProvider, theme } from "antd";

import { ThemeContext, type ThemePreference } from "./theme-context";

interface ThemeProviderProps {
  children: React.ReactNode;
  fontFamily?: string;
}

export function ThemeProvider({ children, fontFamily }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme-preference") as ThemePreference | null;
    if (saved && (["system", "light", "dark"] as ThemePreference[]).includes(saved)) {
      setPreferenceState(saved);
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    setMounted(true);

    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDark = preference === "dark" || (preference === "system" && systemDark);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark, mounted]);

  function setPreference(pref: ThemePreference) {
    setPreferenceState(pref);
    localStorage.setItem("theme-preference", pref);
  }

  return (
    <ThemeContext.Provider value={{ preference, setPreference, isDark }}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#4F46E5",
            colorLink: "#4F46E5",
            borderRadius: 8,
            fontFamily,
          },
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
