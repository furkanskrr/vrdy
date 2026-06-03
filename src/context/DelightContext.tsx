import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppearanceId } from "../constants/appearances";
import {
  defaultDelightPersisted,
  DELIGHT_STORAGE_KEY,
  type DelightPersisted,
} from "../lib/delight/types";

type DelightContextValue = {
  ready: boolean;
  appearanceId: AppearanceId;
  setAppearanceId: (id: AppearanceId) => void;
  customAccentHex: string | null;
  setCustomAccentHex: (hex: string | null) => void;
  uiHapticsEnabled: boolean;
  uiSoundsEnabled: boolean;
  setUiHapticsEnabled: (v: boolean) => void;
  setUiSoundsEnabled: (v: boolean) => void;
};

const DelightContext = createContext<DelightContextValue | null>(null);

function normalizeLoaded(raw: string | null): DelightPersisted {
  if (!raw) return defaultDelightPersisted();
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    const base = defaultDelightPersisted();
    const aid = p.appearanceId;
    return {
      appearanceId:
        aid === "classic" || aid === "noir" || aid === "aurora" || aid === "dawn" || aid === "studio"
          ? aid
          : base.appearanceId,
      uiHapticsEnabled: p.uiHapticsEnabled !== false,
      uiSoundsEnabled: p.uiSoundsEnabled !== false,
      customAccentHex: typeof p.customAccentHex === "string" ? p.customAccentHex : null,
    };
  } catch {
    return defaultDelightPersisted();
  }
}

export function DelightProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<DelightPersisted>(() => defaultDelightPersisted());

  const persist = useCallback(async (next: DelightPersisted) => {
    try {
      await AsyncStorage.setItem(DELIGHT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const raw = await AsyncStorage.getItem(DELIGHT_STORAGE_KEY);
      if (!alive) return;
      setState(normalizeLoaded(raw));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setAppearanceId = useCallback(
    (id: AppearanceId) => {
      setState((prev) => {
        const next = { ...prev, appearanceId: id };
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const setCustomAccentHex = useCallback(
    (hex: string | null) => {
      setState((prev) => {
        const next = { ...prev, customAccentHex: hex };
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const setUiHapticsEnabled = useCallback(
    (v: boolean) => {
      setState((prev) => {
        const next = { ...prev, uiHapticsEnabled: v };
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const setUiSoundsEnabled = useCallback(
    (v: boolean) => {
      setState((prev) => {
        const next = { ...prev, uiSoundsEnabled: v };
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const value = useMemo<DelightContextValue>(
    () => ({
      ready,
      appearanceId: state.appearanceId,
      setAppearanceId,
      customAccentHex: state.customAccentHex,
      setCustomAccentHex,
      uiHapticsEnabled: state.uiHapticsEnabled,
      uiSoundsEnabled: state.uiSoundsEnabled,
      setUiHapticsEnabled,
      setUiSoundsEnabled,
    }),
    [
      ready,
      state.appearanceId,
      state.customAccentHex,
      state.uiHapticsEnabled,
      state.uiSoundsEnabled,
      setAppearanceId,
      setCustomAccentHex,
      setUiHapticsEnabled,
      setUiSoundsEnabled,
    ]
  );

  return <DelightContext.Provider value={value}>{children}</DelightContext.Provider>;
}

export function useDelight(): DelightContextValue {
  const ctx = useContext(DelightContext);
  if (!ctx) throw new Error("useDelight yalnızca DelightProvider içinde kullanılmalıdır");
  return ctx;
}
