import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import {
  temizlikBolgesiMetni,
  temizlikSlotuAyinGunu,
  yerelTarihAnahtar,
} from "../constants/cleaningSchedule";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useSchedule } from "../context/ScheduleContext";
import { useNotification } from "../context/NotificationContext";
import {
  temizlikDenetimeOnayla,
  temizlikDenetimOzet,
  temizlikPersonelOzet,
  temizlikTamamla,
  temizlikTamamlamalariYukle,
  temizlikTamamlamaSil,
  type TemizlikTamamlama,
} from "../lib/groupCleaning";
import { temizlikDenetimiVerilebilirMi } from "../lib/temizlikDenetimVardiya";
import { isSupabaseConfigured } from "../lib/supabase";
import { ustEkranBoslugu } from "../lib/safeArea";
import type { MainStackParamList } from "../navigation/types";
import type { TeamMember } from "../types";

type Props = NativeStackScreenProps<MainStackParamList, "TemizlikTakvimi">;

function gorunenAyBugunIleAyni(yil: number, ay0: number): boolean {
  const b = new Date();
  return yil === b.getFullYear() && ay0 === b.getMonth();
}

function ayBirinciGunu(yil: number, ay0: number): Date {
  return new Date(yil, ay0, 1, 12, 0, 0, 0);
}

function ayGunSayisi(yil: number, ay0: number): number {
  return new Date(yil, ay0 + 1, 0).getDate();
}

function createTemizlikStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 16, paddingBottom: 44 },
    hero: {
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroUst: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
    heroBaslik: { fontSize: 20, fontWeight: "900", color: colors.text, flex: 1 },
    heroAlt: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
    bilgiKutu: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.primaryMuted + "18",
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.primaryMuted + "44",
    },
    bilgiText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    aySatir: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ayBaslik: { fontSize: 16, fontWeight: "800", color: colors.text, flex: 1, textAlign: "center" },
    ayOk: { padding: 10, borderRadius: 12 },
    uyari: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.afternoon + "18",
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.afternoon + "40",
    },
    uyariText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    ozetSatir: { flexDirection: "row", gap: 10, marginBottom: 18 },
    ozetHucre: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    ozetSayi: { fontSize: 20, fontWeight: "900", color: colors.text },
    ozetEtiket: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    listeBaslik: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.textMuted,
      letterSpacing: 1,
      marginBottom: 10,
      textTransform: "uppercase",
    },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    kartSolSerit: { width: 4, backgroundColor: "transparent" },
    kartIc: { padding: 16, paddingLeft: 14 },
    kartBugunSerit: { backgroundColor: colors.primary },
    kartBugunArka: { backgroundColor: colors.primaryMuted + "12" },
    kartUst: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
    kartGun: { fontSize: 16, fontWeight: "800", color: colors.text, flex: 1 },
    kartSlot: { fontSize: 11, fontWeight: "800", color: colors.primary, marginTop: 6, letterSpacing: 0.3 },
    chipSatir: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipOk: { backgroundColor: colors.morning + "22", borderColor: colors.morning + "55" },
    chipBek: { backgroundColor: colors.afternoon + "18", borderColor: colors.afternoon + "44" },
    chipText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
    chipTextOk: { color: colors.morning },
    chipTextBek: { color: colors.afternoon },
    kartBolge: { fontSize: 14, color: colors.text, marginTop: 12, lineHeight: 22, fontWeight: "600" },
    onayKutu: {
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    onayBaslik: { fontSize: 11, fontWeight: "800", color: colors.textMuted, marginBottom: 6 },
    onayMetin: { fontSize: 12, color: colors.text, lineHeight: 18, fontWeight: "600" },
    denetimBekliyor: { fontSize: 12, color: colors.textMuted, marginTop: 10, fontStyle: "italic", lineHeight: 18 },
    btnPersonel: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
    },
    btnDenetim: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.surface2,
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    btnTextPersonel: { color: "#fff", fontWeight: "800", fontSize: 14 },
    btnTextDenetim: { color: colors.primary, fontWeight: "800", fontSize: 14 },
    btnDisabled: { opacity: 0.45 },
    gelecekNot: { fontSize: 12, color: colors.textMuted, marginTop: 12, fontStyle: "italic", lineHeight: 18 },
    silBtn: { padding: 8, marginLeft: 4 },
    yukleniyor: { marginVertical: 28, alignItems: "center" },
    kartSatir: { flexDirection: "row", alignItems: "stretch" },
  });
}

export function TemizlikTakvimiScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createTemizlikStyles(colors), [colors]);
  const { user, session, vardiyaDuzenleyebilir } = useAuth();
  const { ekip, izinGunu, overrides, resmiTatilTarihleri } = useSchedule();
  const { bildirimGonder } = useNotification();

  const simdi = new Date();
  const [yil, setYil] = useState(simdi.getFullYear());
  const [ay0, setAy0] = useState(simdi.getMonth());
  const [kayitlar, setKayitlar] = useState<TemizlikTamamlama[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState<string | null>(null);
  const [denetimBusyId, setDenetimBusyId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const satirYukseklikRef = useRef<Record<string, number>>({});

  const groupId = user?.groupId ?? null;
  const profilId = session?.user?.id ?? null;

  const benimUyeKaydi = useMemo(
    () => (profilId ? ekip.find((m) => m.profileId === profilId) : undefined),
    [ekip, profilId]
  );

  const profilAd = useCallback(
    (pid: string) => ekip.find((u) => u.profileId === pid)?.ad ?? null,
    [ekip]
  );

  const ayEtiket = useMemo(
    () =>
      ayBirinciGunu(yil, ay0).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    [yil, ay0]
  );

  const ayBaslangic = useMemo(() => {
    const a = ayBirinciGunu(yil, ay0);
    return yerelTarihAnahtar(new Date(a.getFullYear(), a.getMonth(), 1));
  }, [yil, ay0]);

  const ayBitis = useMemo(() => {
    const son = ayGunSayisi(yil, ay0);
    return yerelTarihAnahtar(new Date(yil, ay0, son));
  }, [yil, ay0]);

  /** Varsayılan sessiz yenileme: liste DOM’da kalır, kaydırma konumu korunur. tamEkranSpinner true olursa tam ekran «yükleniyor» gösterilir. */
  const yenile = useCallback(async (opts?: { tamEkranSpinner?: boolean }) => {
    if (!groupId || !isSupabaseConfigured) {
      setKayitlar([]);
      setYukleniyor(false);
      return;
    }
    if (opts?.tamEkranSpinner) setYukleniyor(true);
    try {
      const liste = await temizlikTamamlamalariYukle(groupId, ayBaslangic, ayBitis);
      setKayitlar(liste);
    } finally {
      setYukleniyor(false);
    }
  }, [groupId, ayBaslangic, ayBitis]);

  useFocusEffect(
    useCallback(() => {
      void yenile();
      satirYukseklikRef.current = {};

      let iptal = false;
      const bugunAnahtar = yerelTarihAnahtar(new Date());

      function buguneKaydir() {
        if (iptal) return;
        if (!gorunenAyBugunIleAyni(yil, ay0)) return;
        const yOf = satirYukseklikRef.current[bugunAnahtar];
        if (yOf == null) return;
        scrollRef.current?.scrollTo({
          y: Math.max(0, yOf - 20),
          animated: true,
        });
      }

      const zamanlar = [60, 180, 400, 700, 1100];
      const zamanlayicilar = zamanlar.map((ms) => setTimeout(buguneKaydir, ms));

      return () => {
        iptal = true;
        zamanlayicilar.forEach(clearTimeout);
      };
    }, [yenile, yil, ay0])
  );

  const kayitMap = useMemo(() => {
    const m = new Map<string, TemizlikTamamlama>();
    for (const k of kayitlar) m.set(k.gun_tarihi, k);
    return m;
  }, [kayitlar]);

  const gunSatirlari = useMemo(() => {
    const n = ayGunSayisi(yil, ay0);
    const satirlar: {
      tarihKey: string;
      gunNo: number;
      etiket: string;
      slot: number;
      bolge: string;
      tarih: Date;
    }[] = [];
    for (let g = 1; g <= n; g++) {
      const tarih = new Date(yil, ay0, g, 12, 0, 0, 0);
      const tarihKey = yerelTarihAnahtar(tarih);
      const slot = temizlikSlotuAyinGunu(g);
      const bolge = temizlikBolgesiMetni(slot);
      const etiket = tarih.toLocaleDateString("tr-TR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      satirlar.push({ tarihKey, gunNo: g, etiket, slot, bolge, tarih });
    }
    return satirlar;
  }, [yil, ay0]);

  const personelOnaySayisi = useMemo(() => kayitlar.length, [kayitlar]);
  const denetimTamamSayisi = useMemo(
    () => kayitlar.filter((k) => k.supervisor_approved_at).length,
    [kayitlar]
  );

  const denetimVerilebilir = useCallback(
    (tarihIso: string) => {
      if (!benimUyeKaydi?.id) return false;
      return temizlikDenetimiVerilebilirMi({
        tarihIso,
        uyeId: benimUyeKaydi.id,
        rol: benimUyeKaydi.rol as TeamMember["rol"],
        ekip,
        izinGunu,
        overrides,
        resmiTatilTarihleri,
      });
    },
    [benimUyeKaydi, ekip, izinGunu, overrides, resmiTatilTarihleri]
  );

  function ayOnceki() {
    if (ay0 === 0) {
      setAy0(11);
      setYil((y) => y - 1);
    } else {
      setAy0((a) => a - 1);
    }
  }

  function aySonraki() {
    if (ay0 === 11) {
      setAy0(0);
      setYil((y) => y + 1);
    } else {
      setAy0((a) => a + 1);
    }
  }

  async function tamamla(tarih: Date, tarihKey: string) {
    if (!groupId || !profilId) return;
    setKaydediyor(tarihKey);
    try {
      const sonuc = await temizlikTamamla({ groupId, tarih, profileId: profilId });
      if (!sonuc.ok) {
        Alert.alert("Kayıt olmadı", sonuc.mesaj);
        return;
      }
      bildirimGonder("bilgi", "Temizlik", "Personel onayı kaydedildi. Yönetici denetimi bekleniyor.");
      await yenile();
    } finally {
      setKaydediyor(null);
    }
  }

  async function denetimOnayla(k: TemizlikTamamlama) {
    setDenetimBusyId(k.id);
    try {
      const sonuc = await temizlikDenetimeOnayla(k.id);
      if (!sonuc.ok) {
        Alert.alert("Denetim", sonuc.mesaj);
        return;
      }
      bildirimGonder("bilgi", "Temizlik", "Denetim onayı kaydedildi.");
      await yenile();
    } finally {
      setDenetimBusyId(null);
    }
  }

  async function sil(k: TemizlikTamamlama) {
    Alert.alert(
      "Kaydı sil",
      "Bu günün tüm temizlik kayıtları (personel + denetim) silinsin mi?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const sonuc = await temizlikTamamlamaSil(k.id);
            if (!sonuc.ok) {
              Alert.alert("Silinemedi", sonuc.mesaj);
              return;
            }
            bildirimGonder("bilgi", "Temizlik", "Kayıt kaldırıldı.");
            await yenile();
          },
        },
      ]
    );
  }

  const personelRolu = benimUyeKaydi?.rol === "personel";

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 8) }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.heroUst}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: colors.primaryMuted + "44",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="sparkles" size={26} color={colors.primary} />
          </View>
          <Text style={styles.heroBaslik}>Temizlik takvimi</Text>
        </View>
        <Text style={styles.heroAlt}>
          Her gün bir reyon; personel «yaptım» der, aynı gün vardiyada olan müdür veya müdür yardımcısı denetler. İki
          onay da kayıtlı kalır.
        </Text>
      </View>

      <View style={styles.bilgiKutu}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.bilgiText}>
          Personel onayını yalnızca «Personel» rolü verir. Müdür yardımcısının uygulamadaki ek yetkisi burada denetim
          onayıdır; vardiya tablosunda o gün çalışıyor olmalıdır.
        </Text>
      </View>

      {!isSupabaseConfigured ? (
        <View style={styles.uyari}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.afternoon} />
          <Text style={styles.uyariText}>
            Sunucu yok veya `group_cleaning.sql` çalışmadı. Supabase SQL Editor&apos;de güncel dosyayı çalıştırın.
          </Text>
        </View>
      ) : null}

      {!groupId ? (
        <View style={styles.uyari}>
          <Ionicons name="people-outline" size={20} color={colors.afternoon} />
          <Text style={styles.uyariText}>Gruba bağlı değilsiniz; takvim kullanılamaz.</Text>
        </View>
      ) : null}

      <View style={styles.aySatir}>
        <TouchableOpacity style={styles.ayOk} onPress={ayOnceki} accessibilityLabel="Önceki ay">
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.ayBaslik}>{ayEtiket}</Text>
        <TouchableOpacity style={styles.ayOk} onPress={aySonraki} accessibilityLabel="Sonraki ay">
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.ozetSatir}>
        <View style={styles.ozetHucre}>
          <Text style={styles.ozetSayi}>{personelOnaySayisi}</Text>
          <Text style={styles.ozetEtiket}>Personel onayı</Text>
        </View>
        <View style={styles.ozetHucre}>
          <Text style={styles.ozetSayi}>{denetimTamamSayisi}</Text>
          <Text style={styles.ozetEtiket}>Denetim tamam</Text>
        </View>
        <View style={styles.ozetHucre}>
          <Text style={styles.ozetSayi}>{ayGunSayisi(yil, ay0)}</Text>
          <Text style={styles.ozetEtiket}>Gün</Text>
        </View>
      </View>

      <Text style={styles.listeBaslik}>Günlük görevler</Text>

      {yukleniyor ? (
        <View style={styles.yukleniyor}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        gunSatirlari.map((satir) => {
          const tamam = kayitMap.get(satir.tarihKey);
          const t0 = new Date(satir.tarih);
          t0.setHours(0, 0, 0, 0);
          const simdiGunBasi = new Date();
          simdiGunBasi.setHours(0, 0, 0, 0);
          const gelecek = t0.getTime() > simdiGunBasi.getTime();
          const bugunMu = satir.tarihKey === yerelTarihAnahtar(new Date());

          const denetimVar = Boolean(tamam?.supervisor_approved_at);
          const denetimHakki = !gelecek && denetimVerilebilir(satir.tarihKey);
          const denetimBtnGoster = Boolean(tamam && !denetimVar && denetimHakki);

          return (
            <View
              key={satir.tarihKey}
              collapsable={false}
              style={[styles.kart, styles.kartSatir, bugunMu && styles.kartBugunArka]}
              onLayout={(e) => {
                satirYukseklikRef.current[satir.tarihKey] = e.nativeEvent.layout.y;
              }}
            >
              <View style={[styles.kartSolSerit, bugunMu && styles.kartBugunSerit]} />
              <View style={[styles.kartIc, { flex: 1 }]}>
                <View style={styles.kartUst}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.kartGun}>{satir.etiket}</Text>
                    <Text style={styles.kartSlot}>Görev sırası · {satir.slot} / 30</Text>
                  </View>
                  {tamam && vardiyaDuzenleyebilir ? (
                    <TouchableOpacity
                      style={styles.silBtn}
                      onPress={() => void sil(tamam)}
                      accessibilityLabel="Kaydı sil"
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.chipSatir}>
                  <View style={[styles.chip, tamam ? styles.chipOk : styles.chipBek]}>
                    <Text style={[styles.chipText, tamam ? styles.chipTextOk : styles.chipTextBek]}>
                      {tamam ? "Personel ✓" : "Personel bekleniyor"}
                    </Text>
                  </View>
                  <View style={[styles.chip, denetimVar ? styles.chipOk : styles.chipBek]}>
                    <Text style={[styles.chipText, denetimVar ? styles.chipTextOk : styles.chipTextBek]}>
                      {denetimVar ? "Denetim ✓" : "Denetim bekliyor"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.kartBolge}>{satir.bolge}</Text>

                {tamam ? (
                  <>
                    <View style={styles.onayKutu}>
                      <Text style={styles.onayBaslik}>PERSONEL</Text>
                      <Text style={styles.onayMetin}>
                        {temizlikPersonelOzet(tamam, profilAd(tamam.completed_by))}
                      </Text>
                    </View>
                    {denetimVar ? (
                      <View style={styles.onayKutu}>
                        <Text style={styles.onayBaslik}>DENETİM</Text>
                        <Text style={styles.onayMetin}>
                          {temizlikDenetimOzet(tamam, profilAd(tamam.supervisor_profile_id ?? "")) ?? "—"}
                        </Text>
                      </View>
                    ) : (
                      <>
                        {denetimBtnGoster ? (
                          <TouchableOpacity
                            style={[
                              styles.btnDenetim,
                              (!groupId || !isSupabaseConfigured || denetimBusyId === tamam.id) && styles.btnDisabled,
                            ]}
                            disabled={!groupId || !isSupabaseConfigured || denetimBusyId === tamam.id}
                            onPress={() => void denetimOnayla(tamam)}
                          >
                            {denetimBusyId === tamam.id ? (
                              <ActivityIndicator color={colors.primary} />
                            ) : (
                              <>
                                <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                                <Text style={styles.btnTextDenetim}>Denetimi onayla</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.denetimBekliyor}>
                            {!gelecek
                              ? denetimHakki
                                ? "Denetim için personel onayı gerekir."
                                : "Denetim: o gün vardiyada müdür veya müdür yardımcısı onaylar."
                              : ""}
                          </Text>
                        )}
                      </>
                    )}
                  </>
                ) : gelecek ? (
                  <Text style={styles.gelecekNot}>Bu tarih henüz gelmedi.</Text>
                ) : personelRolu ? (
                  <TouchableOpacity
                    style={[
                      styles.btnPersonel,
                      (!groupId || !profilId || !isSupabaseConfigured) && styles.btnDisabled,
                    ]}
                    disabled={!groupId || !profilId || !isSupabaseConfigured || kaydediyor === satir.tarihKey}
                    onPress={() =>
                      void tamamla(new Date(yil, ay0, satir.gunNo, 12, 0, 0, 0), satir.tarihKey)
                    }
                  >
                    {kaydediyor === satir.tarihKey ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="hand-left-outline" size={18} color="#fff" />
                        <Text style={styles.btnTextPersonel}>Temizliği yaptım — personel onayı</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.denetimBekliyor}>
                    Bu gün için personel onayı personel rolündeki ekip üyesi tarafından verilir.
                  </Text>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
