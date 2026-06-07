import { Fragment, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import { uyeVardiyasiAl } from "../data/mockSchedule";
import { vardiyaEtiket, vardiyaKisa, vardiyaRenk, vardiyaTakasaUygun } from "../lib/vardiya";
import { useAuth } from "../context/AuthContext";
import { useSchedule } from "../context/ScheduleContext";
import { useNotification } from "../context/NotificationContext";
import { RolRozeti } from "../components/RolRozeti";
import { KritikOnayModal } from "../components/GroupChatOverlays";
import type { TakasDurum, TakasKaydi } from "../types";

function bugundenGunler(n: number): string[] {
  const a: string[] = [];
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const t = new Date(b);
    t.setDate(b.getDate() + i);
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const day = String(t.getDate()).padStart(2, "0");
    a.push(`${y}-${m}-${day}`);
  }
  return a;
}

function gunEtiket(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return iso;
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
}

function durumMetni(s: TakasDurum): string {
  switch (s) {
    case "awaiting_partner":
      return "Partner yanıtı bekleniyor";
    case "awaiting_manager":
      return "Müdür onayı bekleniyor";
    case "approved":
      return "Onaylandı";
    case "rejected_partner":
      return "Partner reddetti";
    case "rejected_manager":
      return "Müdür reddetti";
    case "cancelled":
      return "İptal edildi";
    default:
      return s;
  }
}

function takasGunOzeti(t: TakasKaydi): string {
  const gun = gunEtiket(t.dateFrom);
  if (t.dateFrom === t.dateTo) {
    return `${gun}: ${vardiyaEtiket(t.shiftKindFrom)} ↔ ${vardiyaEtiket(t.shiftKindTo)}`;
  }
  return `${gunEtiket(t.dateFrom)} (${vardiyaEtiket(t.shiftKindFrom)}) ↔ ${gunEtiket(t.dateTo)} (${vardiyaEtiket(t.shiftKindTo)})`;
}

const TALEP_YANIT_PENCERE_MS = 48 * 60 * 60 * 1000;

/** Bekleyen talepler için; süre dolduğunda da metin güncellenir (askıda kalmaz). */
function talepYanitSuresiMetni(createdAt: string, status: TakasDurum): string | null {
  if (status !== "awaiting_partner" && status !== "awaiting_manager") return null;
  const son = Date.parse(createdAt) + TALEP_YANIT_PENCERE_MS;
  const simdi = Date.now();
  const kalan = son - simdi;
  if (kalan <= 0) {
    return "48 saatlik yanıt süresi doldu; talep hâlâ işlem bekliyor.";
  }
  const saat = Math.floor(kalan / 3600000);
  const dk = Math.floor((kalan % 3600000) / 60000);
  if (saat >= 1) {
    return `Bu talep 48 saat içinde yanıt bekliyor (kalan ~${saat} s ${dk} dk).`;
  }
  return `Bu talep 48 saat içinde yanıt bekliyor (kalan ~${dk} dk).`;
}

function createShiftSwapStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    hero: {
      borderRadius: 18,
      backgroundColor: colors.surface,
      padding: 16,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    heroBaslikSatir: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    head: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8 },
    aciklama: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
    bolum: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 10, marginTop: 4 },
    bolumAlt: { fontSize: 12, color: colors.textMuted, marginTop: -6, marginBottom: 10, lineHeight: 17 },
    uyariKutu: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
      backgroundColor: colors.afternoon + "18",
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.afternoon + "44",
    },
    uyariText: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    cipSatir: { marginBottom: 14 },
    cip: {
      marginRight: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 108,
    },
    cipSec: { borderColor: colors.primary, backgroundColor: colors.primaryMuted + "33" },
    cipGun: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
    cipGunSec: { color: colors.text },
    cipV: { fontSize: 11, color: colors.text, fontWeight: "700", marginTop: 4 },
    cipVPartner: { fontSize: 10, color: colors.textMuted, fontWeight: "600", marginTop: 2 },
    onizleme: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    onizlemeBaslik: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 8 },
    onizlemeSatir: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
    onizlemeUyari: { fontSize: 12, color: colors.afternoon, marginTop: 8, fontWeight: "600" },
    gonderBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
    },
    gonderBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    bosText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kartUst: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    kartBaslik: { fontSize: 15, fontWeight: "700", color: colors.text },
    kartAlt: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
    durumEtiket: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    btnSatir: { flexDirection: "row", gap: 10, marginTop: 12 },
    btn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center" },
    btnOlumlu: { backgroundColor: colors.morning },
    btnOlumluText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    btnOlumsuz: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    btnOlumsuzText: { color: colors.text, fontWeight: "700", fontSize: 14 },
    btnIptal: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    btnIptalText: { color: colors.textMuted, fontWeight: "700", fontSize: 14 },

    sekmeSatir: {
      flexDirection: "row",
      backgroundColor: colors.surface2,
      borderRadius: 14,
      padding: 4,
      marginBottom: 14,
      gap: 4,
    },
    sekmeBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 11,
      alignItems: "center",
    },
    sekmeBtnAktif: { backgroundColor: colors.surface, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4 },
    sekmeBtnText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    sekmeBtnTextAktif: { color: colors.text },

    altFiltreSatir: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    filtreCip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filtreCipAktif: { borderColor: colors.primary, backgroundColor: colors.primaryMuted + "28" },
    filtreCipText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    filtreCipTextAktif: { color: colors.text },

    miniCizWrap: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      marginBottom: 14,
    },
    miniCizBaslik: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
      paddingHorizontal: 14,
      marginBottom: 10,
      letterSpacing: 0.3,
    },
    miniCizSatir: { paddingHorizontal: 10 },
    miniHucre: {
      width: 56,
      marginHorizontal: 4,
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    miniHucreAd: { fontSize: 10, fontWeight: "700", color: colors.textMuted, marginBottom: 4 },
    miniHucreV: { fontSize: 14, fontWeight: "800" },

    zamanBandi: {
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primaryMuted + "18",
      borderWidth: 1,
      borderColor: colors.primary + "33",
    },
    zamanBandiText: { fontSize: 12, fontWeight: "600", color: colors.text, lineHeight: 17 },
    zamanBandiUyari: { fontSize: 12, fontWeight: "600", color: colors.afternoon, lineHeight: 17 },
  });
}

export function ShiftSwapScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createShiftSwapStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const {
    ekip,
    izinGunu,
    overrides,
    resmiTatilTarihleri,
    takaslar,
    takasTalepGonder,
    takasPartnerYanit,
    takasMudurYanit,
    takasTalepIptal,
  } = useSchedule();
  const { bildirimGonder } = useNotification();

  const gunler = useMemo(() => bugundenGunler(14), []);
  const [takasTarihi, setTakasTarihi] = useState<string | null>(null);
  const [gonderiyor, setGonderiyor] = useState(false);
  const [listeSekmesi, setListeSekmesi] = useState<"bekleyen" | "gecmis">("bekleyen");
  const [gecmisFiltre, setGecmisFiltre] = useState<"tumu" | "onayli">("tumu");
  const [partnerRedTakasId, setPartnerRedTakasId] = useState<string | null>(null);

  const benim = useMemo(
    () => ekip.find((m) => m.profileId === session?.user?.id),
    [ekip, session?.user?.id],
  );
  const partner = benim?.partnerId ? ekip.find((m) => m.id === benim.partnerId) : undefined;

  const onizleme = useMemo(() => {
    if (!benim || !partner || !takasTarihi) return null;
    const vf = uyeVardiyasiAl(takasTarihi, benim.id, ekip, izinGunu, overrides, resmiTatilTarihleri);
    const vt = uyeVardiyasiAl(takasTarihi, partner.id, ekip, izinGunu, overrides, resmiTatilTarihleri);
    return { vf, vt };
  }, [benim, partner, takasTarihi, ekip, izinGunu, overrides, resmiTatilTarihleri]);

  const aktifTakaslar = useMemo(
    () => takaslar.filter((t) => t.status === "awaiting_partner" || t.status === "awaiting_manager"),
    [takaslar],
  );

  const gecmisKayitlar = useMemo(() => {
    let xs = takaslar.filter(
      (t) => t.status !== "awaiting_partner" && t.status !== "awaiting_manager",
    );
    if (gecmisFiltre === "onayli") xs = xs.filter((t) => t.status === "approved");
    return xs.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [takaslar, gecmisFiltre]);

  async function talepGonder() {
    if (!takasTarihi) {
      Alert.alert("Tarih seçin", "Takas için bir gün seçin.");
      return;
    }
    setGonderiyor(true);
    const sonuc = await takasTalepGonder(takasTarihi);
    setGonderiyor(false);
    if (!sonuc.ok) {
      Alert.alert("Takas gönderilemedi", sonuc.mesaj);
      return;
    }
    bildirimGonder("bilgi", "Takas talebi", "Partnerinize bildirim gitti.");
    setTakasTarihi(null);
  }

  function takasKarti(t: TakasKaydi) {
    const talepEden = ekip.find((m) => m.id === t.fromMemberId);
    const hedef = ekip.find((m) => m.id === t.toMemberId);
    const benimId = benim?.id;
    const partnerMi = benimId === t.toMemberId;
    const talepEdenMi = benimId === t.fromMemberId;
    const mudurMu = user?.rol === "mudur" || user?.rol === "yardimci";
    const yanitSuresi = talepYanitSuresiMetni(t.createdAt, t.status);
    const sureDustu =
      yanitSuresi?.includes("doldu") &&
      (t.status === "awaiting_partner" || t.status === "awaiting_manager");

    return (
      <View style={styles.kart}>
        <View style={styles.kartUst}>
          <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <Text style={styles.kartBaslik}>{talepEden?.ad ?? "?"}</Text>
              {talepEden ? <RolRozeti rol={talepEden.rol} size="sm" /> : null}
              <Text style={styles.kartBaslik}>{"\u2194"}</Text>
              <Text style={styles.kartBaslik}>{hedef?.ad ?? "?"}</Text>
              {hedef ? <RolRozeti rol={hedef.rol} size="sm" /> : null}
            </View>
            <Text style={styles.kartAlt}>{takasGunOzeti(t)}</Text>
            <Text style={styles.durumEtiket}>{durumMetni(t.status)}</Text>
            {yanitSuresi ? (
              <View style={styles.zamanBandi}>
                <Text style={sureDustu ? styles.zamanBandiUyari : styles.zamanBandiText}>
                  {yanitSuresi}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {t.status === "awaiting_partner" && partnerMi && (
          <View style={styles.btnSatir}>
            <TouchableOpacity
              style={[styles.btn, styles.btnOlumlu]}
              onPress={async () => {
                const r = await takasPartnerYanit(t.id, true);
                if (!r.ok) Alert.alert("Hata", r.mesaj);
                else bildirimGonder("bilgi", "Takas", "Müdüre bildirim gitti.");
              }}
            >
              <Text style={styles.btnOlumluText}>Kabul et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnOlumsuz]}
              onPress={() => setPartnerRedTakasId(t.id)}
            >
              <Text style={styles.btnOlumsuzText}>Reddet</Text>
            </TouchableOpacity>
          </View>
        )}

        {t.status === "awaiting_partner" && talepEdenMi && (
          <TouchableOpacity
            style={[styles.btn, styles.btnIptal, { marginTop: 10 }]}
            onPress={async () => {
              const r = await takasTalepIptal(t.id);
              if (!r.ok) Alert.alert("Hata", r.mesaj);
            }}
          >
            <Text style={styles.btnIptalText}>Talebi iptal et</Text>
          </TouchableOpacity>
        )}

        {t.status === "awaiting_manager" && mudurMu && (
          <View style={styles.btnSatir}>
            <TouchableOpacity
              style={[styles.btn, styles.btnOlumlu]}
              onPress={async () => {
                const r = await takasMudurYanit(t.id, true);
                if (!r.ok) Alert.alert("Hata", r.mesaj);
                else bildirimGonder("bilgi", "Takas", "Vardiya ve puantaj güncellendi.");
              }}
            >
              <Text style={styles.btnOlumluText}>Onayla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnOlumsuz]}
              onPress={async () => {
                const r = await takasMudurYanit(t.id, false);
                if (!r.ok) Alert.alert("Hata", r.mesaj);
              }}
            >
              <Text style={styles.btnOlumsuzText}>Reddet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroBaslikSatir}>
          <Text style={[styles.head, { flex: 1, marginBottom: 0 }]}>Vardiya takası</Text>
          {user ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                {user.ad}
              </Text>
              <RolRozeti rol={user.rol} size="sm" />
            </View>
          ) : null}
        </View>
        <Text style={[styles.aciklama, { marginBottom: 0 }]}>
          Aynı gün içinde partnerinizle vardiya çeşidini değiştirmek için talep açın. Onay sonrası Vardiya
          ve Puantaj anında güncellenir.
        </Text>
      </View>

      {!benim || !partner ? (
        <View style={styles.uyariKutu}>
          <Ionicons name="warning-outline" size={22} color={colors.afternoon} />
          <Text style={styles.uyariText}>
            {!benim
              ? "Ekip kaydınız bulunamadı veya oturum eşleşmiyor."
              : "Partner atanmamış. Ayarlar → Ekip’ten müdürün partner bağlaması gerekir."}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.bolum}>Takas günü</Text>
          <Text style={styles.bolumAlt}>İkinizin de o gün için atanmış farklı vardiyaları olmalı.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cipSatir}>
            {gunler.map((iso) => {
              const sec = takasTarihi === iso;
              const vBen = uyeVardiyasiAl(iso, benim.id, ekip, izinGunu, overrides, resmiTatilTarihleri);
              const vPar = uyeVardiyasiAl(iso, partner.id, ekip, izinGunu, overrides, resmiTatilTarihleri);
              return (
                <TouchableOpacity
                  key={iso}
                  style={[styles.cip, sec && styles.cipSec]}
                  onPress={() => setTakasTarihi(iso)}
                >
                  <Text style={[styles.cipGun, sec && styles.cipGunSec]}>{gunEtiket(iso)}</Text>
                  <Text style={styles.cipV} numberOfLines={1}>
                    Sen: {vBen ? vardiyaEtiket(vBen) : "—"}
                  </Text>
                  <Text style={styles.cipVPartner} numberOfLines={1}>
                    {(partner.ad || "P").split(/\s+/)[0]}: {vPar ? vardiyaEtiket(vPar) : "—"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {takasTarihi && ekip.length > 0 ? (
            <View style={styles.miniCizWrap}>
              <Text style={styles.miniCizBaslik}>
                {gunEtiket(takasTarihi)} · ekip özeti (tek satır)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.miniCizSatir}
              >
                {ekip.map((m) => {
                  const v = uyeVardiyasiAl(
                    takasTarihi,
                    m.id,
                    ekip,
                    izinGunu,
                    overrides,
                    resmiTatilTarihleri,
                  );
                  const renk = vardiyaRenk(v, colors);
                  return (
                    <View key={m.id} style={styles.miniHucre}>
                      <Text style={styles.miniHucreAd} numberOfLines={1}>
                        {(m.ad || "?").split(/\s+/)[0]}
                      </Text>
                      <Text style={[styles.miniHucreV, { color: renk }]}>{vardiyaKisa(v)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {onizleme && (
            <View style={styles.onizleme}>
              <Text style={styles.onizlemeBaslik}>Özet</Text>
              <Text style={styles.onizlemeSatir}>
                {takasTarihi ? gunEtiket(takasTarihi) : "—"} — Siz:{" "}
                {onizleme.vf ? vardiyaEtiket(onizleme.vf) : "—"} · Partner:{" "}
                {onizleme.vt ? vardiyaEtiket(onizleme.vt) : "—"}
              </Text>
              {(!vardiyaTakasaUygun(onizleme.vf) || !vardiyaTakasaUygun(onizleme.vt)) && (
                <Text style={styles.onizlemeUyari}>
                  İkinizde de çalışma vardiyası olmalı (izin, resmi tatil veya envanter izninde takas yapılamaz).
                </Text>
              )}
              {vardiyaTakasaUygun(onizleme.vf) &&
                vardiyaTakasaUygun(onizleme.vt) &&
                onizleme.vf === onizleme.vt && (
                <Text style={styles.onizlemeUyari}>
                  Takas için vardiyalar farklı olmalı (ör. sabah ile akşam).
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.gonderBtn,
              (!onizleme ||
                !vardiyaTakasaUygun(onizleme.vf) ||
                !vardiyaTakasaUygun(onizleme.vt) ||
                onizleme.vf === onizleme.vt ||
                gonderiyor) && { opacity: 0.45 },
            ]}
            disabled={
              !onizleme ||
              !vardiyaTakasaUygun(onizleme.vf) ||
              !vardiyaTakasaUygun(onizleme.vt) ||
              onizleme.vf === onizleme.vt ||
              gonderiyor
            }
            onPress={talepGonder}
          >
            {gonderiyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.gonderBtnText}>Talep gönder</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      <Text style={[styles.bolum, { marginTop: 8 }]}>Talepler</Text>
      <View style={styles.sekmeSatir}>
        <Pressable
          style={[styles.sekmeBtn, listeSekmesi === "bekleyen" && styles.sekmeBtnAktif]}
          onPress={() => setListeSekmesi("bekleyen")}
        >
          <Text style={[styles.sekmeBtnText, listeSekmesi === "bekleyen" && styles.sekmeBtnTextAktif]}>
            Bekleyen
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sekmeBtn, listeSekmesi === "gecmis" && styles.sekmeBtnAktif]}
          onPress={() => setListeSekmesi("gecmis")}
        >
          <Text style={[styles.sekmeBtnText, listeSekmesi === "gecmis" && styles.sekmeBtnTextAktif]}>
            Geçmiş
          </Text>
        </Pressable>
      </View>

      {listeSekmesi === "gecmis" ? (
        <View style={styles.altFiltreSatir}>
          <Pressable
            style={[styles.filtreCip, gecmisFiltre === "tumu" && styles.filtreCipAktif]}
            onPress={() => setGecmisFiltre("tumu")}
          >
            <Text style={[styles.filtreCipText, gecmisFiltre === "tumu" && styles.filtreCipTextAktif]}>
              Tümü
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filtreCip, gecmisFiltre === "onayli" && styles.filtreCipAktif]}
            onPress={() => setGecmisFiltre("onayli")}
          >
            <Text style={[styles.filtreCipText, gecmisFiltre === "onayli" && styles.filtreCipTextAktif]}>
              Onaylananlar
            </Text>
          </Pressable>
        </View>
      ) : null}

      {listeSekmesi === "bekleyen" ? (
        aktifTakaslar.length === 0 ? (
          <Text style={styles.bosText}>Bekleyen takas yok.</Text>
        ) : (
          aktifTakaslar.map((t) => <Fragment key={t.id}>{takasKarti(t)}</Fragment>)
        )
      ) : gecmisKayitlar.length === 0 ? (
        <Text style={styles.bosText}>
          {gecmisFiltre === "onayli" ? "Onaylanmış takas yok." : "Geçmiş kayıt yok."}
        </Text>
      ) : (
        gecmisKayitlar.map((t) => <Fragment key={t.id}>{takasKarti(t)}</Fragment>)
      )}
    </ScrollView>

    <KritikOnayModal
      gorunur={partnerRedTakasId !== null}
      baslik="Takası reddet"
      aciklama="Partnerinizin vardiya takas talebini reddediyorsunuz. Talep sonlanır; isterseniz daha sonra yeni bir talep açılabilir."
      onayLabel="Reddet"
      iptalLabel="Vazgeç"
      tehlikeli
      colors={colors}
      onOnay={async () => {
        if (!partnerRedTakasId) return;
        const id = partnerRedTakasId;
        const r = await takasPartnerYanit(id, false);
        if (!r.ok) Alert.alert("Hata", r.mesaj);
      }}
      onIptal={() => setPartnerRedTakasId(null)}
    />
    </>
  );
}
