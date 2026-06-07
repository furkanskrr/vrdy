import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import {
  haftaBasiPazartesi,
  haftalikSatirlar,
  isoTarihGunluk,
  overrideAnahtarParcala,
} from "../data/mockSchedule";
import { vardiyaEtiket, vardiyaHucreAltMetin, vardiyaRenk } from "../lib/vardiya";
import type { ShiftKind } from "../types";
import { useSchedule, type ManualOverrides, type OverrideKey } from "../context/ScheduleContext";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { VardiyaPaylasimTablosu } from "../components/VardiyaPaylasimTablosu";
import { vardiyaTablosuPaylas } from "../lib/vardiyaPaylas";

const HAFTA_OFFSET_MIN = -52;
const HAFTA_OFFSET_MAX = 52;

/** Supabase’te migration çalışmamışsa terminalde check constraint / group_holidays hatası görülür */
const SUPABASE_SEME_UYARISI =
  "Veritabanı şeması güncel değil. Proje klasöründeki `supabase/fix_resmi_tatil_supabase.sql` dosyasının tamamını kopyalayıp Supabase Dashboard → SQL Editor’de bir kez çalıştırın (shift_overrides’a `resmi_tatil` ekler ve `group_holidays` tablosunu oluşturur). Ardından uygulamada tekrar kaydedin.";

const GUN_KISA = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];

function haftaGunISO(pzt: Date, gunIndex: number): string {
  const d = new Date(pzt);
  d.setDate(pzt.getDate() + gunIndex);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function haftaGunAyGunu(pzt: Date, gunIndex: number): number {
  const d = new Date(pzt);
  d.setDate(pzt.getDate() + gunIndex);
  return d.getDate();
}

type SecimItem = { kind: ShiftKind; baslik: string; aciklama: string };

const SECIM_VARDIYALAR: SecimItem[] = [
  { kind: "sabah", baslik: "Sabah", aciklama: "08:45 – 17:15" },
  { kind: "ogle", baslik: "Öğle", aciklama: "14:15 – 21:15" },
  { kind: "tamgun", baslik: "Tam gün", aciklama: "08:45 – 21:15" },
  { kind: "antre", baslik: "Antre", aciklama: "08:45–12:00 + 16:15–21:15" },
  { kind: "aksam", baslik: "Akşam", aciklama: "12:15 – 21:15" },
];

const SECIM_ENVANTER: SecimItem[] = [
  { kind: "envanter", baslik: "Envanter", aciklama: "Sayım günü" },
  { kind: "envanter_izni", baslik: "Envanter İzni", aciklama: "Sayım sonrası izin" },
  { kind: "envanter_full", baslik: "Envanter Fullü", aciklama: "Tam gün · 11 saat" },
];

type Picker = { tarih: string; uyeId: string; uyeAd: string };

/** Kaydedilince shift_overrides satırı silinir; şablona (boş / izin) döner */
const BEKLEYEN_SIL = "__SIL__" as const;
type BekleyenDeger = ShiftKind | typeof BEKLEYEN_SIL;
type BekleyenMap = Partial<Record<OverrideKey, BekleyenDeger>>;

function bekleyenAnahtar(tarih: string, uyeId: string): OverrideKey {
  return `${isoTarihGunluk(tarih)}__${uyeId}`;
}

function createShiftWeekStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    /** Üst bölüm ScrollView’ın üstünde kalsın (Android dokunma sırası) */
    ustChrome: { zIndex: 2, elevation: 6 },
    bosBaslik: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 16 },
    bosAlt: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
    ustBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    ustSol: { flex: 1, minWidth: 0, marginRight: 10 },
    headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    head: { fontSize: 17, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
    headHint: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: "500" },
    haftaNavRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      gap: 6,
    },
    haftaOk: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    haftaOkPressed: { opacity: 0.88 },
    haftaOkDisabled: { opacity: 0.4 },
    haftaMeta: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sub: { fontSize: 12, color: colors.text, fontWeight: "600", textAlign: "center" },
    haftaEtiket: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primary,
      marginTop: 3,
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    bekleyenBadge: {
      marginTop: 6,
      alignSelf: "flex-start",
      backgroundColor: colors.primaryMuted + "33",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    bekleyenBadgeText: { fontSize: 10, fontWeight: "700", color: colors.primary },
    readonlyBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface2,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    readonlyText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
    kaydetRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    vazgecBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    vazgecText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
    kaydetBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primary,
      minWidth: 92,
      alignItems: "center",
      justifyContent: "center",
    },
    kaydetBtnDisabled: { opacity: 0.75 },
    kaydetText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    paylasBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
      alignSelf: "flex-start",
    },
    paylasBtnPressed: { opacity: 0.88 },
    paylasBtnText: { fontSize: 13, fontWeight: "700", color: colors.primary },
    schemaCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
        },
        android: { elevation: 4 },
        default: {},
      }),
    },
    tabloScroll: { flex: 1 },
    tabloContainer: { flexGrow: 1, justifyContent: "flex-start", paddingTop: 0, paddingBottom: 0 },
    tablo: { width: "100%" },
    tableHeadSep: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface2 + "88",
    },
    headerRow: { flexDirection: "row", alignItems: "stretch", paddingVertical: 8, paddingHorizontal: 6 },
    dataRow: { flexDirection: "row", alignItems: "stretch", paddingVertical: 5, paddingHorizontal: 6 },
    dataRowCift: { backgroundColor: colors.bg },
    dataRowTek: { backgroundColor: colors.surface2 + "55" },
    isimCol: { paddingRight: 8, justifyContent: "center", paddingLeft: 4 },
    koseBaslik: {
      justifyContent: "center",
    },
    koseBaslikText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    gunlarSatir: { flex: 1, flexDirection: "row", minWidth: 0 },
    gunCol: { flex: 1, minWidth: 0, paddingHorizontal: 3 },
    gunColBaslik: { borderRadius: 10, paddingVertical: 4 },
    gunColBaslikHit: { minHeight: 50, justifyContent: "center" },
    gunColBaslikPressed: { backgroundColor: colors.primaryMuted + "22" },
    gunText: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
    gunTarih: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 2,
    },
    rtGunBadge: {
      alignSelf: "center",
      marginTop: 4,
      paddingVertical: 3,
      paddingHorizontal: 5,
      borderRadius: 6,
      backgroundColor: colors.resmiTatil + "18",
      borderWidth: 1,
      borderColor: colors.resmiTatil + "44",
    },
    rtGunBadgeText: { color: colors.resmiTatil, fontSize: 8, fontWeight: "800", textAlign: "center", lineHeight: 10 },
    isim: { color: colors.text, fontSize: 13, fontWeight: "700", letterSpacing: -0.2 },
    hucre: {
      borderRadius: 10,
      borderWidth: 1,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    hucreEmpty: {
      borderColor: colors.border,
      borderStyle: "dashed",
      backgroundColor: colors.bg,
    },
    hucreEmptyInner: { alignItems: "center", justifyContent: "center", gap: 4 },
    hucreEmptyHint: { fontSize: 9, fontWeight: "600", color: colors.textMuted, textAlign: "center" },
    hucreEmptyText: { fontSize: 13, color: colors.textMuted },
    hucreDegismis: { borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary },
    hucreIcerik: { alignItems: "center", justifyContent: "center", width: "100%" },
    hucreBaslik: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      lineHeight: 14,
    },
    hucreAlt: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 3,
      lineHeight: 12,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000000aa",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    modalScroll: { maxHeight: "90%", width: "100%" },
    modalLevha: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalBaslik: { color: colors.text, fontSize: 18, fontWeight: "800" },
    modalAlt: { color: colors.textMuted, marginTop: 4, marginBottom: 12 },
    kategoriBaslik: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 12,
      marginBottom: 6,
    },
    secimSatir: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secimSatirEnvanter: { borderColor: colors.envanter + "44" },
    secimSatirRtGun: { borderColor: colors.resmiTatil + "55", backgroundColor: colors.resmiTatil + "12" },
    secimSatirBasili: { opacity: 0.9 },
    secimSatirSil: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.danger + "14",
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.danger + "44",
    },
    secimSatirSilMetin: { flex: 1, minWidth: 0 },
    secimSatirSilBaslik: { color: colors.danger, fontWeight: "800", fontSize: 15 },
    secimSatirSilAciklama: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    secimBaslik: { color: colors.text, fontWeight: "800" },
    secimAciklama: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    iptalBtn: { marginTop: 8, paddingVertical: 12, alignItems: "center" },
    iptalText: { color: colors.primary, fontWeight: "700" },
    rtModalAciklama: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
    rtModalInput: {
      backgroundColor: colors.surface2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
      marginBottom: 12,
    },
    rtModalBtnEkle: {
      backgroundColor: colors.resmiTatil,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 8,
    },
    rtModalBtnEkleText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    rtModalBtnSil: {
      backgroundColor: colors.danger + "18",
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.danger + "44",
      marginBottom: 4,
    },
    rtModalBtnSilText: { color: colors.danger, fontWeight: "700", fontSize: 14 },
  });
}

function Hucre({
  v,
  degismis,
  onPress,
  hucreStyles,
  themeColors,
}: {
  v: ShiftKind | undefined;
  degismis?: boolean;
  onPress?: () => void;
  hucreStyles: ReturnType<typeof createShiftWeekStyles>;
  themeColors: ThemeColors;
}) {
  if (!v) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          hucreStyles.hucre,
          hucreStyles.hucreEmpty,
          { opacity: pressed && onPress ? 0.75 : 1 },
        ]}
      >
        {onPress ? (
          <View style={hucreStyles.hucreEmptyInner}>
            <Ionicons name="add-circle-outline" size={20} color={themeColors.textMuted} />
            <Text style={hucreStyles.hucreEmptyHint} numberOfLines={2}>
              Atama için dokunun
            </Text>
          </View>
        ) : (
          <Text style={hucreStyles.hucreEmptyText}>Plan dışı / boş</Text>
        )}
      </Pressable>
    );
  }

  const bg = vardiyaRenk(v, themeColors);
  const alt = vardiyaHucreAltMetin(v);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        hucreStyles.hucre,
        { backgroundColor: bg + "26", borderColor: bg, opacity: pressed ? 0.88 : 1 },
        degismis && hucreStyles.hucreDegismis,
      ]}
    >
      <View style={hucreStyles.hucreIcerik}>
        <Text
          style={[hucreStyles.hucreBaslik, { color: themeColors.text }]}
          numberOfLines={2}
          adjustsFontSizeToFit={Platform.OS === "ios"}
          minimumFontScale={0.82}
        >
          {vardiyaEtiket(v)}
        </Text>
        {alt ? (
          <Text style={hucreStyles.hucreAlt} numberOfLines={2}>
            {alt}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ShiftWeekScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createShiftWeekStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    ekip,
    izinGunu,
    overrides,
    setOverride,
    clearOverride,
    resmiTatiller,
    resmiTatilTarihleri,
    resmiTatilEkle,
    resmiTatilSil,
  } = useSchedule();
  const { user, vardiyaDuzenleyebilir } = useAuth();
  const { bildirimGonder } = useNotification();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (isFocused) {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    } else {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [isFocused]);

  const [bekleyen, setBekleyen] = useState<BekleyenMap>({});
  const [haftaOffset, setHaftaOffset] = useState(0);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [rtModalGun, setRtModalGun] = useState<string | null>(null);
  const [rtAciklama, setRtAciklama] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [paylasiliyor, setPaylasiliyor] = useState(false);
  const paylasimRef = useRef<View>(null);

  useEffect(() => {
    if (!isFocused) {
      setPicker(null);
      setRtModalGun(null);
    }
  }, [isFocused]);

  const bekleyenVar = Object.keys(bekleyen).length > 0;

  const birlesikOverrides: ManualOverrides = { ...overrides };
  for (const [k, v] of Object.entries(bekleyen)) {
    const bekleyenKey = k as OverrideKey;
    if (v === BEKLEYEN_SIL) {
      const p = overrideAnahtarParcala(bekleyenKey);
      if (p) {
        const gun = isoTarihGunluk(p.tarih);
        const mid = p.uyeId;
        for (const ok of Object.keys(birlesikOverrides)) {
          const op = overrideAnahtarParcala(ok);
          if (op && op.uyeId === mid && isoTarihGunluk(op.tarih) === gun) {
            delete birlesikOverrides[ok as OverrideKey];
          }
        }
      }
    } else if (v) {
      const p = overrideAnahtarParcala(bekleyenKey);
      const canon: OverrideKey = p ? bekleyenAnahtar(p.tarih, p.uyeId) : bekleyenKey;
      birlesikOverrides[canon] = v;
    }
  }

  const pzt = useMemo(() => {
    const b = haftaBasiPazartesi(new Date());
    b.setDate(b.getDate() + haftaOffset * 7);
    return b;
  }, [haftaOffset]);

  const satirlar = haftalikSatirlar(pzt, ekip, {
    izinGunu,
    overrides: birlesikOverrides,
    resmiTatilTarihleri,
  });
  const paz = new Date(pzt);
  paz.setDate(pzt.getDate() + 6);
  const aralik = `${pzt.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${paz.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}`;

  const haftaEtiket =
    haftaOffset === 0
      ? "Bu hafta"
      : haftaOffset === 1
        ? "Gelecek hafta"
        : haftaOffset === -1
          ? "Önceki hafta"
          : haftaOffset > 0
            ? `${haftaOffset} hafta sonra`
            : `${-haftaOffset} hafta önce`;

  const isimGenisligi = Math.round(Math.min(128, Math.max(80, width * 0.2)));
  const bekleyenSayisi = Object.keys(bekleyen).length;

  function degisiklikEkle(tarih: string, uyeId: string, shift: ShiftKind) {
    const k = bekleyenAnahtar(tarih, uyeId);
    setBekleyen((s) => ({ ...s, [k]: shift }));
    setPicker(null);
  }

  function hucreBosalt(tarih: string, uyeId: string) {
    const k = bekleyenAnahtar(tarih, uyeId);
    setBekleyen((s) => ({ ...s, [k]: BEKLEYEN_SIL }));
    setPicker(null);
  }

  async function kaydet() {
    if (kaydediliyor) return;
    setKaydediliyor(true);
    const degisimler: string[] = [];
    let hata = false;
    try {
      for (const [k, v] of Object.entries(bekleyen)) {
        const parca = overrideAnahtarParcala(k);
        if (!parca) continue;
        const { tarih, uyeId } = parca;
        const uye = ekip.find((u) => u.id === uyeId);
        if (v === BEKLEYEN_SIL) {
          const sonuc = await clearOverride(tarih, uyeId);
          if (!sonuc.ok) hata = true;
          else if (!sonuc.silindi) {
            Alert.alert(
              "Kayıtlı manuel vardiya yok",
              "Bu hücrede silinecek bir manuel atama bulunamadı. Görünen vardiya izin günü veya partner kuralından geliyorsa, kaldırmak için Ayarlar → Ekip bölümünden izin gününü veya eşleşmeyi güncellemeniz gerekir."
            );
          } else if (uye) {
            degisimler.push(`${uye.ad}: atama kaldırıldı (${tarih})`);
          }
        } else if (v) {
          const ok = await setOverride(tarih, uyeId, v);
          if (!ok) hata = true;
          else if (uye) degisimler.push(`${uye.ad}: ${vardiyaEtiket(v)} (${tarih})`);
        }
      }
      if (hata) {
        Alert.alert("Kayıt tamamlanamadı", SUPABASE_SEME_UYARISI);
        return;
      }
      setBekleyen({});
      if (degisimler.length > 0) {
        bildirimGonder(
          "vardiya",
          "Vardiya değişikliği",
          degisimler.length === 1
            ? degisimler[0]
            : `${degisimler.length} vardiya güncellendi`
        );
      }
    } catch (e) {
      if (__DEV__) console.warn("[ShiftWeek] kaydet", e);
      Alert.alert("Kayıt tamamlanamadı", "Beklenmeyen bir hata oluştu. Tekrar deneyin.");
    } finally {
      setKaydediliyor(false);
    }
  }

  function vazgec() {
    setBekleyen({});
  }

  async function paylas() {
    if (paylasiliyor || bekleyenVar) {
      if (bekleyenVar) {
        Alert.alert("Kayıt bekliyor", "Paylaşmadan önce değişiklikleri kaydedin veya vazgeçin.");
      }
      return;
    }
    setPaylasiliyor(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      await vardiyaTablosuPaylas(paylasimRef);
    } finally {
      setPaylasiliyor(false);
    }
  }

  if (ekip.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 24), alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="calendar-outline" size={56} color={colors.textMuted} />
        <Text style={styles.bosBaslik}>Ekip henüz eklenmedi</Text>
        <Text style={styles.bosAlt}>Ayarlar → Ekip sekmesinden üye ekleyin</Text>
      </View>
    );
  }

  const yatayBosluk = { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 };

  return (
    <View style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 10) }]}>
      <View style={[styles.ustChrome, yatayBosluk]}>
        <View style={styles.ustBar}>
          <View style={styles.ustSol}>
            <View style={styles.headRow}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.head}>Haftalık vardiya</Text>
                <Text style={styles.headHint}>
                  {vardiyaDuzenleyebilir
                    ? "Her kutuda vardiya adı ve saatleri yazar. Düzenlemek için kutuya; resmi tatil için gün başlığına dokunun."
                    : "Her hücrede o günkü vardiya tam adıyla gösterilir."}
                </Text>
              </View>
            </View>
            {bekleyenVar ? (
              <View style={styles.bekleyenBadge}>
                <Text style={styles.bekleyenBadgeText}>
                  {bekleyenSayisi} kayıt bekliyor — Kaydet ile onaylayın
                </Text>
              </View>
            ) : null}
            <View style={styles.haftaNavRow}>
              <Pressable
                onPress={() => setHaftaOffset((o) => Math.max(HAFTA_OFFSET_MIN, o - 1))}
                disabled={haftaOffset <= HAFTA_OFFSET_MIN}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [
                  styles.haftaOk,
                  haftaOffset <= HAFTA_OFFSET_MIN && styles.haftaOkDisabled,
                  pressed && haftaOffset > HAFTA_OFFSET_MIN && styles.haftaOkPressed,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={haftaOffset <= HAFTA_OFFSET_MIN ? colors.textMuted : colors.text}
                />
              </Pressable>
              <View style={styles.haftaMeta}>
                <Text style={styles.sub} numberOfLines={1}>
                  {aralik}
                </Text>
                <Text style={styles.haftaEtiket}>{haftaEtiket}</Text>
              </View>
              <Pressable
                onPress={() => setHaftaOffset((o) => Math.min(HAFTA_OFFSET_MAX, o + 1))}
                disabled={haftaOffset >= HAFTA_OFFSET_MAX}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [
                  styles.haftaOk,
                  haftaOffset >= HAFTA_OFFSET_MAX && styles.haftaOkDisabled,
                  pressed && haftaOffset < HAFTA_OFFSET_MAX && styles.haftaOkPressed,
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={haftaOffset >= HAFTA_OFFSET_MAX ? colors.textMuted : colors.text}
                />
              </Pressable>
            </View>
            <Pressable
              onPress={() => void paylas()}
              disabled={paylasiliyor || bekleyenVar}
              style={({ pressed }) => [
                styles.paylasBtn,
                (paylasiliyor || bekleyenVar) && { opacity: 0.5 },
                pressed && !paylasiliyor && !bekleyenVar && styles.paylasBtnPressed,
              ]}
              accessibilityLabel="Vardiyayı görüntü olarak paylaş"
            >
              {paylasiliyor ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="share-outline" size={18} color={colors.primary} />
              )}
              <Text style={styles.paylasBtnText}>Paylaş</Text>
            </Pressable>
          </View>
          {bekleyenVar ? (
            <View style={styles.kaydetRow}>
              <Pressable style={styles.vazgecBtn} onPress={vazgec}>
                <Text style={styles.vazgecText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                style={[styles.kaydetBtn, kaydediliyor && styles.kaydetBtnDisabled]}
                onPress={kaydet}
                disabled={kaydediliyor}
              >
                {kaydediliyor ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.kaydetText}>Kaydet</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        {!vardiyaDuzenleyebilir && (
          <View style={styles.readonlyBanner}>
            <Ionicons name="eye-outline" size={18} color={colors.textMuted} />
            <Text style={styles.readonlyText}>
              Düzenleme yetkisi yok. Vardiya değişiklikleri müdür veya müdür yardımcısı tarafından yapılır.
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.tabloScroll}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.tabloContainer,
          yatayBosluk,
          { paddingBottom: Math.max(insets.bottom, 8) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.schemaCard}>
          <View style={[styles.headerRow, styles.tableHeadSep]}>
            <View style={[styles.isimCol, { width: isimGenisligi }, styles.koseBaslik]}>
              <Text style={styles.koseBaslikText}>Personel</Text>
            </View>
            <View style={styles.gunlarSatir}>
              {GUN_KISA.map((g, i) => {
                const gunIso = haftaGunISO(pzt, i);
                const rtEtiket = resmiTatiller[gunIso];
                const gunNo = haftaGunAyGunu(pzt, i);
                const baslikIcerik = (
                  <>
                    <Text style={styles.gunText}>{g}</Text>
                    <Text style={styles.gunTarih}>{gunNo}</Text>
                    {rtEtiket ? (
                      <View style={styles.rtGunBadge}>
                        <Text style={styles.rtGunBadgeText}>
                          Resmi{"\n"}tatil
                        </Text>
                      </View>
                    ) : null}
                  </>
                );
                return vardiyaDuzenleyebilir ? (
                  <Pressable
                    key={g}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    onPress={() => {
                      setRtModalGun(gunIso);
                      setRtAciklama(resmiTatiller[gunIso] ?? "");
                    }}
                    style={({ pressed }) => [
                      styles.gunCol,
                      styles.gunColBaslik,
                      styles.gunColBaslikHit,
                      pressed && styles.gunColBaslikPressed,
                    ]}
                  >
                    {baslikIcerik}
                  </Pressable>
                ) : (
                  <View key={g} style={[styles.gunCol, styles.gunColBaslik, styles.gunColBaslikHit]}>
                    {baslikIcerik}
                  </View>
                );
              })}
            </View>
          </View>

          {satirlar.map(({ uye, gunler }, satirIdx) => (
            <View
              key={uye.id}
              style={[styles.dataRow, satirIdx % 2 === 0 ? styles.dataRowCift : styles.dataRowTek]}
            >
              <View style={[styles.isimCol, { width: isimGenisligi }]}>
                <Text style={styles.isim} numberOfLines={2}>
                  {uye.ad}
                </Text>
              </View>
              <View style={styles.gunlarSatir}>
                {gunler.map((v, i) => {
                  const key = haftaGunISO(pzt, i);
                  const ovKey = bekleyenAnahtar(key, uye.id);
                  const degismis = ovKey in bekleyen;
                  return (
                    <View key={i} style={styles.gunCol}>
                      <Hucre
                        v={v}
                        degismis={degismis}
                        hucreStyles={styles}
                        themeColors={colors}
                        onPress={
                          vardiyaDuzenleyebilir
                            ? () => setPicker({ tarih: key, uyeId: uye.id, uyeAd: uye.ad })
                            : undefined
                        }
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={{ position: "absolute", left: -12000, top: 0, opacity: 0 }}
        pointerEvents="none"
        collapsable={false}
      >
        <View ref={paylasimRef} collapsable={false}>
          <VardiyaPaylasimTablosu
            colors={colors}
            magazaAdi={user?.magazaAdi ?? ""}
            aralik={aralik}
            haftaEtiket={haftaEtiket}
            pzt={pzt}
            satirlar={satirlar}
            resmiTatiller={resmiTatiller}
            gunIso={(i) => haftaGunISO(pzt, i)}
            gunNo={(i) => haftaGunAyGunu(pzt, i)}
          />
        </View>
      </View>

      {picker && (
        <Pressable style={styles.overlay} onPress={() => setPicker(null)}>
          <ScrollView
            style={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingLeft: insets.left + 24, paddingRight: insets.right + 24 }}
          >
            <Pressable style={styles.modalLevha} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalBaslik}>Vardiya seç</Text>
              <Text style={styles.modalAlt}>
                {picker.uyeAd} · {picker.tarih}
              </Text>

              <Pressable
                style={({ pressed }) => [styles.secimSatirSil, pressed && styles.secimSatirBasili]}
                onPress={() => hucreBosalt(picker.tarih, picker.uyeId)}
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
                <View style={styles.secimSatirSilMetin}>
                  <Text style={styles.secimSatirSilBaslik}>Atamayı kaldır</Text>
                  <Text style={styles.secimSatirSilAciklama}>
                    Bu gün için kayıtlı manuel vardiyayı sil; hücre şablona (boş veya izin) döner
                  </Text>
                </View>
              </Pressable>

              <Text style={styles.kategoriBaslik}>Vardiyalar</Text>
              {SECIM_VARDIYALAR.map((s) => (
                <Pressable
                  key={s.kind}
                  style={({ pressed }) => [styles.secimSatir, pressed && styles.secimSatirBasili]}
                  onPress={() => degisiklikEkle(picker.tarih, picker.uyeId, s.kind)}
                >
                  <Text style={styles.secimBaslik}>{s.baslik}</Text>
                  <Text style={styles.secimAciklama}>{s.aciklama}</Text>
                </Pressable>
              ))}

              <Text style={styles.kategoriBaslik}>Diğer</Text>
              <Pressable
                style={({ pressed }) => [styles.secimSatir, pressed && styles.secimSatirBasili]}
                onPress={() => degisiklikEkle(picker.tarih, picker.uyeId, "izin")}
              >
                <Text style={styles.secimBaslik}>İzin</Text>
                <Text style={styles.secimAciklama}>Günlük izin</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.secimSatir,
                  resmiTatilTarihleri.has(isoTarihGunluk(picker.tarih)) && styles.secimSatirRtGun,
                  pressed && styles.secimSatirBasili,
                ]}
                onPress={() => degisiklikEkle(picker.tarih, picker.uyeId, "resmi_tatil")}
              >
                <Text style={styles.secimBaslik}>Resmi tatil (çalışılmıyor)</Text>
                <Text style={styles.secimAciklama}>
                  {resmiTatilTarihleri.has(isoTarihGunluk(picker.tarih))
                    ? "Bu gün resmi tatil olarak işaretli; çalışmayan personele atayın."
                    : "Önce bu günün sütun başlığına dokunup tarihi resmi tatil olarak işaretleyin."}
                </Text>
              </Pressable>

              <Text style={styles.kategoriBaslik}>Envanter</Text>
              {SECIM_ENVANTER.map((s) => (
                <Pressable
                  key={s.kind}
                  style={({ pressed }) => [styles.secimSatir, styles.secimSatirEnvanter, pressed && styles.secimSatirBasili]}
                  onPress={() => degisiklikEkle(picker.tarih, picker.uyeId, s.kind)}
                >
                  <Text style={styles.secimBaslik}>{s.baslik}</Text>
                  <Text style={styles.secimAciklama}>{s.aciklama}</Text>
                </Pressable>
              ))}

              <Pressable style={styles.iptalBtn} onPress={() => setPicker(null)}>
                <Text style={styles.iptalText}>Kapat</Text>
              </Pressable>
            </Pressable>
          </ScrollView>
        </Pressable>
      )}

      {rtModalGun ? (
        <Pressable style={styles.overlay} onPress={() => setRtModalGun(null)}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={{ paddingLeft: insets.left + 24, paddingRight: insets.right + 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable style={styles.modalLevha} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalBaslik}>Resmi tatil</Text>
              <Text style={styles.modalAlt}>
                {new Date(`${rtModalGun}T12:00:00`).toLocaleDateString("tr-TR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Text style={styles.rtModalAciklama}>
                Bu tarihte haftalık izin şablonu uygulanmaz. Çalışmayanlara hücreden «Resmi tatil (çalışılmıyor)» atayın;
                çalışanlara normal vardiya yazın.
              </Text>
              <TextInput
                style={styles.rtModalInput}
                placeholder="Kısa not (isteğe bağlı)"
                placeholderTextColor={colors.textMuted}
                value={rtAciklama}
                onChangeText={setRtAciklama}
              />
              <Pressable
                style={({ pressed }) => [styles.rtModalBtnEkle, pressed && { opacity: 0.9 }]}
                onPress={async () => {
                  const gun = rtModalGun;
                  const ok = await resmiTatilEkle(gun, rtAciklama.trim() || undefined);
                  if (!ok) {
                    Alert.alert("Resmi tatil kaydedilemedi", SUPABASE_SEME_UYARISI);
                    return;
                  }
                  setRtModalGun(null);
                  bildirimGonder("bilgi", "Resmi tatil", `${gun} işaretlendi`);
                }}
              >
                <Text style={styles.rtModalBtnEkleText}>
                  {resmiTatiller[rtModalGun] ? "Notu güncelle / kaydet" : "Bu günü resmi tatil yap"}
                </Text>
              </Pressable>
              {resmiTatiller[rtModalGun] ? (
                <Pressable
                  style={({ pressed }) => [styles.rtModalBtnSil, pressed && { opacity: 0.9 }]}
                  onPress={async () => {
                    const gun = rtModalGun;
                    const ok = await resmiTatilSil(gun);
                    if (!ok) {
                      Alert.alert("Kaldırılamadı", SUPABASE_SEME_UYARISI);
                      return;
                    }
                    setRtModalGun(null);
                    bildirimGonder("bilgi", "Resmi tatil", "İşaret kaldırıldı");
                  }}
                >
                  <Text style={styles.rtModalBtnSilText}>Resmi tatil işaretini kaldır</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.iptalBtn} onPress={() => setRtModalGun(null)}>
                <Text style={styles.iptalText}>Kapat</Text>
              </Pressable>
            </Pressable>
          </ScrollView>
        </Pressable>
      ) : null}
    </View>
  );
}
