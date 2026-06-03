import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppearanceId } from "../constants/appearances";
import { resolveAppearanceColors } from "../constants/appearances";
import { THEME_STORAGE_KEY, type ThemeColors } from "../constants/theme";
import { applyCustomAccent } from "../lib/themeAccent";
import { useDelight } from "./DelightContext";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
  appearanceId: AppearanceId;
  setAppearance: (id: AppearanceId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const delight = useDelight();
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!alive) return;
        if (raw === "light" || raw === "dark") setModeState(raw);
      } catch {
        /* */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === "dark";
    const base = resolveAppearanceColors(delight.appearanceId, isDark);
    const colors =
      delight.customAccentHex && delight.customAccentHex.length > 0
        ? applyCustomAccent(base, delight.customAccentHex)
        : base;
    return {
      mode,
      isDark,
      colors,
      setMode,
      toggleMode,
      appearanceId: delight.appearanceId,
      setAppearance: delight.setAppearanceId,
    };
  }, [mode, delight.appearanceId, delight.customAccentHex, delight.setAppearanceId, setMode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme ThemeProvider içinde olmalı");
  return ctx;
}
