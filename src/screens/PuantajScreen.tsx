import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import { ayGunlukPlanlari, saatOzet } from "../data/mockSchedule";
import { vardiyaEtiket, vardiyaKisa, vardiyaRenk, vardiyaSaatAraligi } from "../lib/vardiya";
import { shiftKindSaat, AYLIK_HEDEF_SAAT } from "../constants/shifts";
import type { ShiftKind } from "../types";
import { useSchedule } from "../context/ScheduleContext";
import { useAuth } from "../context/AuthContext";
import { RolRozeti } from "../components/RolRozeti";

const HAFTA_UST = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const LEJAND: { kind: ShiftKind; etiket: string }[] = [
  { kind: "sabah", etiket: "Sabah" },
  { kind: "ogle", etiket: "Öğle" },
  { kind: "tamgun", etiket: "Tam gün" },
  { kind: "izin", etiket: "İzin" },
  { kind: "resmi_tatil", etiket: "Resmi tatil" },
  { kind: "antre", etiket: "Antre" },
  { kind: "aksam", etiket: "Akşam" },
  { kind: "envanter", etiket: "Envanter" },
];

function createPuantajStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 12, paddingBottom: 40 },
    head: { fontSize: 24, fontWeight: "800", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },

    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    navBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    navCenter: { alignItems: "center" },
    ayTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    ayGunSayisi: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

    lejandRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    lejandItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    lejandDot: { width: 8, height: 8, borderRadius: 4 },
    lejandText: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },

    weekRow: { flexDirection: "row", width: "100%", marginBottom: 6 },
    weekHead: {
      flex: 1,
      minWidth: 0,
      textAlign: "center",
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "700",
    },
    weekHeadWeekend: { color: colors.antre },

    grid: { width: "100%", marginBottom: 2 },
    gridRow: { flexDirection: "row", width: "100%", alignItems: "flex-start" },
    cell: {
      flex: 1,
      minWidth: 0,
      aspectRatio: 1,
      padding: 4,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 5,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: "hidden",
    },
    cellAktif: {
      backgroundColor: colors.primaryMuted + "33",
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: 8,
    },
    cellBugun: {},
    cellGun: { fontSize: 15, fontWeight: "700", color: colors.text },
    cellGunBugun: { color: colors.primary },
    cellGunAktif: { color: colors.primary, fontWeight: "800" },
    dots: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 3,
      marginTop: 4,
      justifyContent: "center",
      width: "100%",
    },
    dot: { width: 7, height: 7, borderRadius: 3.5 },

    section: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginTop: 18,
      marginBottom: 12,
    },
    /** Takvim bitiminden hemen sonra — büyük boşluk olmasın */
    sectionTakvimSonrasi: {
      marginTop: 8,
    },

    detailCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailDate: {
      color: colors.textMuted,
      marginBottom: 12,
      fontSize: 14,
      fontWeight: "600",
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailIndicator: {
      width: 4,
      height: 36,
      borderRadius: 2,
      marginRight: 12,
    },
    detailInfo: { flex: 1 },
    detailAd: { color: colors.text, fontWeight: "700", fontSize: 14 },
    detailRol: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    detailRight: { alignItems: "flex-end" },
    badge: {
      borderWidth: 1.5,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeText: { fontSize: 12, fontWeight: "700" },
    detailSaat: { fontSize: 10, color: colors.textMuted, marginTop: 4 },

    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 32,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      gap: 8,
    },
    placeholder: { color: colors.textMuted, fontSize: 14 },

    ozetCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ozetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    ozetAd: { color: colors.text, fontWeight: "700", fontSize: 14 },
    ozetRol: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    ozetSaatWrap: { alignItems: "flex-end" },
    ozetYuzde: { fontSize: 18, fontWeight: "800" },
    ozetSaat: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    ozetTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surface2,
      overflow: "hidden",
    },
    ozetFill: { height: 6, borderRadius: 3 },

    dagilimGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 20,
    },
    dagilimCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      minWidth: 72,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dagilimDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
    dagilimNum: { fontSize: 18, fontWeight: "800", color: colors.text },
    dagilimLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "600", marginTop: 2 },
  });
}

export function PuantajScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createPuantajStyles(colors), [colors]);
  const { ekip, izinGunu, overrides, resmiTatilTarihleri } = useSchedule();
  const simdi = new Date();
  const [yil, setYil] = useState(simdi.getFullYear());
  const [ay, setAy] = useState(simdi.getMonth() + 1);
  const bugunStr = `${simdi.getFullYear()}-${String(simdi.getMonth() + 1).padStart(2, "0")}-${String(simdi.getDate()).padStart(2, "0")}`;
  const [secilenGun, setSecilenGun] = useState<string | null>(bugunStr);

  const planlar = useMemo(
    () => ayGunlukPlanlari(yil, ay, ekip, { izinGunu, overrides, resmiTatilTarihleri }),
    [yil, ay, ekip, izinGunu, overrides, resmiTatilTarihleri]
  );
  const planMap = useMemo(
    () => new Map(planlar.map((p) => [p.tarih, p])),
    [planlar]
  );
  const aylikOzet = useMemo(() => saatOzet(planlar, ekip), [planlar, ekip]);

  const ayBaslik = new Date(yil, ay - 1, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  const takvimHucreleri = useMemo(() => {
    const ilk = new Date(yil, ay - 1, 1);
    const sonGun = new Date(yil, ay, 0).getDate();
    let baslangicPzt = ilk.getDay();
    baslangicPzt = baslangicPzt === 0 ? 6 : baslangicPzt - 1;
    const hucreler: ({ tip: "bos" } | { tip: "gun"; gun: number; tarih: string })[] = [];
    for (let i = 0; i < baslangicPzt; i++) hucreler.push({ tip: "bos" });
    for (let g = 1; g <= sonGun; g++) {
      const tarih = `${yil}-${String(ay).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
      hucreler.push({ tip: "gun", gun: g, tarih });
    }
    while (hucreler.length % 7 !== 0) hucreler.push({ tip: "bos" });
    return hucreler;
  }, [yil, ay]);

  const takvimSatirlari = useMemo(() => {
    const satirlar: (typeof takvimHucreleri)[] = [];
    for (let i = 0; i < takvimHucreleri.length; i += 7) {
      satirlar.push(takvimHucreleri.slice(i, i + 7));
    }
    return satirlar;
  }, [takvimHucreleri]);

  const secilenPlan = secilenGun ? planMap.get(secilenGun) : undefined;

  function ayDegistir(delta: number) {
    const d = new Date(yil, ay - 1 + delta, 1);
    setYil(d.getFullYear());
    setAy(d.getMonth() + 1);
    setSecilenGun(null);
  }

  const gunVardiyaSayilari = useMemo(() => {
    const sayac: Partial<Record<ShiftKind, number>> = {};
    for (const p of planlar) {
      for (const u of ekip) {
        const v = p.atamalar[u.id];
        if (v) sayac[v] = (sayac[v] || 0) + 1;
      }
    }
    return sayac;
  }, [planlar, ekip]);

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={styles.head}>Puantaj</Text>
        {user ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }} numberOfLines={1}>
              {user.ad}
            </Text>
            <RolRozeti rol={user.rol} size="sm" />
          </View>
        ) : null}
      </View>
      <Text style={styles.sub}>Aylık vardiya takvimi ve saat takibi</Text>

      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => ayDegistir(-1)}
          style={styles.navBtn}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.ayTitle}>{ayBaslik}</Text>
          <Text style={styles.ayGunSayisi}>{new Date(yil, ay, 0).getDate()} gün</Text>
        </View>
        <TouchableOpacity
          onPress={() => ayDegistir(1)}
          style={styles.navBtn}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.lejandRow}>
        {LEJAND.map((l) => (
          <View key={l.kind} style={styles.lejandItem}>
            <View style={[styles.lejandDot, { backgroundColor: vardiyaRenk(l.kind, colors) }]} />
            <Text style={styles.lejandText}>{l.etiket}</Text>
          </View>
        ))}
      </View>

      <View style={styles.weekRow}>
        {HAFTA_UST.map((h, i) => (
          <Text key={h} style={[styles.weekHead, i >= 5 && styles.weekHeadWeekend]}>
            {h}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {takvimSatirlari.map((satir, ri) => (
          <View key={`takvim-satir-${ri}`} style={styles.gridRow}>
            {satir.map((h, ci) => {
              const i = ri * 7 + ci;
              if (h.tip === "bos") return <View key={`b-${i}`} style={styles.cell} />;

              const aktif = h.tarih === secilenGun;
              const bugunMu = h.tarih === bugunStr;
              const plan = planMap.get(h.tarih);

              const baskınVardiya = plan
                ? (() => {
                    const sayac: Partial<Record<ShiftKind, number>> = {};
                    for (const u of ekip) {
                      const v = plan.atamalar[u.id];
                      if (v && v !== "izin" && v !== "envanter_izni") sayac[v] = (sayac[v] || 0) + 1;
                    }
                    let max: ShiftKind = "sabah";
                    let maxN = 0;
                    for (const [k, n] of Object.entries(sayac)) {
                      if (n! > maxN) {
                        max = k as ShiftKind;
                        maxN = n!;
                      }
                    }
                    return max;
                  })()
                : undefined;

              const bgRenk = baskınVardiya ? vardiyaRenk(baskınVardiya, colors) + "18" : "transparent";

              return (
                <TouchableOpacity
                  key={h.tarih}
                  style={[styles.cell, { backgroundColor: bgRenk }, aktif && styles.cellAktif]}
                  onPress={() => setSecilenGun(h.tarih)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cellGun,
                      bugunMu && !aktif && styles.cellGunBugun,
                      aktif && styles.cellGunAktif,
                    ]}
                  >
                    {h.gun}
                  </Text>
                  <View style={styles.dots}>
                    {plan &&
                      ekip.map((u, j) => {
                        const v = plan.atamalar[u.id];
                        return (
                          <View key={j} style={[styles.dot, { backgroundColor: vardiyaRenk(v, colors) }]} />
                        );
                      })}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={[styles.section, styles.sectionTakvimSonrasi]}>
        <Ionicons name="today-outline" size={16} color={colors.text} />
        {"  "}Seçilen gün
      </Text>
      {secilenPlan ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailDate}>
            {new Date(secilenGun + "T12:00:00").toLocaleDateString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
          {ekip.map((u) => {
            const v = secilenPlan.atamalar[u.id];
            const renk = vardiyaRenk(v, colors);
            const saat = shiftKindSaat(v);
            return (
              <View key={u.id} style={styles.detailRow}>
                <View style={[styles.detailIndicator, { backgroundColor: renk }]} />
                <View style={styles.detailInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={styles.detailAd}>{u.ad}</Text>
                    <RolRozeti rol={u.rol} size="sm" />
                  </View>
                </View>
                <View style={styles.detailRight}>
                  <View style={[styles.badge, { borderColor: renk, backgroundColor: renk + "18" }]}>
                    <Text style={[styles.badgeText, { color: renk }]}>{vardiyaEtiket(v)}</Text>
                  </View>
                  <Text style={styles.detailSaat}>
                    {vardiyaSaatAraligi(v)} · {saat > 0 ? `${saat}sa` : "—"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
          <Text style={styles.placeholder}>Takvimden bir gün seçin</Text>
        </View>
      )}

      <Text style={styles.section}>
        <Ionicons name="bar-chart-outline" size={16} color={colors.text} />
        {"  "}Aylık saat özeti
      </Text>
      {aylikOzet.map(({ uye, saat }) => {
        const oran = Math.min(1, saat / AYLIK_HEDEF_SAAT);
        const yuzde = Math.round(oran * 100);
        const renk = oran >= 0.9 ? colors.morning : oran >= 0.5 ? colors.primary : colors.afternoon;
        return (
          <View key={uye.id} style={styles.ozetCard}>
            <View style={styles.ozetHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={styles.ozetAd}>{uye.ad}</Text>
                  <RolRozeti rol={uye.rol} size="sm" />
                </View>
              </View>
              <View style={styles.ozetSaatWrap}>
                <Text style={[styles.ozetYuzde, { color: renk }]}>{yuzde}%</Text>
                <Text style={styles.ozetSaat}>
                  {saat} / {AYLIK_HEDEF_SAAT} sa
                </Text>
              </View>
            </View>
            <View style={styles.ozetTrack}>
              <View style={[styles.ozetFill, { width: `${oran * 100}%`, backgroundColor: renk }]} />
            </View>
          </View>
        );
      })}

      <Text style={styles.section}>
        <Ionicons name="pie-chart-outline" size={16} color={colors.text} />
        {"  "}Vardiya dağılımı
      </Text>
      <View style={styles.dagilimGrid}>
        {LEJAND.filter((l) => gunVardiyaSayilari[l.kind]).map((l) => (
          <View key={l.kind} style={styles.dagilimCard}>
            <View style={[styles.dagilimDot, { backgroundColor: vardiyaRenk(l.kind, colors) }]} />
            <Text style={styles.dagilimNum}>{gunVardiyaSayilari[l.kind]}</Text>
            <Text style={styles.dagilimLabel}>{l.etiket}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
