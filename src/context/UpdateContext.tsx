import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import {
  androidApkAc,
  androidApkIndirUrl,
  guncellemeKontrolEt,
  type GuncellemeDurumu,
  webSayfasiniYenile,
} from "../lib/appUpdate";
import { UpdateScreen } from "../components/UpdateScreen";

type UpdateContextValue = {
  durum: GuncellemeDurumu;
  kontrolEdiliyor: boolean;
  otaUygulaniyor: boolean;
  yenidenKontrol: () => Promise<GuncellemeDurumu>;
  guncellemeyiUygula: () => Promise<void>;
};

const UpdateContext = createContext<UpdateContextValue | null>(null);

async function expoOtaKontrolVeUygula(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Updates = await import("expo-updates");
    if (!Updates.isEnabled) return false;
    const sonuc = await Updates.checkForUpdateAsync();
    if (!sonuc.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [durum, setDurum] = useState<GuncellemeDurumu>({ tur: "guncel" });
  const [kontrolEdiliyor, setKontrolEdiliyor] = useState(true);
  const [otaUygulaniyor, setOtaUygulaniyor] = useState(false);

  const yenidenKontrol = useCallback(async (): Promise<GuncellemeDurumu> => {
    setKontrolEdiliyor(true);
    try {
      if (Platform.OS !== "web") {
        setOtaUygulaniyor(true);
        const otaYapildi = await expoOtaKontrolVeUygula();
        if (otaYapildi) return { tur: "guncel" };
        setOtaUygulaniyor(false);
      }
      const yeni = await guncellemeKontrolEt();
      setDurum(yeni);
      return yeni;
    } finally {
      setKontrolEdiliyor(false);
      setOtaUygulaniyor(false);
    }
  }, []);

  const guncellemeyiUygula = useCallback(async () => {
    if (durum.tur !== "guncelleme") return;
    const { config } = durum;

    if (Platform.OS === "web") {
      await webSayfasiniYenile();
      return;
    }

    if (Platform.OS === "android" && config.androidApkUrl) {
      await androidApkAc(androidApkIndirUrl(config));
      return;
    }

    setOtaUygulaniyor(true);
    try {
      await expoOtaKontrolVeUygula();
    } finally {
      setOtaUygulaniyor(false);
    }
  }, [durum]);

  useEffect(() => {
    void yenidenKontrol();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void yenidenKontrol();
    });
    return () => sub.remove();
  }, [yenidenKontrol]);

  const value = useMemo(
    () => ({
      durum,
      kontrolEdiliyor,
      otaUygulaniyor,
      yenidenKontrol,
      guncellemeyiUygula,
    }),
    [durum, kontrolEdiliyor, otaUygulaniyor, yenidenKontrol, guncellemeyiUygula],
  );

  const guncellemeGoster = durum.tur === "guncelleme";

  return (
    <UpdateContext.Provider value={value}>
      {children}
      {guncellemeGoster ? (
        <UpdateScreen
          durum={durum}
          yukleniyor={otaUygulaniyor}
          onGuncelle={() => void guncellemeyiUygula()}
          onSonra={
            durum.zorunlu
              ? undefined
              : () => setDurum({ tur: "guncel" })
          }
        />
      ) : null}
    </UpdateContext.Provider>
  );
}

export function useUpdate(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useUpdate UpdateProvider içinde olmalı");
  return ctx;
}
