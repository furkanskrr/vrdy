import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { RolRozeti } from "../components/RolRozeti";
import { ChatShortcutsModal } from "../components/ChatShortcutsModal";
import { GroupChatAttachmentBubble } from "../components/GroupChatAttachmentBubble";
import { KritikOnayModal, MesajEylemAltSayfa } from "../components/GroupChatOverlays";
import {
  ataKayitParse,
  atamaListeKomutuParse,
  eslesenKisayolBul,
  kisayolKaydet,
  kisayolListeMetniOlustur,
  kisayolSil,
  kisayolTetikYanitMetni,
  kisayollariYukle,
  type SohbetKisayolu,
} from "../lib/chatShortcuts";
import { grupMesajiGonder } from "../lib/groupChatSend";
import { sohbetEkiYukle, type SohbetEkTaslak } from "../lib/groupChatMedia";
import { sohbetDosyaSec, sohbetFotoSec } from "../lib/sohbetMedyaSec";
import { useDelight } from "../context/DelightContext";
import { useTheme } from "../context/ThemeContext";
import { playDelightFeedback } from "../lib/delight/feedback";
import { useAuth } from "../context/AuthContext";
import { useSohbetOkunmamis } from "../context/SohbetOkunmamisContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useComposerKeyboardInset } from "../hooks/useComposerKeyboardInset";
import { altSekmeEkranBoslugu, ustEkranBoslugu } from "../lib/safeArea";
import type { GrupMesaji, GrupMesajiYanitOzet, TeamRole } from "../types";

function uyeRolParse(r: unknown): TeamRole {
  if (r === "mudur" || r === "yardimci" || r === "personel") return r;
  return "personel";
}

const MESAJ_UZUNLUK_MAX = 2000;
const SAYFA_LIMIT = 120;
/**
 * Yalnızca sunucu/istemci saat kayması (birkaç saniye).
 * Geriye doğru uzun tolerans OLMAMALI: aksi halde mesajdan önce sohbeti açan da «gördü» sayılıyordu.
 */
const OKUMA_SAAT_KAYMA_MS = 4_000;
/** Aynı oturumda okuma kaydı spam’ini önler; zorla çağrılarda atlanır */
const OKUMA_GUNCELLE_MIN_MS = 350;
const R_BUYUK = 18;
const R_KUCUK = 6;
/** Karşı taraf mesajlarında avatar + hizalama boşluğu (sabit genişlik) */
const AVATAR_KOL_GENISLIK = 36;
/** Uzun metinlerde satır kırılımı; kısa mesajda balon metne göre daralır */
const BALON_MAX_GENISLIK = 300;

type ChatListItem =
  | { type: "date"; id: string; label: string }
  | {
      type: "msg";
      id: string;
      message: GrupMesaji;
      mine: boolean;
      showAvatar: boolean;
      showName: boolean;
      clusterTop: boolean;
      clusterBottom: boolean;
    };

type SabitOge = { pinId: string; messageId: string; ozet: GrupMesajiYanitOzet };

function sabitTabloYokMesaji(msg: string): boolean {
  return (
    msg.includes("group_pinned_messages") ||
    msg.includes("does not exist") ||
    msg.includes("Could not find the table") ||
    msg.includes("schema cache")
  );
}

type OnayDurum =
  | { tur: "sabitle"; mesajId: string }
  | { tur: "kaldir"; pinId: string; mesajId: string };

function ayniGun(aIso: string, bIso: string): boolean {
  try {
    const a = new Date(aIso);
    const b = new Date(bIso);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  } catch {
    return false;
  }
}

function tarihEtiketi(iso: string): string {
  try {
    const d = new Date(iso);
    const bugun = new Date();
    const dun = new Date(bugun);
    dun.setDate(dun.getDate() - 1);
    const sade = (x: Date) =>
      x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
    if (sade(bugun)) return "Bugün";
    if (sade(dun)) return "Dün";
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== bugun.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

function saatKisa(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function mesajUyeIcinOkunmusMu(
  mesajOlusturulma: string,
  lastReadIso: string | undefined
): boolean {
  if (!lastReadIso) return false;
  const msgMs = new Date(mesajOlusturulma).getTime();
  const readMs = new Date(lastReadIso).getTime();
  if (Number.isNaN(msgMs) || Number.isNaN(readMs)) return false;
  return readMs >= msgMs - OKUMA_SAAT_KAYMA_MS;
}

function tumDigerleriGordu(
  mesajOlusturulma: string,
  digerUyeler: string[],
  okumalar: Record<string, string | undefined>
): boolean {
  if (digerUyeler.length === 0) return false;
  for (const pid of digerUyeler) {
    if (!mesajUyeIcinOkunmusMu(mesajOlusturulma, okumalar[pid])) return false;
  }
  return true;
}

function mesajiGorenUyeIdleri(
  mesajOlusturulma: string,
  digerUyeler: string[],
  okumalar: Record<string, string | undefined>
): string[] {
  return digerUyeler.filter((pid) => mesajUyeIcinOkunmusMu(mesajOlusturulma, okumalar[pid]));
}

function avatarRenk(ad: string, c: ThemeColors): string {
  let h = 0;
  for (let i = 0; i < ad.length; i++) h = ad.charCodeAt(i) + ((h << 5) - h);
  const hues = [c.primary, c.morning, c.fullday, c.afternoon, c.aksam];
  return hues[Math.abs(h) % hues.length];
}

function basHarfler(ad: string): string {
  const p = ad.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  if (p.length === 1 && p[0].length > 0) return p[0].slice(0, 2).toUpperCase();
  return "?";
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const chatBg = isDark ? "#0b0f14" : "#e4eaf2";
  const bubbleShadow = isDark
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
        elevation: 3,
      }
    : {
        shadowColor: "#1e293b",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      };

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerSatir: { flexDirection: "row", alignItems: "center", gap: 12 },
    headerIkonWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primaryMuted + (isDark ? "55" : "33"),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primary + "44",
    },
    headerMetin: { flex: 1, minWidth: 0 },
    baslik: { fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
    alt: { fontSize: 12, color: colors.textMuted, marginTop: 3, fontWeight: "500" },
    headerKimlik: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
    headerKimlikAd: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    mainColumn: { flex: 1, position: "relative" },
    chatPane: { flex: 1, backgroundColor: chatBg },
    listWrap: { flex: 1 },
    listContent: { paddingTop: 6, paddingBottom: 8, flexGrow: 1 },
    composerDock: {
      paddingHorizontal: 12,
      paddingTop: 6,
      backgroundColor: isDark ? colors.bg : chatBg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    composerPill: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 6,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surface : "#ffffff",
      paddingLeft: 14,
      paddingRight: 5,
      paddingVertical: 5,
      overflow: "hidden",
      alignSelf: "stretch",
    },

    dateRow: { alignItems: "center", marginVertical: 8 },
    datePill: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: isDark ? colors.surface2 : colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    datePillText: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.2 },

    msgRow: { flexDirection: "row", paddingHorizontal: 10, marginBottom: 1 },
    msgRowClusterBas: { marginTop: 4 },
    msgRowMine: { justifyContent: "flex-end" },
    msgRowOther: { justifyContent: "flex-start", alignItems: "flex-start" },
    avatarKolon: {
      width: AVATAR_KOL_GENISLIK,
      marginRight: 6,
      alignItems: "center",
      flexShrink: 0,
    },
    avatarHizala: {},
    avatarHizalaIsimli: { marginTop: 20 },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarTxt: { fontSize: 10, fontWeight: "800", color: "#fff" },
    bubbleCol: { minWidth: 0 },
    bubbleColOther: { alignSelf: "flex-start", alignItems: "flex-start", flexShrink: 1, maxWidth: "88%" },
    bubbleColMine: { alignSelf: "flex-end", alignItems: "flex-end", flexShrink: 1, maxWidth: "88%" },
    gonderAd: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.primary,
      marginBottom: 2,
      marginLeft: 2,
    },
    bubble: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      paddingBottom: 6,
      alignSelf: "flex-start",
      maxWidth: BALON_MAX_GENISLIK,
    },
    bubbleMine: {
      backgroundColor: colors.primary,
      alignSelf: "flex-end",
    },
    bubbleOther: {
      backgroundColor: isDark ? colors.surface : "#ffffff",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? colors.border : "rgba(45, 58, 71, 0.12)",
      alignSelf: "flex-start",
    },
    body: { fontSize: 14, color: colors.text, lineHeight: 19 },
    bodyMine: { color: "#fff" },
    bodySatir: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-end",
      columnGap: 6,
      rowGap: 2,
    },
    bodyMetin: { flexShrink: 1 },
    zaman: { fontSize: 10, fontWeight: "600", lineHeight: 14, marginBottom: 1 },
    zamanMine: { color: "rgba(255,255,255,0.78)" },
    zamanOther: { color: colors.textMuted },
    okumaOzeti: {
      alignSelf: "flex-end",
      maxWidth: "100%",
      marginTop: 2,
      marginRight: 1,
    },
    okumaIsimleri: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "right",
      lineHeight: 14,
    },
    ciftTik: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-end",
      gap: 0,
    },
    ciftTikIkinci: { marginLeft: -7 },

    bos: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 28,
      minHeight: 220,
    },
    bosKart: {
      alignItems: "center",
      padding: 28,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 320,
      width: "100%",
      ...bubbleShadow,
    },
    bosIkon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: colors.primaryMuted + "44",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    bosBaslik: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center" },
    bosText: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: 8, lineHeight: 20 },

    yukleKart: {
      marginHorizontal: 16,
      marginTop: 24,
      padding: 24,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: "center",
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    yukleText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },

    input: {
      flex: 1,
      minHeight: 22,
      maxHeight: 96,
      paddingVertical: Platform.OS === "ios" ? 6 : 4,
      paddingHorizontal: 0,
      fontSize: 15,
      color: colors.text,
      lineHeight: 20,
    },
    gonderBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    gonderBtnDisabled: {
      opacity: 0.35,
      backgroundColor: colors.border,
    },
    composerAksiyonlar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginRight: 4,
    },
    ekBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    ekOnizleme: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    ekOnizlemeGorsel: { width: 48, height: 48, borderRadius: 8 },
    ekOnizlemeAd: { flex: 1, fontSize: 12, color: colors.textMuted },
    sayacSatir: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginTop: 2,
      paddingHorizontal: 4,
    },
    sayac: {
      fontSize: 11,
      fontVariant: ["tabular-nums"],
      color: colors.textMuted,
      letterSpacing: 0.2,
    },
    sayacUyari: {
      color: colors.afternoon,
      fontWeight: "600",
    },
    hata: {
      color: colors.danger,
      fontSize: 11,
      paddingHorizontal: 4,
      paddingBottom: 4,
      fontWeight: "600",
    },

    ustAksiyonlar: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto" },
    ustBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    ustBtnAktif: {
      backgroundColor: colors.primaryMuted + "44",
      borderColor: colors.primary + "55",
    },
    sabitBolum: { marginHorizontal: 10, marginTop: 6, marginBottom: 2 },
    sabitKart: {
      flexDirection: "row",
      alignItems: "stretch",
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      ...bubbleShadow,
    },
    sabitSolCizgi: {
      width: 4,
      backgroundColor: colors.primary,
    },
    sabitIc: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minWidth: 0,
    },
    sabitPinWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.primaryMuted + "44",
      alignItems: "center",
      justifyContent: "center",
    },
    sabitMetinBlok: { flex: 1, minWidth: 0 },
    sabitBaslikSatir: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
    sabitBaslik: { fontSize: 11, fontWeight: "800", color: colors.primary, letterSpacing: 0.4 },
    sabitSira: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    sabitGovde: { fontSize: 13, color: colors.text, lineHeight: 18 },
    sabitGonderen: { fontWeight: "800", color: colors.text },
    sabitKaldir: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      justifyContent: "center",
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.border,
    },
    sabitKaldirText: { fontSize: 12, fontWeight: "800", color: colors.afternoon },
    sabitMsgBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 4,
      opacity: 0.92,
    },
    sabitMsgBadgeTxt: { fontSize: 10, fontWeight: "700", color: colors.primary },
    sabitMsgBadgeTxtMine: { color: "rgba(255,255,255,0.9)" },
    alintiKutu: {
      borderLeftWidth: 3,
      borderLeftColor: "rgba(255,255,255,0.45)",
      paddingLeft: 8,
      marginBottom: 4,
      opacity: 0.95,
    },
    alintiKutuOther: {
      borderLeftColor: colors.primary,
      opacity: 1,
    },
    alintiAd: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
    alintiAdMine: { color: "rgba(255,255,255,0.92)" },
    alintiAdOther: { color: colors.textMuted },
    alintiBody: { fontSize: 12, lineHeight: 16 },
    alintiBodyMine: { color: "rgba(255,255,255,0.88)" },
    alintiBodyOther: { color: colors.textMuted },
    yanitBant: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: isDark ? colors.surface2 : "#f1f5f9",
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      alignSelf: "stretch",
    },
    yanitBantMetin: { flex: 1, minWidth: 0 },
    yanitBantBaslik: { fontSize: 10, fontWeight: "800", color: colors.primary },
    yanitBantOz: { fontSize: 12, color: colors.textMuted, marginTop: 1, lineHeight: 16 },
    yanitBantKapat: { padding: 4 },
  });
}

function alintiOzetKisalt(body: string, max = 120): string {
  const t = body.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function mesajYanitEbeveynleriniTamamla(gid: string, liste: GrupMesaji[]): Promise<GrupMesaji[]> {
  const tamById = new Map(liste.map((m) => [m.id, m]));
  const eksikIds = new Set<string>();
  for (const m of liste) {
    if (m.reply_to_id && !tamById.get(m.reply_to_id)) eksikIds.add(m.reply_to_id);
  }
  const ozetById = new Map<string, GrupMesajiYanitOzet>();
  if (eksikIds.size > 0) {
    const { data, error } = await supabase
      .from("group_messages")
      .select("id, sender_ad, body, created_at")
      .eq("group_id", gid)
      .in("id", [...eksikIds]);
    if (!error && data) {
      for (const row of data as GrupMesajiYanitOzet[]) ozetById.set(row.id, row);
    }
  }
  return liste.map((m) => {
    if (!m.reply_to_id) return m;
    const ic = tamById.get(m.reply_to_id);
    if (ic) {
      return {
        ...m,
        reply_parent: {
          id: ic.id,
          sender_ad: ic.sender_ad,
          body: ic.body,
          created_at: ic.created_at,
        },
      };
    }
    const dis = ozetById.get(m.reply_to_id);
    return dis ? { ...m, reply_parent: dis } : m;
  });
}

function mesajlariListeOgesine(chron: GrupMesaji[], uid: string | null): ChatListItem[] {
  const out: ChatListItem[] = [];
  for (let j = 0; j < chron.length; j++) {
    const m = chron[j];
    const prev = chron[j - 1];
    const next = chron[j + 1];
    if (j === 0 || !prev || !ayniGun(prev.created_at, m.created_at)) {
      out.push({ type: "date", id: `date-${m.id}`, label: tarihEtiketi(m.created_at) });
    }
    const mine = m.profile_id === uid;
    const showName = !mine && (!prev || !ayniGun(prev.created_at, m.created_at) || prev.profile_id !== m.profile_id);
    const showAvatar =
      !mine && (!prev || !ayniGun(prev.created_at, m.created_at) || prev.profile_id !== m.profile_id);
    const clusterTop = !prev || !ayniGun(prev.created_at, m.created_at) || prev.profile_id !== m.profile_id;
    const clusterBottom = !next || !ayniGun(next.created_at, m.created_at) || next.profile_id !== m.profile_id;
    out.push({
      type: "msg",
      id: m.id,
      message: m,
      mine,
      showAvatar,
      showName,
      clusterTop,
      clusterBottom,
    });
  }
  return out;
}

function bubbleRadius(mine: boolean, top: boolean, bottom: boolean) {
  if (mine) {
    return {
      borderTopLeftRadius: R_BUYUK,
      borderTopRightRadius: top ? R_BUYUK : R_KUCUK,
      borderBottomLeftRadius: R_BUYUK,
      borderBottomRightRadius: bottom ? R_BUYUK : R_KUCUK,
    };
  }
  return {
    borderTopLeftRadius: top ? R_BUYUK : R_KUCUK,
    borderTopRightRadius: R_BUYUK,
    borderBottomLeftRadius: bottom ? R_BUYUK : R_KUCUK,
    borderBottomRightRadius: R_BUYUK,
  };
}

const isWeb = Platform.OS === "web";

export function GroupChatScreen() {
  const insets = useSafeAreaInsets();
  const klavyeInset = useComposerKeyboardInset();
  const { colors, isDark } = useTheme();
  const delight = useDelight();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user, session } = useAuth();
  const { sohbetEkraniOdaktaAyarla, okunmamisYenile, sohbetSessiz, sohbetSessizAyarla } =
    useSohbetOkunmamis();
  const groupId = user?.groupId ?? null;
  const uidHook = session?.user?.id ?? null;
  const [benimProfilId, setBenimProfilId] = useState<string | null>(null);

  const [mesajlar, setMesajlar] = useState<GrupMesaji[]>([]);
  const [digerUyeler, setDigerUyeler] = useState<string[]>([]);
  const [uyeAdlari, setUyeAdlari] = useState<Record<string, string>>({});
  const [uyeRolleri, setUyeRolleri] = useState<Record<string, TeamRole>>({});
  const [okumalar, setOkumalar] = useState<Record<string, string>>({});
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [taslak, setTaslak] = useState("");
  const [bekleyenEk, setBekleyenEk] = useState<SohbetEkTaslak | null>(null);
  const [kisayollar, setKisayollar] = useState<SohbetKisayolu[]>([]);
  const [kisayolModal, setKisayolModal] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [okumaDestegi, setOkumaDestegi] = useState(true);
  const [yanitHedef, setYanitHedef] = useState<GrupMesaji | null>(null);
  const [sabitler, setSabitler] = useState<SabitOge[]>([]);
  /** 0 = en son sabitlenen (en yeni); artan = daha eski */
  const [sabitGosterimSirasi, setSabitGosterimSirasi] = useState(0);
  const [eylemMesaji, setEylemMesaji] = useState<GrupMesaji | null>(null);
  const [onay, setOnay] = useState<OnayDurum | null>(null);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const composerInputRef = useRef<TextInput>(null);
  const ilkScroll = useRef(true);
  const webBasiliTutZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sonOkumaGonderim = useRef(0);
  const sohbetOdaktaRef = useRef(false);
  const enSonMesajZamaniRef = useRef<string | null>(null);

  const uyelerVeOkumalariYukle = useCallback(async (gid: string, benimId: string | null) => {
    const uyeRes = await supabase.from("group_members").select("profile_id, ad, rol").eq("group_id", gid);
    const satirlar = (uyeRes.data ?? []) as { profile_id: string; ad: string; rol?: string }[];
    const adlar: Record<string, string> = {};
    const roller: Record<string, TeamRole> = {};
    for (const r of satirlar) {
      if (r.profile_id) {
        adlar[r.profile_id] = String(r.ad ?? "").trim() || "Üye";
        roller[r.profile_id] = uyeRolParse(r.rol);
      }
    }
    setUyeAdlari(adlar);
    setUyeRolleri(roller);
    const uyeler = satirlar.map((r) => r.profile_id).filter((p: string) => p && p !== benimId);
    setDigerUyeler(uyeler);

    const readRes = await supabase.from("group_chat_reads").select("profile_id, last_read_at").eq("group_id", gid);
    if (readRes.error) {
      const msg = readRes.error.message ?? "";
      if (
        msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("Could not find the table")
      ) {
        setOkumaDestegi(false);
        setOkumalar({});
      } else if (__DEV__) console.warn("[sohbet] okumalar:", msg);
      return;
    }
    setOkumaDestegi(true);
    const m: Record<string, string> = {};
    for (const row of readRes.data as { profile_id: string; last_read_at: string }[]) {
      m[row.profile_id] = row.last_read_at;
    }
    setOkumalar(m);
  }, []);

  const sabitleriYukle = useCallback(async (gid: string) => {
    const pinMulti = await supabase
      .from("group_pinned_messages")
      .select("id, message_id")
      .eq("group_id", gid)
      .order("pinned_at", { ascending: false });

    if (pinMulti.error) {
      const msg = pinMulti.error.message ?? "";
      const tabloYok =
        msg.includes("group_pinned_messages") ||
        msg.includes("does not exist") ||
        msg.includes("Could not find the table") ||
        msg.includes("schema cache");
      if (!tabloYok) {
        if (__DEV__) console.warn("[sohbet] sabitler:", msg);
        else Alert.alert("Sabit duyurular", msg);
      }
      if (tabloYok) {
        const pinRes = await supabase.from("groups").select("pinned_message_id").eq("id", gid).maybeSingle();
        if (!pinRes.error && pinRes.data) {
          const pid = (pinRes.data as { pinned_message_id?: string | null }).pinned_message_id ?? null;
          if (pid) {
            const pinMsg = await supabase
              .from("group_messages")
              .select("id, sender_ad, body, created_at")
              .eq("id", pid)
              .eq("group_id", gid)
              .maybeSingle();
            if (!pinMsg.error && pinMsg.data) {
              setSabitler([
                {
                  pinId: "legacy",
                  messageId: pid,
                  ozet: pinMsg.data as GrupMesajiYanitOzet,
                },
              ]);
              return;
            }
          }
        }
        setSabitler([]);
        return;
      }
      setSabitler([]);
      return;
    }

    const satirlar = (pinMulti.data ?? []) as { id: string; message_id: string }[];
    /** Çoklu tablo boşsa sabit yok; eski groups.pinned_message_id yedek göstermesin (kaldırınca diğer cihazlarda hayalet sabit) */
    if (satirlar.length === 0) {
      setSabitler([]);
      return;
    }
    const ids = [...new Set(satirlar.map((r) => r.message_id))];
    const msgs = await supabase
      .from("group_messages")
      .select("id, sender_ad, body, created_at")
      .eq("group_id", gid)
      .in("id", ids);
    if (msgs.error) {
      setSabitler([]);
      return;
    }
    const byId = new Map((msgs.data as GrupMesajiYanitOzet[]).map((m) => [m.id, m]));
    const list: SabitOge[] = [];
    for (const row of satirlar) {
      const oz = byId.get(row.message_id);
      if (oz) list.push({ pinId: row.id, messageId: row.message_id, ozet: oz });
    }
    setSabitler(list);
  }, []);

  const yukle = useCallback(async () => {
    if (!isSupabaseConfigured || !groupId) {
      setYukleniyor(false);
      setMesajlar([]);
      setDigerUyeler([]);
      setUyeAdlari({});
      setUyeRolleri({});
      setOkumalar({});
      return;
    }

    setHata(null);

    const msgRes = await supabase
      .from("group_messages")
      .select(
        "id, group_id, profile_id, sender_ad, body, created_at, reply_to_id, attachment_type, attachment_path, attachment_name, attachment_mime"
      )
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(SAYFA_LIMIT);

    if (msgRes.error) {
      if (__DEV__) console.warn("[sohbet] yükleme:", msgRes.error.message);
      const msg = msgRes.error.message ?? "";
      const sutunYok =
        msg.includes("reply_to_id") && (msg.includes("column") || msg.includes("schema cache"));
      if (sutunYok) {
        const eski = await supabase
          .from("group_messages")
          .select("id, group_id, profile_id, sender_ad, body, created_at")
          .eq("group_id", groupId)
          .order("created_at", { ascending: false })
          .limit(SAYFA_LIMIT);
        if (eski.error) {
          setHata(
            eski.error.message.includes("does not exist")
              ? "Sohbet tablosu yok: Supabase’te group_messages.sql çalıştırın."
              : eski.error.message
          );
          setMesajlar([]);
          setYukleniyor(false);
          return;
        }
        setMesajlar((eski.data as GrupMesaji[]) ?? []);
      } else {
        setHata(
          msg.includes("does not exist")
            ? "Sohbet tablosu yok: Supabase’te group_messages.sql çalıştırın."
            : msg
        );
        setMesajlar([]);
        setYukleniyor(false);
        return;
      }
    } else {
      const ham = (msgRes.data as GrupMesaji[]) ?? [];
      const bagli = await mesajYanitEbeveynleriniTamamla(groupId, ham);
      setMesajlar(bagli);
    }

    await sabitleriYukle(groupId);

    setYukleniyor(false);

    const { data: sess } = await supabase.auth.getSession();
    const benimId = sess.session?.user?.id ?? uidHook;
    if (benimId) setBenimProfilId(benimId);
    void uyelerVeOkumalariYukle(groupId, benimId);
  }, [groupId, uidHook, uyelerVeOkumalariYukle, sabitleriYukle]);

  const kisayollariTazele = useCallback(async () => {
    if (!groupId) {
      setKisayollar([]);
      return;
    }
    const liste = await kisayollariYukle(groupId);
    setKisayollar(liste);
  }, [groupId]);

  useEffect(() => {
    void kisayollariTazele();
  }, [kisayollariTazele]);

  const okumalariSunucudanCek = useCallback(async (gid: string) => {
    const readRes = await supabase.from("group_chat_reads").select("profile_id, last_read_at").eq("group_id", gid);
    if (readRes.error) return;
    const m: Record<string, string> = {};
    for (const row of readRes.data as { profile_id: string; last_read_at: string }[]) {
      m[row.profile_id] = row.last_read_at;
    }
    setOkumalar(m);
  }, []);

  const sonOkumayiGuncelle = useCallback(
    async (opts?: { zorla?: boolean }) => {
      if (!isSupabaseConfigured || !groupId || !okumaDestegi) return;
      const zorla = opts?.zorla === true;
      const now = Date.now();
      if (!zorla && now - sonOkumaGonderim.current < OKUMA_GUNCELLE_MIN_MS) return;
      sonOkumaGonderim.current = now;

      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;

      let okumaIso = new Date().toISOString();
      const enSon = enSonMesajZamaniRef.current;
      if (enSon) {
        const msgMs = new Date(enSon).getTime();
        if (!Number.isNaN(msgMs)) {
          okumaIso = new Date(Math.max(Date.now(), msgMs + 500)).toISOString();
        }
      }

      const { error } = await supabase.from("group_chat_reads").upsert(
        { group_id: groupId, profile_id: uid, last_read_at: okumaIso },
        { onConflict: "group_id,profile_id" }
      );
      if (error) {
        const msg = error.message ?? "";
        if (
          msg.includes("does not exist") ||
          msg.includes("group_chat_reads") ||
          msg.includes("Could not find the table")
        ) {
          setOkumaDestegi(false);
        } else if (__DEV__) console.warn("[sohbet] okuma güncelle:", msg);
        return;
      }
      setOkumalar((prev) => ({ ...prev, [uid]: okumaIso }));
    },
    [groupId, okumaDestegi]
  );

  const gorulduOlarakIsaretle = useCallback(() => {
    sonOkumaGonderim.current = 0;
    void sonOkumayiGuncelle({ zorla: true });
  }, [sonOkumayiGuncelle]);

  const yenile = useCallback(async () => {
    if (!groupId || yukleniyor) return;
    setYenileniyor(true);
    await yukle();
    setYenileniyor(false);
  }, [groupId, yukle, yukleniyor]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  useEffect(() => {
    setSabitGosterimSirasi(0);
  }, [sabitler[0]?.pinId]);

  useEffect(() => {
    setSabitGosterimSirasi((prev) => {
      if (sabitler.length === 0) return 0;
      return Math.min(prev, sabitler.length - 1);
    });
  }, [sabitler.length]);

  useEffect(() => {
    setBenimProfilId(session?.user?.id ?? null);
  }, [session?.user?.id]);

  useEffect(() => {
    ilkScroll.current = true;
    setOkumaDestegi(true);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      sohbetEkraniOdaktaAyarla(true);
      sohbetOdaktaRef.current = true;
      gorulduOlarakIsaretle();
      void okunmamisYenile();
      return () => {
        sohbetOdaktaRef.current = false;
        sohbetEkraniOdaktaAyarla(false);
        gorulduOlarakIsaretle();
        void okunmamisYenile();
      };
    }, [sohbetEkraniOdaktaAyarla, gorulduOlarakIsaretle, okunmamisYenile])
  );

  useEffect(() => {
    enSonMesajZamaniRef.current = mesajlar[0]?.created_at ?? null;
  }, [mesajlar]);

  useEffect(() => {
    if (!groupId || !okumaDestegi || yukleniyor) return;
    if (!sohbetOdaktaRef.current || mesajlar.length === 0) return;
    gorulduOlarakIsaretle();
  }, [groupId, okumaDestegi, yukleniyor, mesajlar.length, mesajlar[0]?.id, gorulduOlarakIsaretle]);

  useEffect(() => {
    if (!groupId || !okumaDestegi) return;
    const t = setInterval(() => {
      if (!sohbetOdaktaRef.current) return;
      void okumalariSunucudanCek(groupId);
    }, 2500);
    return () => clearInterval(t);
  }, [groupId, okumaDestegi, okumalariSunucudanCek]);

  useEffect(() => {
    if (!isSupabaseConfigured || !groupId) return;

    const ch = supabase
      .channel(`grup-sohbet-msg:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const row = payload.new as GrupMesaji;
          if (!row?.id) return;
          const benimId = benimProfilId ?? uidHook;
          if (row.profile_id !== benimId && sohbetOdaktaRef.current) {
            gorulduOlarakIsaretle();
          }
          setMesajlar((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            let enriched: GrupMesaji = { ...row };
            if (row.reply_to_id) {
              const parent = prev.find((p) => p.id === row.reply_to_id);
              if (parent) {
                enriched = {
                  ...enriched,
                  reply_parent: {
                    id: parent.id,
                    sender_ad: parent.sender_ad,
                    body: parent.body,
                    created_at: parent.created_at,
                  },
                };
              }
            }
            const next = [enriched, ...prev];
            if (row.reply_to_id && !enriched.reply_parent) {
              void (async () => {
                const { data } = await supabase
                  .from("group_messages")
                  .select("id, sender_ad, body, created_at")
                  .eq("id", row.reply_to_id!)
                  .eq("group_id", groupId)
                  .maybeSingle();
                if (data) {
                  const oz = data as GrupMesajiYanitOzet;
                  setMesajlar((p2) =>
                    p2.map((x) => (x.id === row.id ? { ...x, reply_parent: oz } : x))
                  );
                }
              })();
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [groupId, benimProfilId, uidHook, gorulduOlarakIsaretle]);

  useEffect(() => {
    if (!isSupabaseConfigured || !groupId) return;

    const ch = supabase
      .channel(`grup-sohbet-pins:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_pinned_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void sabitleriYukle(groupId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "groups",
          filter: `id=eq.${groupId}`,
        },
        (payload) => {
          const eski = (payload.old as { pinned_message_id?: string | null } | undefined)?.pinned_message_id;
          const yeni = (payload.new as { pinned_message_id?: string | null } | undefined)?.pinned_message_id;
          if (eski !== yeni) void sabitleriYukle(groupId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [groupId, sabitleriYukle]);

  useEffect(() => {
    if (!isSupabaseConfigured || !groupId || !okumaDestegi) return;

    const ch = supabase
      .channel(`grup-sohbet-okuma:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_chat_reads",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const n = (payload.new ?? payload.old) as { profile_id?: string; last_read_at?: string } | null;
          const pid = n?.profile_id;
          const ts = n?.last_read_at;
          if (pid && ts) {
            setOkumalar((prev) => ({ ...prev, [pid]: ts }));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [groupId, okumaDestegi]);

  const uidForListe = benimProfilId ?? uidHook;
  const chronological = useMemo(() => [...mesajlar].reverse(), [mesajlar]);
  const listData = useMemo(() => mesajlariListeOgesine(chronological, uidForListe), [chronological, uidForListe]);

  const mesajaKaydir = useCallback(
    (mid: string) => {
      const ix = listData.findIndex((i) => i.type === "msg" && i.message.id === mid);
      if (ix < 0) {
        Alert.alert("Mesaj", "Bu mesaj yüklü listede yok (çok eski olabilir). Aşağı kaydırıp yenileyin.");
        return;
      }
      try {
        listRef.current?.scrollToIndex({ index: ix, animated: true, viewPosition: 0.35 });
      } catch {
        /* scrollToIndex bazen tahmin layout gerektirir */
      }
    },
    [listData]
  );

  const sabitleLegacyTemizle = useCallback(async () => {
    if (!groupId) return;
    await supabase.from("groups").update({ pinned_message_id: null }).eq("id", groupId);
  }, [groupId]);

  const sabitleLegacyGuncelle = useCallback(
    async (mesajId: string) => {
      if (!groupId) return false;
      const { error } = await supabase
        .from("groups")
        .update({ pinned_message_id: mesajId })
        .eq("id", groupId);
      if (error) {
        Alert.alert("Sabitleme", error.message);
        return false;
      }
      await sabitleriYukle(groupId);
      return true;
    },
    [groupId, sabitleriYukle]
  );

  const sabitleEkleUygula = useCallback(
    async (mesajId: string) => {
      if (!groupId) return;
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) {
        Alert.alert("Sabitleme", "Oturum bulunamadı. Yeniden giriş yapın.");
        return;
      }
      const { error } = await supabase.from("group_pinned_messages").insert({
        group_id: groupId,
        message_id: mesajId,
        pinned_by: uid,
      });
      if (error) {
        const m = error.message ?? "";
        if (m.toLowerCase().includes("unique") || m.includes("duplicate")) {
          Alert.alert("Zaten sabitli", "Bu mesaj duyurularda zaten var.");
          return;
        }
        if (sabitTabloYokMesaji(m)) {
          await sabitleLegacyGuncelle(mesajId);
          return;
        }
        Alert.alert(
          "Sabitleme",
          `${m}\n\nSupabase SQL Editor'de group_pinned_messages.sql dosyasını bir kez çalıştırın.`
        );
        return;
      }
      await sabitleLegacyTemizle();
      await sabitleriYukle(groupId);
    },
    [groupId, sabitleriYukle, sabitleLegacyGuncelle, sabitleLegacyTemizle]
  );

  const sabitleKaldirUygula = useCallback(
    async (pinId: string, mesajId?: string) => {
      if (!groupId) return;
      if (pinId !== "legacy") {
        const { error } = await supabase
          .from("group_pinned_messages")
          .delete()
          .eq("id", pinId)
          .eq("group_id", groupId);
        if (error) {
          Alert.alert("Sabitleme", error.message);
          return;
        }
      }
      const { error: legacyErr } = await supabase
        .from("groups")
        .update({ pinned_message_id: null })
        .eq("id", groupId);
      if (legacyErr) {
        Alert.alert("Sabitleme", legacyErr.message);
        return;
      }
      setSabitler((prev) =>
        prev.filter((s) => s.pinId !== pinId && (mesajId == null || s.messageId !== mesajId))
      );
      await sabitleriYukle(groupId);
    },
    [groupId, sabitleriYukle]
  );

  const sabitMesajIdleri = useMemo(() => new Set(sabitler.map((s) => s.messageId)), [sabitler]);

  useEffect(() => {
    if (yukleniyor || listData.length === 0) return;
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: !ilkScroll.current });
      ilkScroll.current = false;
    });
    return () => cancelAnimationFrame(t);
  }, [listData.length, mesajlar.length, yukleniyor]);

  async function fotoSec() {
    try {
      const ek = await sohbetFotoSec();
      if (ek) setBekleyenEk(ek);
    } catch (e) {
      Alert.alert("Fotoğraf", e instanceof Error ? e.message : "Galeri açılamadı.");
    }
  }

  async function dosyaSec() {
    try {
      const ek = await sohbetDosyaSec();
      if (ek) setBekleyenEk(ek);
    } catch (e) {
      Alert.alert("Dosya", e instanceof Error ? e.message : "Dosya seçilemedi.");
    }
  }

  async function gonder() {
    const body = taslak.trim();
    if ((!body && !bekleyenEk) || !groupId || !user || gonderiliyor) return;
    if (body.length > MESAJ_UZUNLUK_MAX) {
      setHata(`En fazla ${MESAJ_UZUNLUK_MAX} karakter.`);
      return;
    }

    setGonderiliyor(true);
    setHata(null);
    try {
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      if (sessErr && __DEV__) console.warn("[sohbet] oturum:", sessErr.message);
      const uid = sess.session?.user?.id;
      if (!uid) {
        Alert.alert("Oturum", "Kimlik doğrulanamadı. Çıkış yapıp tekrar giriş yapın.");
        return;
      }

      const senderAd = user.ad?.trim() || user.email?.split("@")[0] || "Üye";
      const ataKayit = body ? ataKayitParse(body) : null;

      let yukluEk: { type: "image" | "file"; path: string; name: string; mime: string } | undefined;
      if (bekleyenEk) {
        try {
          const y = await sohbetEkiYukle(groupId, uid, bekleyenEk);
          yukluEk = { type: y.tur, path: y.path, name: y.ad, mime: y.mime };
        } catch (e) {
          const mesaj = e instanceof Error ? e.message : "Dosya yüklenemedi";
          setHata(mesaj);
          Alert.alert("Yükleme başarısız", mesaj);
          return;
        }
      }

      const listeKomut = atamaListeKomutuParse(body);
      if (listeKomut) {
        const guncel = await kisayollariYukle(groupId);
        setKisayollar(guncel);
        const listeMetin = kisayolListeMetniOlustur(guncel, listeKomut);
        const listeSonuc = await grupMesajiGonder({
          groupId,
          uid,
          senderAd,
          body: listeMetin,
          push: false,
        });
        if (!listeSonuc.ok) {
          setHata(listeSonuc.mesaj);
          Alert.alert("Liste gönderilemedi", listeSonuc.mesaj);
          return;
        }
        setTaslak("");
        setBekleyenEk(null);
        setYanitHedef(null);
        setBenimProfilId(uid);
        void playDelightFeedback("success", {
          hapticsEnabled: delight.uiHapticsEnabled,
          soundsEnabled: delight.uiSoundsEnabled,
        });
        gorulduOlarakIsaretle();
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        return;
      }

      if (ataKayit) {
        const kayit = await kisayolKaydet(groupId, uid, {
          tetikleyici: ataKayit.tetikleyici,
          yanitMetin: ataKayit.yanitMetin,
          ek: yukluEk
            ? { tur: yukluEk.type, path: yukluEk.path, ad: yukluEk.name, mime: yukluEk.mime }
            : undefined,
        });
        if (!kayit.ok) {
          setHata(kayit.mesaj);
          Alert.alert("Kısayol kaydedilemedi", kayit.mesaj);
          return;
        }
        await kisayollariTazele();
        const ozet = ataKayit.yanitMetin
          ? `${ataKayit.tetikleyici} → ${ataKayit.yanitMetin}`
          : yukluEk
            ? `${ataKayit.tetikleyici} → ${yukluEk.type === "image" ? "fotoğraf" : "dosya"}`
            : ataKayit.tetikleyici;
        const onay = await grupMesajiGonder({
          groupId,
          uid,
          senderAd,
          body: `✓ Kısayol kaydedildi: ${ozet}`,
          push: false,
        });
        if (!onay.ok) {
          setHata(onay.mesaj);
          Alert.alert("Bilgi mesajı gönderilemedi", onay.mesaj);
          return;
        }
        setTaslak("");
        setBekleyenEk(null);
        setYanitHedef(null);
        setBenimProfilId(uid);
        void playDelightFeedback("success", {
          hapticsEnabled: delight.uiHapticsEnabled,
          soundsEnabled: delight.uiSoundsEnabled,
        });
        gorulduOlarakIsaretle();
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        return;
      }

      const kisayol = body ? eslesenKisayolBul(body, kisayollar) : null;
      if (kisayol) {
        const yanit = await grupMesajiGonder({
          groupId,
          uid,
          senderAd,
          body: kisayolTetikYanitMetni(kisayol),
          replyToId: yanitHedef?.id,
          attachment: kisayol.response_attachment_path
            ? {
                type: (kisayol.response_attachment_type ?? "file") as "image" | "file",
                path: kisayol.response_attachment_path,
                name: kisayol.response_attachment_name ?? "dosya",
                mime: kisayol.response_attachment_mime ?? "application/octet-stream",
              }
            : undefined,
        });
        if (!yanit.ok) {
          setHata(yanit.mesaj);
          Alert.alert("Kısayol gönderilemedi", yanit.mesaj);
          return;
        }
        setTaslak("");
        setBekleyenEk(null);
        setYanitHedef(null);
        setBenimProfilId(uid);
        void playDelightFeedback("success", {
          hapticsEnabled: delight.uiHapticsEnabled,
          soundsEnabled: delight.uiSoundsEnabled,
        });
        gorulduOlarakIsaretle();
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        return;
      }

      const sonuc = await grupMesajiGonder({
        groupId,
        uid,
        senderAd,
        body: body || " ",
        replyToId: yanitHedef?.id,
        attachment: yukluEk,
      });
      if (!sonuc.ok) {
        if (__DEV__) console.warn("[sohbet] gönder:", sonuc.mesaj);
        setHata(sonuc.mesaj);
        Alert.alert("Mesaj gönderilemedi", sonuc.mesaj);
        return;
      }

      setTaslak("");
      setBekleyenEk(null);
      setYanitHedef(null);
      setBenimProfilId(uid);
      void playDelightFeedback("success", {
        hapticsEnabled: delight.uiHapticsEnabled,
        soundsEnabled: delight.uiSoundsEnabled,
      });
      gorulduOlarakIsaretle();
      void uyelerVeOkumalariYukle(groupId, uid);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setGonderiliyor(false);
    }
  }

  const kalanKarakter = MESAJ_UZUNLUK_MAX - taslak.length;
  const ustPad = ustEkranBoslugu(insets.top, 6);
  const ekipUyeSayisi = digerUyeler.length + (benimProfilId || uidHook ? 1 : 0);
  const altBaslik = useMemo(() => {
    const m = user?.magazaAdi?.trim();
    const n = mesajlar.length;
    const sab = sabitler.length;
    const uyeParca = ekipUyeSayisi > 0 ? `${ekipUyeSayisi} üye` : "Ekip";
    const mesajParca = n > 0 ? `${n} mesaj` : "Henüz mesaj yok";
    const sabitParca = sab > 0 ? ` · ${sab} duyuru` : "";
    if (m) return `${m} · ${uyeParca} · ${mesajParca}${sabitParca}`;
    return `${uyeParca} · ${mesajParca}${sabitParca}`;
  }, [user?.magazaAdi, mesajlar.length, sabitler.length, ekipUyeSayisi]);

  const satirRender = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.type === "date") {
        return (
          <View style={styles.dateRow}>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{item.label}</Text>
            </View>
          </View>
        );
      }
      const { message: m, mine, showAvatar, showName, clusterTop, clusterBottom } = item;
      const r = bubbleRadius(mine, clusterTop, clusterBottom);
      const hepsiGordu =
        okumaDestegi && mine && digerUyeler.length > 0 && tumDigerleriGordu(m.created_at, digerUyeler, okumalar);
      const gorenler =
        okumaDestegi && mine && digerUyeler.length > 0
          ? mesajiGorenUyeIdleri(m.created_at, digerUyeler, okumalar)
          : [];
      const kismiGordu = mine && !hepsiGordu && gorenler.length > 0;
      return (
        <View
          style={[
            styles.msgRow,
            mine ? styles.msgRowMine : styles.msgRowOther,
            clusterTop ? styles.msgRowClusterBas : null,
          ]}
        >
          {!mine ? (
            <View style={styles.avatarKolon}>
              {showAvatar ? (
                <View style={[styles.avatarHizala, showName ? styles.avatarHizalaIsimli : null]}>
                  <View style={[styles.avatar, { backgroundColor: avatarRenk(m.sender_ad, colors) }]}>
                    <Text style={styles.avatarTxt}>{basHarfler(m.sender_ad)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={[styles.bubbleCol, mine ? styles.bubbleColMine : styles.bubbleColOther]}>
            {showName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 1 }}>
                <Text style={styles.gonderAd}>{m.sender_ad}</Text>
                <RolRozeti rol={uyeRolleri[m.profile_id] ?? "personel"} size="sm" />
              </View>
            ) : null}
            <Pressable
              onLongPress={() => setEylemMesaji(m)}
              delayLongPress={400}
              {...(isWeb
                ? {
                    onContextMenu: (e: { preventDefault?: () => void }) => {
                      e.preventDefault?.();
                      setEylemMesaji(m);
                    },
                    onPointerDown: () => {
                      if (webBasiliTutZamanlayici.current) {
                        clearTimeout(webBasiliTutZamanlayici.current);
                      }
                      webBasiliTutZamanlayici.current = setTimeout(() => setEylemMesaji(m), 480);
                    },
                    onPointerUp: () => {
                      if (webBasiliTutZamanlayici.current) {
                        clearTimeout(webBasiliTutZamanlayici.current);
                        webBasiliTutZamanlayici.current = null;
                      }
                    },
                    onPointerLeave: () => {
                      if (webBasiliTutZamanlayici.current) {
                        clearTimeout(webBasiliTutZamanlayici.current);
                        webBasiliTutZamanlayici.current = null;
                      }
                    },
                  }
                : {})}
              style={({ pressed }) => [
                styles.bubble,
                mine ? styles.bubbleMine : styles.bubbleOther,
                r,
                pressed ? { opacity: 0.92 } : null,
              ]}
            >
              {sabitMesajIdleri.has(m.id) ? (
                <View style={styles.sabitMsgBadge}>
                  <Ionicons
                    name="pin"
                    size={12}
                    color={mine ? "rgba(255,255,255,0.9)" : colors.primary}
                  />
                  <Text style={[styles.sabitMsgBadgeTxt, mine && styles.sabitMsgBadgeTxtMine]}>Sabit</Text>
                </View>
              ) : null}
              {m.reply_parent ? (
                <View style={[styles.alintiKutu, !mine && styles.alintiKutuOther]}>
                  <Text
                    style={[styles.alintiAd, mine ? styles.alintiAdMine : styles.alintiAdOther]}
                    numberOfLines={1}
                  >
                    {m.reply_parent.sender_ad}
                  </Text>
                  <Text
                    style={[styles.alintiBody, mine ? styles.alintiBodyMine : styles.alintiBodyOther]}
                    numberOfLines={4}
                  >
                    {alintiOzetKisalt(m.reply_parent.body)}
                  </Text>
                </View>
              ) : null}
              {m.attachment_path ? (
                <GroupChatAttachmentBubble mesaj={m} mine={mine} colors={colors} />
              ) : null}
              <View style={styles.bodySatir}>
                {m.body.trim() ? (
                  <Text style={[styles.body, styles.bodyMetin, mine && styles.bodyMine]}>{m.body}</Text>
                ) : null}
                <Text style={[styles.zaman, mine ? styles.zamanMine : styles.zamanOther]}>
                  {saatKisa(m.created_at)}
                </Text>
              </View>
            </Pressable>
            {mine &&
              clusterBottom &&
              okumaDestegi &&
              digerUyeler.length > 0 &&
              (hepsiGordu || kismiGordu) ? (
              <View style={styles.okumaOzeti}>
                {hepsiGordu ? (
                  <View style={styles.ciftTik}>
                    <Ionicons name="checkmark" size={13} color={colors.primary} />
                    <Ionicons name="checkmark" size={13} color={colors.primary} style={styles.ciftTikIkinci} />
                  </View>
                ) : (
                  <Text style={styles.okumaIsimleri}>
                    {gorenler.map((pid) => `${uyeAdlari[pid] ?? "Üye"} gördü`).join(" · ")}
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        </View>
      );
    },
    [colors, digerUyeler, okumaDestegi, okumalar, sabitMesajIdleri, styles, uyeAdlari, uyeRolleri]
  );

  if (!groupId) {
    return (
      <View style={[styles.screen, { paddingTop: ustPad }]}>
        <View style={styles.header}>
          <View style={styles.headerSatir}>
            <View style={styles.headerIkonWrap}>
              <Ionicons name="chatbubbles" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerMetin}>
              <Text style={styles.baslik}>Grup sohbeti</Text>
              <Text style={styles.alt} numberOfLines={2}>
                Ekip mesajlaşması gruba katılınca açılır
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.chatPane, styles.bos]}>
          <View style={styles.bosKart}>
            <View style={styles.bosIkon}>
              <Ionicons name="people-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.bosBaslik}>Önce gruba katılın</Text>
            <Text style={styles.bosText}>Kurulumda grup oluşturun veya davet kodu ile ekibe girin.</Text>
          </View>
        </View>
      </View>
    );
  }

  const composerTabPad = altSekmeEkranBoslugu(insets.bottom);
  const KlavyeSarici = isWeb ? View : KeyboardAvoidingView;
  const klavyeSariciProps = isWeb
    ? ({ style: styles.screen } as const)
    : ({
        style: styles.screen,
        behavior: "padding" as const,
        keyboardVerticalOffset: 0,
      } as const);
  const composerDockEk = isWeb && klavyeInset > 0 ? { marginBottom: klavyeInset } : null;

  const composerPanel = (
    <>
      {hata ? <Text style={styles.hata}>{hata}</Text> : null}
      {yanitHedef ? (
        <View style={styles.yanitBant}>
          <View style={styles.yanitBantMetin}>
            <Text style={styles.yanitBantBaslik}>Yanıt · {yanitHedef.sender_ad}</Text>
            <Text style={styles.yanitBantOz} numberOfLines={1}>
              {alintiOzetKisalt(yanitHedef.body, 72)}
            </Text>
          </View>
          <Pressable
            style={styles.yanitBantKapat}
            onPress={() => setYanitHedef(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Yanıtı iptal et"
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      {bekleyenEk ? (
        <View style={styles.ekOnizleme}>
          {bekleyenEk.tur === "image" ? (
            <Image source={{ uri: bekleyenEk.uri }} style={styles.ekOnizlemeGorsel} />
          ) : (
            <Ionicons name="document-outline" size={28} color={colors.primary} />
          )}
          <Text style={styles.ekOnizlemeAd} numberOfLines={1}>
            {bekleyenEk.ad}
          </Text>
          <Pressable onPress={() => setBekleyenEk(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.composerPill}>
        <View style={styles.composerAksiyonlar}>
          <Pressable
            style={styles.ekBtn}
            onPress={() => void fotoSec()}
            disabled={gonderiliyor}
            accessibilityLabel="Fotoğraf ekle"
          >
            <Ionicons name="image-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            style={styles.ekBtn}
            onPress={() => void dosyaSec()}
            disabled={gonderiliyor}
            accessibilityLabel="Dosya ekle"
          >
            <Ionicons name="attach-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <TextInput
          ref={composerInputRef}
          style={styles.input}
          placeholder="Mesaj yazın…"
          placeholderTextColor={colors.textMuted}
          value={taslak}
          onChangeText={setTaslak}
          multiline
          maxLength={MESAJ_UZUNLUK_MAX}
          editable={!gonderiliyor && !!groupId}
          textAlignVertical="center"
          underlineColorAndroid="transparent"
          onFocus={() => {
            if (isWeb) {
              requestAnimationFrame(() => {
                const dom = composerInputRef.current as unknown as HTMLElement | null;
                dom?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
              });
              return;
            }
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
          }}
        />
        <Pressable
          style={({ pressed }) => [
            styles.gonderBtn,
            ((!taslak.trim() && !bekleyenEk) || gonderiliyor) && styles.gonderBtnDisabled,
            pressed && (taslak.trim() || bekleyenEk) && !gonderiliyor ? { opacity: 0.88 } : null,
          ]}
          onPress={() => void gonder()}
          disabled={(!taslak.trim() && !bekleyenEk) || gonderiliyor}
          accessibilityRole="button"
          accessibilityLabel="Gönder"
        >
          {gonderiliyor ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="arrow-up" size={16} color="#fff" />
          )}
        </Pressable>
      </View>
      {kalanKarakter < 80 ? (
        <View style={styles.sayacSatir}>
          <Text style={[styles.sayac, styles.sayacUyari]}>Kalan {kalanKarakter} karakter</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <KlavyeSarici {...klavyeSariciProps}>
      <View style={styles.mainColumn}>
        <View style={[styles.header, { paddingTop: ustPad }]}>
          <View style={styles.headerSatir}>
            <View style={styles.headerIkonWrap}>
              <Ionicons name="chatbubbles" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerMetin}>
              <Text style={styles.baslik}>Grup sohbeti</Text>
              <Text style={styles.alt} numberOfLines={2}>
                {altBaslik}
                {yukleniyor ? " · yükleniyor" : ""}
                {sohbetSessiz ? " · bildirimler kapalı" : ""}
              </Text>
              {user ? (
                <View style={styles.headerKimlik}>
                  <Text style={styles.headerKimlikAd} numberOfLines={1}>
                    {user.ad?.trim() || "Siz"}
                  </Text>
                  <RolRozeti rol={user.rol} size="sm" />
                </View>
              ) : null}
            </View>
            <View style={styles.ustAksiyonlar}>
              <Pressable
                style={styles.ustBtn}
                onPress={() => setKisayolModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Kısayollar"
              >
                <Ionicons name="flash-outline" size={21} color={colors.primary} />
              </Pressable>
              <Pressable
                style={[styles.ustBtn, sohbetSessiz && styles.ustBtnAktif]}
                onPress={() => void sohbetSessizAyarla(!sohbetSessiz)}
                accessibilityRole="button"
                accessibilityLabel={sohbetSessiz ? "Sohbet bildirimlerini aç" : "Sohbet bildirimlerini sessize al"}
              >
                <Ionicons
                  name={sohbetSessiz ? "notifications-off-outline" : "notifications-outline"}
                  size={21}
                  color={sohbetSessiz ? colors.textMuted : colors.primary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.chatPane}>
          {sabitler.length > 0 ? (
            (() => {
              const sir = Math.min(sabitGosterimSirasi, sabitler.length - 1);
              const aktif = sabitler[sir]!;
              const siraGoster = sir + 1;
              return (
                <View style={styles.sabitBolum}>
                  <View style={styles.sabitKart}>
                    <View style={styles.sabitSolCizgi} />
                    <Pressable
                      style={({ pressed }) => [styles.sabitIc, pressed ? { opacity: 0.88 } : null]}
                      onPress={() => {
                        mesajaKaydir(aktif.messageId);
                        setSabitGosterimSirasi((i) => (i + 1) % sabitler.length);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Sabit duyuru ${siraGoster} / ${sabitler.length}. Mesaja git.`}
                    >
                      <View style={styles.sabitPinWrap}>
                        <Ionicons name="pin" size={16} color={colors.primary} />
                      </View>
                      <View style={styles.sabitMetinBlok}>
                        <View style={styles.sabitBaslikSatir}>
                          <Text style={styles.sabitBaslik}>SABİT DUYURU</Text>
                          <Text style={styles.sabitSira}>
                            {siraGoster}/{sabitler.length}
                          </Text>
                        </View>
                        <Text style={styles.sabitGovde} numberOfLines={2}>
                          <Text style={styles.sabitGonderen}>{aktif.ozet.sender_ad}</Text>
                          <Text style={{ color: colors.textMuted }}> — </Text>
                          {alintiOzetKisalt(aktif.ozet.body, 140)}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      style={styles.sabitKaldir}
                      onPress={() =>
                        setOnay({ tur: "kaldir", pinId: aktif.pinId, mesajId: aktif.messageId })
                      }
                      accessibilityLabel="Bu sabitlemeyi kaldır"
                    >
                      <Text style={styles.sabitKaldirText}>Kaldır</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })()
          ) : null}

          {yukleniyor ? (
            <View style={styles.yukleKart}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.yukleText}>Mesajlar yükleniyor…</Text>
            </View>
          ) : (
            <FlatList
            ref={listRef}
            style={styles.listWrap}
            data={listData}
            keyExtractor={(it) => it.id}
            renderItem={satirRender}
            onScrollToIndexFailed={(info) => {
              requestAnimationFrame(() => {
                listRef.current?.scrollToOffset({
                  offset: Math.max(0, info.averageItemLength * info.index),
                  animated: true,
                });
              });
            }}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={yenileniyor}
                onRefresh={() => void yenile()}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.bos}>
                <View style={styles.bosKart}>
                  <View style={styles.bosIkon}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.primary} />
                  </View>
                  <Text style={styles.bosBaslik}>Henüz mesaj yok</Text>
                  <Text style={styles.bosText}>
                    Ekip sohbeti burada görünür. İlk mesajı yazarak başlayın; uzun basarak yanıtlayabilirsiniz.
                  </Text>
                </View>
              </View>
            }
          />
          )}
        </View>

        <View style={[styles.composerDock, composerDockEk, { paddingBottom: composerTabPad }]}>
          {composerPanel}
        </View>
      </View>

      <MesajEylemAltSayfa
        gorunur={eylemMesaji !== null}
        mesaj={eylemMesaji}
        colors={colors}
        mesajSabitli={eylemMesaji ? sabitMesajIdleri.has(eylemMesaji.id) : false}
        onKapat={() => setEylemMesaji(null)}
        onYanitla={() => {
          if (eylemMesaji) setYanitHedef(eylemMesaji);
        }}
        onSabitleIste={() => {
          if (eylemMesaji) setOnay({ tur: "sabitle", mesajId: eylemMesaji.id });
        }}
        onSabitleKaldirIste={() => {
          if (!eylemMesaji) return;
          const s = sabitler.find((x) => x.messageId === eylemMesaji.id);
          if (s) setOnay({ tur: "kaldir", pinId: s.pinId, mesajId: eylemMesaji.id });
        }}
      />

      <ChatShortcutsModal
        visible={kisayolModal}
        onKapat={() => setKisayolModal(false)}
        kisayollar={kisayollar}
        colors={colors}
        isDark={isDark}
        onSil={async (id) => {
          const ok = await kisayolSil(id);
          if (ok) await kisayollariTazele();
        }}
      />

      <KritikOnayModal
        gorunur={onay !== null}
        baslik={onay?.tur === "sabitle" ? "Duyuruya sabitle" : "Sabitlemeyi kaldır"}
        aciklama={
          onay?.tur === "sabitle"
            ? "Bu mesaj sabit duyurulara eklenecek; ekip üstte görebilir. Onaylıyor musunuz?"
            : "Bu mesaj sabit duyurulardan kaldırılacak. Onaylıyor musunuz?"
        }
        onayLabel={onay?.tur === "sabitle" ? "Sabitle" : "Kaldır"}
        tehlikeli={onay?.tur === "kaldir"}
        colors={colors}
        onOnay={async () => {
          if (!onay) return;
          if (onay.tur === "sabitle") await sabitleEkleUygula(onay.mesajId);
          else await sabitleKaldirUygula(onay.pinId, onay.mesajId);
        }}
        onIptal={() => setOnay(null)}
      />
    </KlavyeSarici>
  );
}
