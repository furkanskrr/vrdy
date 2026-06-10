import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import {
  androidApkAc,
  androidApkIndirUrl,
  guncellemeKontrolEt,
  type GuncellemeDurumu,
  webSayfasiniYenile,
} from "../lib/appUpdate";
import type { ApkIndirmeIlerleme } from "../lib/androidApkGuncelleme";
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
  kurulumSonrasi: boolean;
};

const KURULUM_ANAHTAR = "@vardiyam/son_apk_kurulum";
const UpdateContext = createContext<UpdateContextValue | null>(null);

async function kurulumKaydet(hedefSurum: string): Promise<void> {
  await AsyncStorage.setItem(
    KURULUM_ANAHTAR,
    JSON.stringify({ hedefSurum, zaman: Date.now() }),
  );
}

async function kurulumOku(): Promise<{ hedefSurum: string; zaman: number } | null> {
  try {
    const ham = await AsyncStorage.getItem(KURULUM_ANAHTAR);
    if (!ham) return null;
    const o = JSON.parse(ham) as { hedefSurum?: string; zaman?: number };
    if (!o.hedefSurum || !o.zaman) return null;
    return { hedefSurum: o.hedefSurum, zaman: o.zaman };
  } catch {
    return null;
  }
}

async function kurulumTemizle(): Promise<void> {
  await AsyncStorage.removeItem(KURULUM_ANAHTAR);
}

/** Yalnızca indirir; reloadAsync açılışta Android'de çökme yapabiliyor (native OTA ile çakışma). */
async function expoOtaIndir(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    const Updates = await import("expo-updates");
    if (!Updates.isEnabled) return false;
    const sonuc = await Updates.checkForUpdateAsync();
    if (!sonuc.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    return true;
  } catch {
    return false;
  }
}

async function expoOtaUygulaVeYenidenYukle(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const Updates = await import("expo-updates");
    if (!Updates.isEnabled) return false;
    const indirildi = await expoOtaIndir();
    if (!indirildi) {
      const mevcut = await Updates.checkForUpdateAsync();
      if (!mevcut.isAvailable) return false;
    }
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [durum, setDurum] = useState<GuncellemeDurumu>({ tur: "guncel" });
  const [kontrolEdiliyor, setKontrolEdiliyor] = useState(Platform.OS !== "android");
  const [otaUygulaniyor, setOtaUygulaniyor] = useState(false);
  const [apkIndiriliyor, setApkIndiriliyor] = useState(false);
  const [indirmeYuzdesi, setIndirmeYuzdesi] = useState(0);
  const [indirmeHatasi, setIndirmeHatasi] = useState<string | null>(null);
  const [kurulumSonrasi, setKurulumSonrasi] = useState(false);
  const sonKontrolSurum = useRef<string | null>(null);

  const apkKurulumDurumunuGuncelle = useCallback(async (yeni: GuncellemeDurumu) => {
    if (yeni.tur !== "guncelleme" || Platform.OS !== "android") return;
    const kayit = await kurulumOku();
    const ayniSurum = sonKontrolSurum.current === yeni.mevcutSurum;
    sonKontrolSurum.current = yeni.mevcutSurum;
    if (
      kayit &&
      kayit.hedefSurum === yeni.hedefSurum &&
      Date.now() - kayit.zaman < 15 * 60 * 1000 &&
      ayniSurum
    ) {
      setKurulumSonrasi(true);
    }
  }, []);

  const yenidenKontrol = useCallback(
    async (opts?: { otaIndir?: boolean }): Promise<GuncellemeDurumu> => {
      setKontrolEdiliyor(true);
      try {
        const yeni = await guncellemeKontrolEt();

        if (yeni.tur === "guncelleme") {
          await apkKurulumDurumunuGuncelle(yeni);
          setDurum(yeni);
          return yeni;
        }

        await kurulumTemizle();
        setKurulumSonrasi(false);

        if (opts?.otaIndir === true && Platform.OS !== "web") {
          setOtaUygulaniyor(true);
          await expoOtaIndir();
          setOtaUygulaniyor(false);
        }

        setDurum({ tur: "guncel" });
        return { tur: "guncel" };
      } finally {
        setKontrolEdiliyor(false);
        setOtaUygulaniyor(false);
      }
    },
    [apkKurulumDurumunuGuncelle],
  );

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
        const apkMod = await import("../lib/androidApkGuncelleme");
        await apkMod.androidApkIndirVeKur(androidApkIndirUrl(config), (ilerleme: ApkIndirmeIlerleme) => {
          setIndirmeYuzdesi(ilerleme.yuzde);
        });
        await kurulumKaydet(durum.hedefSurum);
        setKurulumSonrasi(true);
      } catch (e) {
        const apkMod = await import("../lib/androidApkGuncelleme");
        const mesaj =
          e instanceof apkMod.ApkIndirmeHatasi
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
      await expoOtaUygulaVeYenidenYukle();
    } finally {
      setOtaUygulaniyor(false);
    }
  }, [durum]);

  useEffect(() => {
    const acilisGecikme = setTimeout(() => {
      void yenidenKontrol({ otaIndir: Platform.OS === "ios" });
    }, Platform.OS === "android" ? 12000 : 5000);

    let guncellemeZamanlayici: ReturnType<typeof setTimeout> | null = null;
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      if (guncellemeZamanlayici) clearTimeout(guncellemeZamanlayici);
      guncellemeZamanlayici = setTimeout(() => {
        guncellemeZamanlayici = null;
        void yenidenKontrol({ otaIndir: false });
      }, 1500);
    });
    return () => {
      clearTimeout(acilisGecikme);
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
      kurulumSonrasi,
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
      kurulumSonrasi,
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
          kurulumSonrasi={kurulumSonrasi}
          onGuncelle={() => void guncellemeyiUygula()}
          onTekrarKontrol={() => void yenidenKontrol()}
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
