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
import { ApkIndirmeHatasi, androidApkIndirVeKur } from "../lib/androidApkGuncelleme";
import { UpdateScreen } from "../components/UpdateScreen";

type UpdateContextValue = {
  durum: GuncellemeDurumu;
  kontrolEdiliyor: boolean;
  otaUygulaniyor: boolean;
  apkIndiriliyor: boolean;
  indirmeYuzdesi: number;
  indirmeHatasi: string | null;
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
  const [apkIndiriliyor, setApkIndiriliyor] = useState(false);
  const [indirmeYuzdesi, setIndirmeYuzdesi] = useState(0);
  const [indirmeHatasi, setIndirmeHatasi] = useState<string | null>(null);

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

    if (Platform.OS === "android") {
      setApkIndiriliyor(true);
      setIndirmeYuzdesi(0);
      setIndirmeHatasi(null);
      try {
        await androidApkIndirVeKur(androidApkIndirUrl(config), (ilerleme) => {
          setIndirmeYuzdesi(ilerleme.yuzde);
        });
      } catch (e) {
        const mesaj =
          e instanceof ApkIndirmeHatasi
            ? e.message
            : e instanceof Error
              ? e.message
              : "İndirme başarısız.";
        try {
          await androidApkAc(androidApkIndirUrl(config));
        } catch {
          setIndirmeHatasi(mesaj);
        }
      } finally {
        setApkIndiriliyor(false);
      }
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
    let guncellemeZamanlayici: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      if (guncellemeZamanlayici) clearTimeout(guncellemeZamanlayici);
      guncellemeZamanlayici = setTimeout(() => {
        guncellemeZamanlayici = null;
        void yenidenKontrol();
      }, 1500);
    });
    return () => {
      if (guncellemeZamanlayici) clearTimeout(guncellemeZamanlayici);
      sub.remove();
    };
  }, [yenidenKontrol]);

  const value = useMemo(
    () => ({
      durum,
      kontrolEdiliyor,
      otaUygulaniyor,
      apkIndiriliyor,
      indirmeYuzdesi,
      indirmeHatasi,
      yenidenKontrol,
      guncellemeyiUygula,
    }),
    [
      durum,
      kontrolEdiliyor,
      otaUygulaniyor,
      apkIndiriliyor,
      indirmeYuzdesi,
      indirmeHatasi,
      yenidenKontrol,
      guncellemeyiUygula,
    ],
  );

  const guncellemeGoster = durum.tur === "guncelleme";

  return (
    <UpdateContext.Provider value={value}>
      {children}
      {guncellemeGoster ? (
        <UpdateScreen
          durum={durum}
          yukleniyor={otaUygulaniyor}
          indiriliyor={apkIndiriliyor}
          indirmeYuzdesi={indirmeYuzdesi}
          indirmeHatasi={indirmeHatasi}
          onGuncelle={() => void guncellemeyiUygula()}
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
