import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authHatasiGecersizRefreshToken, isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  PUSH_PROMPT_SKIP_STORAGE_KEY,
  probePushSetup,
  requestPushPermissionAndFetchToken,
  savePushToken,
} from "../lib/notifications";
import { AppEntrySplash } from "../components/AppEntrySplash";
import { profilCacheOku, profilCacheSil, profilCacheYaz } from "../lib/profilCache";
import { PushPermissionModal } from "../components/PushPermissionModal";
import type { TeamRole, UserProfile } from "../types";
import type { Session } from "@supabase/supabase-js";

type AuthContextValue = {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isMudur: boolean;
  /** Haftalık vardiya ve resmi tatil düzenleme (yalnızca müdür; müdür yrd. ve personel salt okunur) */
  vardiyaDuzenleyebilir: boolean;
  girisYap: (email: string, sifre: string) => Promise<string | null>;
  kayitOl: (
    email: string,
    sifre: string,
    ad: string,
  ) => Promise<{ ok: true } | { ok: false; hata: string }>;
  cikisYap: () => Promise<void>;
  profilTamamla: (magazaAdi: string, rol: TeamRole) => Promise<void>;
  /** DB’de grup açılır; yerel `groupId` güncellenmez — başarı ekranından `grupKurulumuYerelTamamla` çağrılır */
  grupOlustur: () => Promise<{ kod: string; groupId: string } | null>;
  /** Grup oluşturma sihirbazı bittikten sonra oturumdaki profili ana uygulamaya geçirir */
  grupKurulumuYerelTamamla: (kod: string, groupId: string) => void;
  grubaKatil: (kod: string) => Promise<string | null>;
  profilGuncelle: (updates: Partial<UserProfile>) => Promise<void>;
  /** Gruptan çıkış / ekipten silinme sonrası yerel oturumu kurulum akışına döndürür (Onboarding) */
  kurulumaSifirla: () => void;
  refreshProfil: () => Promise<void>;
  sifreGuncelleOturumda: (yeniSifre: string) => Promise<string | null>;
  sifreKurtarmaBekliyor: boolean;
  sifreKurtarmaModunuAc: () => void;
  sifreKurtarmaSonlandir: () => void;
  sifreKurtarmaIptal: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function grupKoduUret(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let kod = "";
  for (let i = 0; i < 6; i++) {
    kod += chars[Math.floor(Math.random() * chars.length)];
  }
  return kod;
}

/**
 * fetchProfile bazen gecikmeyle onboardingComplete: false döner; aynı hesapta yerel tamamlanmış kurulumu ezmesin.
 * Farklı e-posta = yeni hesap; önceki oturumdan onboarding taşınmaz.
 */
function profilBirlestir(prev: UserProfile | null, next: UserProfile): UserProfile {
  const { authGruptanKoparildi, ...restNext } = next;
  const ayniHesap = !!prev?.email && prev.email === next.email;
  const oncekiOnboarding = ayniHesap && !!prev?.onboardingComplete;
  const oncekiGrup = ayniHesap && !!prev?.groupId;

  /** iOS’ta group_members gecikince yanlış “gruptan çıktı” → Kurulum flaşı; önceki oturumu koru */
  if (authGruptanKoparildi && oncekiGrup && oncekiOnboarding) {
    return {
      ...restNext,
      groupId: prev!.groupId,
      grupKodu: prev!.grupKodu ?? restNext.grupKodu,
      magazaAdi: prev!.magazaAdi || restNext.magazaAdi,
      rol: prev!.rol ?? restNext.rol,
      onboardingComplete: true,
      onboarded: true,
    };
  }

  const onboardingComplete = authGruptanKoparildi
    ? !!next.onboardingComplete || (oncekiOnboarding && oncekiGrup)
    : restNext.groupId == null
      ? !!next.onboardingComplete || oncekiOnboarding
      : next.onboardingComplete || oncekiOnboarding;

  const groupId = authGruptanKoparildi && oncekiGrup ? prev!.groupId : restNext.groupId;
  const grupKodu =
    authGruptanKoparildi && oncekiGrup ? (prev!.grupKodu ?? restNext.grupKodu) : restNext.grupKodu;

  return {
    ...restNext,
    groupId,
    grupKodu,
    onboardingComplete,
    onboarded: !!groupId || restNext.onboarded,
  };
}

/** fetchProfile başarısız olursa yedek; Kurulum ekranına düşmemek için metadata ipucu kullanılır */
function oturumdanAsgariProfil(s: Session): UserProfile {
  const u = s.user;
  const metaVal = u.user_metadata?.onboarding_complete;
  const metaTamam = metaVal === true || metaVal === "true" || metaVal === 1;
  return {
    email: u.email ?? "",
    ad: String(u.user_metadata?.ad ?? u.email?.split("@")[0] ?? ""),
    magazaAdi: "",
    rol: "personel",
    grupKodu: null,
    groupId: null,
    onboardingComplete: metaTamam,
    onboarded: false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushModal, setPushModal] = useState<{
    open: boolean;
    mod: "undetermined" | "denied";
  }>({ open: false, mod: "undetermined" });
  const [pushModalBusy, setPushModalBusy] = useState(false);
  const [sifreKurtarmaBekliyor, setSifreKurtarmaBekliyor] = useState(false);

  type FetchProfilSecenek = { uyelikKontroluYumusak?: boolean };

  const fetchProfile = useCallback(async (
    userId: string,
    fallbackEmail?: string,
    sessionHint?: Session | null,
    secenek?: FetchProfilSecenek
  ): Promise<UserProfile> => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        let grupKodu: string | null = null;
        let effectiveGroupId: string | null = data.group_id ?? null;
        let magazaAdi = String(data.magaza_adi ?? "");
        /** Profilde group_id var ama group_members satırı yok (çıkarıldı / RPC öncesi) — hayalet müdür düzeltmesi */
        let gruptanKoparildi = false;

        if (effectiveGroupId) {
          const denemeSayisi = Platform.OS === "ios" ? 6 : 3;
          const beklemeMs = Platform.OS === "ios" ? 450 : 350;
          let uyeSatir: { id: string } | null = null;
          for (let deneme = 0; deneme < denemeSayisi; deneme++) {
            if (deneme > 0) {
              await new Promise((r) => setTimeout(r, beklemeMs * deneme));
            }
            const { data } = await supabase
              .from("group_members")
              .select("id")
              .eq("group_id", effectiveGroupId)
              .eq("profile_id", userId)
              .maybeSingle();
            uyeSatir = data;
            if (uyeSatir) break;
          }

          if (!uyeSatir) {
            if (secenek?.uyelikKontroluYumusak) {
              effectiveGroupId = data.group_id ?? effectiveGroupId;
            } else {
              gruptanKoparildi = true;
              effectiveGroupId = null;
              grupKodu = null;
              magazaAdi = "";
              void supabase
                .from("profiles")
                .update({ group_id: null, onboarding_complete: false, magaza_adi: "" })
                .eq("id", userId);
              void supabase.auth.updateUser({ data: { onboarding_complete: false } });
            }
          } else {
            const { data: grp } = await supabase
              .from("groups")
              .select("kod")
              .eq("id", effectiveGroupId)
              .single();
            grupKodu = grp?.kod ?? null;
          }
        }

        const authSess =
          sessionHint ?? (await supabase.auth.getSession()).data.session;
        const metaVal = authSess?.user?.user_metadata?.onboarding_complete;
        const metaTamam = metaVal === true || metaVal === "true" || metaVal === 1;

        const dbOnboarding = !!(data as { onboarding_complete?: boolean }).onboarding_complete;

        const onboardingComplete = gruptanKoparildi
          ? false
          : effectiveGroupId
            ? dbOnboarding ||
              metaTamam ||
              !!effectiveGroupId ||
              (data.rol === "mudur" && !!magazaAdi.trim()) ||
              data.rol === "yardimci" ||
              (!!magazaAdi.trim() && data.rol === "personel")
            : dbOnboarding || metaTamam;

        return {
          email: data.email ?? fallbackEmail ?? "",
          ad: data.ad ?? "",
          magazaAdi,
          rol: (data.rol as TeamRole) ?? "personel",
          grupKodu,
          groupId: effectiveGroupId,
          onboardingComplete,
          onboarded: !!effectiveGroupId,
          ...(gruptanKoparildi ? { authGruptanKoparildi: true as const } : {}),
        };
      }
    } catch {
      // DB hatasi
    }

    return {
      email: fallbackEmail ?? "",
      ad: fallbackEmail?.split("@")[0] ?? "",
      magazaAdi: "",
      rol: "personel",
      grupKodu: null,
      groupId: null,
      onboardingComplete: false,
      onboarded: false,
    };
  }, []);

  // Profil satırı: trigger gecikmiş / OAuth yarışı — upsert ile tek adımda garanti
  const ensureProfile = useCallback(async (userId: string, email: string, ad: string) => {
    const emailNorm = email || "";
    const adNorm = ad || emailNorm.split("@")[0] || "";
    const { error } = await supabase.from("profiles").upsert(
      { id: userId, email: emailNorm, ad: adNorm },
      { onConflict: "id" },
    );
    if (error && __DEV__) console.warn("[auth] ensureProfile upsert:", error.message);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured) {
      if (__DEV__) {
        console.warn(
          "[auth] Supabase ortam değişkenleri yok: proje kökünde .env içinde EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlayın; Expo’yu yeniden başlatın.",
        );
      }
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: { session: s }, error: sessErr } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessErr && authHatasiGecersizRefreshToken(sessErr)) {
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            /* */
          }
          if (!cancelled) {
            setSession(null);
            setUser(null);
          }
          return;
        }
        if (sessErr && __DEV__) console.warn("[auth] getSession:", sessErr.message);
        setSession(s);
        if (s?.user) {
          void ensureProfile(s.user.id, s.user.email ?? "", s.user.user_metadata?.ad ?? "").catch((e) => {
            if (__DEV__) console.warn("[auth] ensureProfile:", e);
          });
          try {
            const cached = await profilCacheOku(s.user.id);
            if (cached && !cancelled) setUser(cached);
            const p = await fetchProfile(s.user.id, s.user.email ?? undefined, s, {
              uyelikKontroluYumusak: true,
            });
            const merged = profilBirlestir(cached, p);
            if (!cancelled) {
              setUser(merged);
              if (merged.onboardingComplete && merged.groupId) {
                void profilCacheYaz(s.user.id, merged);
              }
            }
          } catch (e) {
            if (__DEV__) console.warn("[auth] fetchProfile:", e);
            if (!cancelled) setUser(oturumdanAsgariProfil(s));
          } finally {
            if (!cancelled) setLoading(false);
          }
        } else {
          setUser(null);
          if (!cancelled) setLoading(false);
        }
      } catch (e) {
        if (__DEV__) console.warn("[auth] oturum okunamadı:", e);
        if (!cancelled) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        // INITIAL_SESSION bazen storage okunmadan null gelebilir; getSession ile cifte yazip oturumu silmeyelim
        if (event === "INITIAL_SESSION") {
          return;
        }
        if (event === "PASSWORD_RECOVERY") {
          setSifreKurtarmaBekliyor(true);
          // RecoveryStack tek ekran; kök navigate Auth stack iken SifreBelirle bulunmaz (RN uyarısı).
        }
        setSession(s);
        if (!s?.user) {
          setUser(null);
          return;
        }
        void ensureProfile(s.user.id, s.user.email ?? "", s.user.user_metadata?.ad ?? "").catch((e) => {
          if (__DEV__) console.warn("[auth] ensureProfile (listener):", e);
        });
        void (async () => {
          try {
            const p = await fetchProfile(s.user.id, s.user.email ?? undefined, s, {
              uyelikKontroluYumusak: true,
            });
            setUser((prev) => {
              const m = profilBirlestir(prev, p);
              if (m.onboardingComplete && m.groupId) void profilCacheYaz(s.user.id, m);
              return m;
            });
          } catch (e) {
            if (__DEV__) console.warn("[auth] fetchProfile (listener):", e);
          }
        })();
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile, ensureProfile]);

  /** Açılıştan sonra sert üyelik kontrolü (iOS ağ gecikmesi; Kurulum flaşını önler) */
  useEffect(() => {
    if (loading || !session?.user?.id) return;
    let iptal = false;
    const zamanlayici = setTimeout(() => {
      void (async () => {
        try {
          const p = await fetchProfile(
            session.user.id,
            session.user.email ?? undefined,
            session,
            { uyelikKontroluYumusak: false },
          );
          if (iptal) return;
          setUser((prev) => {
            const m = profilBirlestir(prev, p);
            if (m.onboardingComplete && m.groupId) void profilCacheYaz(session.user.id, m);
            return m;
          });
        } catch (e) {
          if (__DEV__) console.warn("[auth] fetchProfile (arka plan):", e);
        }
      })();
    }, 2800);
    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [loading, session, fetchProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user?.id || !user?.groupId) {
      setPushModal({ open: false, mod: "undetermined" });
      return;
    }
    let iptal = false;
    (async () => {
      const probe = await probePushSetup();
      if (iptal) return;
      if (!probe.available) return;
      if (probe.status === "granted") {
        if (probe.token) await savePushToken(probe.token);
        else if (__DEV__) console.warn("[push] İzin var ama token alınamadı");
        if (!iptal) setPushModal({ open: false, mod: "undetermined" });
        return;
      }
      const skipped = await AsyncStorage.getItem(PUSH_PROMPT_SKIP_STORAGE_KEY);
      if (iptal) return;
      if (skipped === "1") return;
      if (probe.status === "undetermined") setPushModal({ open: true, mod: "undetermined" });
      else setPushModal({ open: true, mod: "denied" });
    })();
    return () => {
      iptal = true;
    };
  }, [session?.user?.id, user?.groupId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user?.id || !user?.groupId) return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      void (async () => {
        const probe = await probePushSetup();
        if (probe.available && probe.status === "granted" && probe.token) {
          await savePushToken(probe.token);
          setPushModal({ open: false, mod: "undetermined" });
        }
      })();
    });
    return () => sub.remove();
  }, [session?.user?.id, user?.groupId]);

  const pushModalAtla = useCallback(async () => {
    await AsyncStorage.setItem(PUSH_PROMPT_SKIP_STORAGE_KEY, "1");
    setPushModal({ open: false, mod: "undetermined" });
  }, []);

  const pushModalBirincil = useCallback(async () => {
    if (pushModal.mod === "denied") {
      Linking.openSettings();
      return;
    }
    setPushModalBusy(true);
    try {
      const PUSH_ISTEK_MS = 22000;
      const t = await Promise.race([
        requestPushPermissionAndFetchToken(),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), PUSH_ISTEK_MS)),
      ]);
      if (t) {
        await savePushToken(t);
        setPushModal({ open: false, mod: "undetermined" });
        return;
      }
      const probe = await probePushSetup();
      if (probe.available && probe.status === "granted" && probe.token) {
        await savePushToken(probe.token);
        setPushModal({ open: false, mod: "undetermined" });
      } else if (probe.available && probe.status === "denied") {
        setPushModal({ open: true, mod: "denied" });
      } else {
        setPushModal({ open: false, mod: "undetermined" });
      }
    } finally {
      setPushModalBusy(false);
    }
  }, [pushModal.mod]);

  const refreshProfil = useCallback(async () => {
    if (!session?.user) return;
    const p = await fetchProfile(session.user.id, session.user.email ?? undefined, session);
    setUser((prev) => {
      const m = profilBirlestir(prev, p);
      if (m.onboardingComplete && m.groupId) void profilCacheYaz(session.user.id, m);
      return m;
    });
  }, [session, fetchProfile]);

  const kurulumaSifirla = useCallback(() => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            groupId: null,
            grupKodu: null,
            onboardingComplete: false,
            onboarded: false,
            magazaAdi: "",
          }
        : prev
    );
  }, []);

  const girisYap = useCallback(async (email: string, sifre: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });
    if (error) return error.message;
    return null;
  }, []);

  const kayitOl = useCallback(async (email: string, sifre: string, ad: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: sifre,
      options: { data: { ad } },
    });
    if (error) return { ok: false as const, hata: error.message };

    if (!data.session) {
      const { error: girisHata } = await supabase.auth.signInWithPassword({ email, password: sifre });
      if (girisHata) return { ok: false as const, hata: girisHata.message };
    }

    return { ok: true as const };
  }, []);

  const cikisYap = useCallback(async () => {
    const uid = session?.user?.id;
    const CIKIS_MS = 6000;
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise<void>((resolve) => setTimeout(resolve, CIKIS_MS)),
      ]);
    } catch (e) {
      if (__DEV__) console.warn("[auth] signOut:", e);
    } finally {
      if (uid) void profilCacheSil(uid);
      setSifreKurtarmaBekliyor(false);
      setUser(null);
      setSession(null);
    }
  }, [session?.user?.id]);

  const profilTamamla = useCallback(async (magazaAdi: string, rol: TeamRole) => {
    if (!session?.user) {
      Alert.alert("Oturum yok", "Lütfen çıkış yapıp tekrar giriş yapın.");
      return;
    }

    if (rol === "mudur" && magazaAdi.trim().length < 2) {
      Alert.alert("Hata", "Müdür için mağaza adı en az 2 karakter olmalıdır.");
      return;
    }

    const uid = session.user.id;
    await ensureProfile(
      uid,
      session.user.email ?? "",
      String(session.user.user_metadata?.ad ?? ""),
    );

    const patchTam =
      rol === "mudur"
        ? { magaza_adi: magazaAdi.trim(), rol, onboarding_complete: true as const }
        : { rol, onboarding_complete: true as const };

    const patchYedek =
      rol === "mudur" ? { magaza_adi: magazaAdi.trim(), rol } : { rol };

    async function profilGuncelle(p: typeof patchTam | typeof patchYedek) {
      return supabase.from("profiles").update(p).eq("id", uid).select("id");
    }

    let { data: satirlar, error } = await profilGuncelle(patchTam);

    if (
      error &&
      (error.message?.toLowerCase().includes("onboarding_complete") ||
        error.message?.toLowerCase().includes("schema cache"))
    ) {
      const ikinci = await profilGuncelle(patchYedek);
      satirlar = ikinci.data;
      error = ikinci.error;
    }

    if (error) {
      Alert.alert("Hata", "Profil güncellenemedi: " + error.message);
      return;
    }

    if (!satirlar?.length) {
      await ensureProfile(
        uid,
        session.user.email ?? "",
        String(session.user.user_metadata?.ad ?? ""),
      );
      const yeniden = await profilGuncelle(patchTam);
      satirlar = yeniden.data;
      error = yeniden.error;
      if (
        error &&
        (error.message?.toLowerCase().includes("onboarding_complete") ||
          error.message?.toLowerCase().includes("schema cache"))
      ) {
        const ikinci = await profilGuncelle(patchYedek);
        satirlar = ikinci.data;
        error = ikinci.error;
      }
    }

    if (error) {
      Alert.alert("Hata", "Profil güncellenemedi: " + error.message);
      return;
    }

    if (!satirlar?.length) {
      Alert.alert(
        "Hata",
        "Profil güncellenemedi (0 satır). Oturum / RLS kontrolü: Supabase’te profiles için güncelleme izni ve onboarding_complete sütunu (profiles_onboarding_complete.sql).",
      );
      return;
    }

    const metaVar = session.user.user_metadata?.onboarding_complete;
    const metaZatenTamam =
      metaVar === true || metaVar === "true" || metaVar === 1;
    if (!metaZatenTamam) {
      try {
        await Promise.race([
          (async () => {
            const { error: authErr } = await supabase.auth.updateUser({
              data: { onboarding_complete: true },
            });
            if (authErr && __DEV__) console.warn("[auth] profilTamamla updateUser:", authErr.message);
            const low = authErr?.message?.toLowerCase() ?? "";
            if (authErr && low.includes("rate limit")) {
              await new Promise((r) => setTimeout(r, 4000));
              const { error: e2 } = await supabase.auth.updateUser({
                data: { onboarding_complete: true },
              });
              if (e2 && __DEV__) console.warn("[auth] profilTamamla updateUser (yeniden):", e2.message);
            }
            const { data: sess } = await supabase.auth.getSession();
            if (sess.session) setSession(sess.session);
          })(),
          new Promise<void>((resolve) => setTimeout(resolve, 12000)),
        ]);
      } catch {
        /* updateUser / getSession bazen uzun sürer veya takılır */
      }
    } else {
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) setSession(sess.session);
    }

    setUser((prev) => {
      const base =
        prev ?? {
          email: session.user.email ?? "",
          ad: String(
            session.user.user_metadata?.ad ?? session.user.email?.split("@")[0] ?? "",
          ),
          magazaAdi: "",
          rol: "personel" as TeamRole,
          grupKodu: null,
          groupId: null,
          onboardingComplete: false,
          onboarded: false,
        };
      return {
        ...base,
        rol,
        magazaAdi: rol === "mudur" ? magazaAdi.trim() : base.magazaAdi,
        onboardingComplete: true,
      };
    });

    setTimeout(() => {
      void refreshProfil();
    }, 320);
  }, [session, refreshProfil, ensureProfile]);

  const grupKurulumuYerelTamamla = useCallback((kod: string, groupId: string) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            grupKodu: kod,
            groupId,
            onboarded: true,
            onboardingComplete: true,
          }
        : prev
    );
  }, []);

  const grupOlustur = useCallback(async (): Promise<{ kod: string; groupId: string } | null> => {
    if (!session?.user || !user) {
      Alert.alert("Hata", "Oturum bulunamadı. Çıkış yapıp tekrar giriş yapın.");
      return null;
    }

    const kod = grupKoduUret();
    const { data: grp, error: grpErr } = await supabase
      .from("groups")
      .insert({ kod, magaza_adi: user.magazaAdi, olusturan_id: session.user.id })
      .select()
      .single();

    if (grpErr || !grp) {
      Alert.alert("Hata", grpErr?.message || "Grup oluşturulamadı");
      return null;
    }

    const { error: profErr } = await supabase
      .from("profiles")
      .update({ group_id: grp.id })
      .eq("id", session.user.id);

    if (profErr) {
      Alert.alert("Hata", "Profil güncellenemedi: " + profErr.message);
      return null;
    }

    const { error: memErr } = await supabase.from("group_members").insert({
      group_id: grp.id,
      profile_id: session.user.id,
      ad: user.ad,
      rol: user.rol,
    });

    if (memErr) {
      Alert.alert(
        "Uyarı",
        "Grup oluşturuldu ancak ekip listesine otomatik eklenemedi: " +
          memErr.message +
          "\n\nAna ekrana geçtikten sonra Ayarlar → Ekip bölümünü kontrol edin veya yeniden giriş yapın.",
      );
    }

    /** Yerel groupId burada set edilmez: SetupFlow hemen Main’e atıp bu ekranı öldürüyordu; başarı + kod paylaşımı gösterilemez. */
    return { kod, groupId: grp.id };
  }, [session, user]);

  const grubaKatil = useCallback(async (kod: string): Promise<string | null> => {
    if (!session?.user || !user) return "Oturum bulunamadı";

    const temiz = kod.toUpperCase().trim();
    const { data: grp, error: grpErr } = await supabase
      .from("groups")
      .select("id, magaza_adi")
      .eq("kod", temiz)
      .single();

    if (grpErr || !grp) return "Geçersiz grup kodu";

    const profilPatch: Record<string, unknown> = { group_id: grp.id };
    if (!user.magazaAdi?.trim() && grp.magaza_adi) {
      profilPatch.magaza_adi = grp.magaza_adi;
    }

    const oncekiGroupId = user.groupId ?? null;
    const oncekiMagaza = user.magazaAdi ?? "";

    // Zaten uye mi (profil bu grupta ise satiri gorebiliriz)
    const { data: existing } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", grp.id)
      .eq("profile_id", session.user.id)
      .maybeSingle();

    if (!existing) {
      // Once profile.group_id guncelle: RLS INSERT "group_id = current_profile_group_id()" bunu gerektirir.
      // Aksi halde davet politikasinin DB'de olmamasi veya eski group_id yuzunden INSERT reddedilir.
      const { error: profErrOnce } = await supabase
        .from("profiles")
        .update(profilPatch)
        .eq("id", session.user.id);

      if (profErrOnce) return "Profil güncellenemedi: " + profErrOnce.message;

      const { error: memErr } = await supabase
        .from("group_members")
        .insert({
          group_id: grp.id,
          profile_id: session.user.id,
          ad: user.ad,
          rol: user.rol,
        });

      if (memErr) {
        await supabase
          .from("profiles")
          .update({ group_id: oncekiGroupId, magaza_adi: oncekiMagaza })
          .eq("id", session.user.id);
        return memErr.message;
      }
    } else {
      const { error: profErr } = await supabase
        .from("profiles")
        .update(profilPatch)
        .eq("id", session.user.id);

      if (profErr) return "Profil güncellenemedi: " + profErr.message;
    }

    const yeniMagaza =
      user.magazaAdi?.trim() ? user.magazaAdi : (grp.magaza_adi ?? user.magazaAdi);

    setUser((prev) =>
      prev
        ? {
            ...prev,
            grupKodu: temiz,
            groupId: grp.id,
            onboarded: true,
            magazaAdi: yeniMagaza,
            /** Kurulum akışında !groupId ile GrupKur gösteriliyor; üyelik tamamlanınca ana ekrana geçiş garanti */
            onboardingComplete: true,
          }
        : prev
    );
    return null;
  }, [session, user]);

  const profilGuncelle = useCallback(async (updates: Partial<UserProfile>) => {
    if (!session?.user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.ad !== undefined) dbUpdates.ad = updates.ad;
    if (updates.magazaAdi !== undefined) dbUpdates.magaza_adi = updates.magazaAdi;
    if (updates.rol !== undefined) dbUpdates.rol = updates.rol;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from("profiles").update(dbUpdates).eq("id", session.user.id);
    }
    if (updates.ad !== undefined && String(updates.ad).trim() !== "") {
      const { error: rpcErr } = await supabase.rpc("sync_my_group_member_ad", {
        p_ad: String(updates.ad).trim(),
      });
      if (rpcErr && __DEV__) {
        console.warn(
          "[auth] Ekip adı senkronu (sync_my_group_member_ad):",
          rpcErr.message,
          "— supabase/sync_group_member_ad.sql çalıştırıldı mı?",
        );
      }
    }
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, [session]);

  const sifreGuncelleOturumda = useCallback(async (yeniSifre: string): Promise<string | null> => {
    if (yeniSifre.length < 6) return "Şifre en az 6 karakter olmalıdır.";
    if (!session?.user) return "Oturum yok";
    const SIFRE_ISTEK_MS = 1500;
    try {
      const sonuc = await Promise.race([
        supabase.auth.updateUser({ password: yeniSifre }),
        new Promise<{ data: null; error: { message: string } | null }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), SIFRE_ISTEK_MS),
        ),
      ]);
      // RN / gotrue bazen istek başarılı olsa bile Promise'i tamamlamaz; kısa zaman aşımından sonra UI kilitlenmesin
      if (sonuc.error === null && sonuc.data === null) {
        if (__DEV__) console.warn("[auth] updateUser zaman aşımı — istemci yanıt beklemedi; şifre sunucuda güncellenmiş olabilir");
        return null;
      }
      return sonuc.error?.message ?? null;
    } catch (e) {
      return e instanceof Error ? e.message : "Şifre güncellenemedi.";
    }
  }, [session]);

  const sifreKurtarmaModunuAc = useCallback(() => {
    setSifreKurtarmaBekliyor(true);
  }, []);

  const sifreKurtarmaSonlandir = useCallback(() => {
    setSifreKurtarmaBekliyor(false);
  }, []);

  const sifreKurtarmaIptal = useCallback(async () => {
    setSifreKurtarmaBekliyor(false);
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise<void>((resolve) => setTimeout(resolve, 6000)),
      ]);
    } catch {
      /* */
    } finally {
      setUser(null);
      setSession(null);
    }
  }, []);

  const isMudur = user?.rol === "mudur";
  const vardiyaDuzenleyebilir = user?.rol === "mudur";

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isMudur,
      vardiyaDuzenleyebilir,
      girisYap,
      kayitOl,
      cikisYap,
      profilTamamla,
      grubaKatil,
      grupOlustur,
      grupKurulumuYerelTamamla,
      profilGuncelle,
      kurulumaSifirla,
      refreshProfil,
      sifreGuncelleOturumda,
      sifreKurtarmaBekliyor,
      sifreKurtarmaModunuAc,
      sifreKurtarmaSonlandir,
      sifreKurtarmaIptal,
    }),
    [
      user,
      session,
      loading,
      isMudur,
      vardiyaDuzenleyebilir,
      girisYap,
      kayitOl,
      cikisYap,
      profilTamamla,
      grubaKatil,
      grupOlustur,
      grupKurulumuYerelTamamla,
      profilGuncelle,
      kurulumaSifirla,
      refreshProfil,
      sifreGuncelleOturumda,
      sifreKurtarmaBekliyor,
      sifreKurtarmaModunuAc,
      sifreKurtarmaSonlandir,
      sifreKurtarmaIptal,
    ]
  );

  if (loading) {
    return <AppEntrySplash />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PushPermissionModal
        gorunur={pushModal.open}
        mod={pushModal.mod}
        yukleniyor={pushModalBusy}
        onAtla={pushModalAtla}
        onBirincil={pushModalBirincil}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider içinde olmalı");
  return ctx;
}
