import { createContext, useContext } from "react";

export type ThemePreference = "system" | "light" | "dark";

export interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  setPreference: () => undefined,
  isDark: false,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
