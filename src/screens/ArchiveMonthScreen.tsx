import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import { ayGunlukPlanlari, haftaBasiPazartesi, saatOzet } from "../data/mockSchedule";
import { vardiyaEtiket, vardiyaKisa, vardiyaRenk, vardiyaSaatAraligi } from "../lib/vardiya";
import { shiftKindSaat, AYLIK_HEDEF_SAAT } from "../constants/shifts";
import { useSchedule } from "../context/ScheduleContext";
import { useAuth } from "../context/AuthContext";
import { RolRozeti } from "../components/RolRozeti";
import type { ShiftKind, GunlukPlan } from "../types";

export type ArchiveStackParamList = {
  ArsivListe: undefined;
  ArsivAy: { yil: number; ay: number; etiket: string };
};

type Props = NativeStackScreenProps<ArchiveStackParamList, "ArsivAy">;

const GUN_KISA = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];

function haftaKey(d: Date) {
  const pzt = haftaBasiPazartesi(d);
  return `${pzt.getFullYear()}-${String(pzt.getMonth() + 1).padStart(2, "0")}-${String(pzt.getDate()).padStart(2, "0")}`;
}

function tarihToDate(t: string) {
  return new Date(t + "T12:00:00");
}

function createArchiveMonthStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 16, paddingBottom: 40 },

    headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
    head: { fontSize: 22, fontWeight: "800", color: colors.text },
    sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

    ozetKart: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ozetBaslik: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 12 },
    ozetSatir: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    ozetAd: { width: 90, fontSize: 12, color: colors.text, fontWeight: "600" },
    ozetTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surface2,
      marginHorizontal: 8,
      overflow: "hidden",
    },
    ozetFill: { height: 6, borderRadius: 3 },
    ozetSaat: { fontSize: 12, fontWeight: "700", width: 42, textAlign: "right" },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text },

    gunBaslikRow: { flexDirection: "row", marginBottom: 6, alignItems: "center" },
    isimCol: { width: 80, paddingRight: 4 },
    gunCol: { flex: 1, alignItems: "center" },
    gunBaslik: { fontSize: 10, color: colors.textMuted, fontWeight: "700" },

    row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    name: { fontSize: 11, color: colors.text, fontWeight: "700" },
    badges: { flexDirection: "row", flex: 1 },

    badge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { fontSize: 11, fontWeight: "800" },
    badgeEmpty: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.surface2,
      opacity: 0.3,
    },

    haftaSaatRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    haftaSaatItem: { alignItems: "center" },
    haftaSaatAd: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
    haftaSaatDeger: { fontSize: 14, fontWeight: "800", color: colors.text, marginTop: 2 },

    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000000bb",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 20,
      padding: 24,
    },
    modalKart: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: "100%",
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
    },
    modalBaslik: { fontSize: 16, fontWeight: "800", color: colors.text },
    modalSatir: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
    modalInfo: { flex: 1 },
    modalAd: { fontSize: 14, fontWeight: "700", color: colors.text },
    modalRol: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    modalRight: { alignItems: "flex-end" },
    modalVardiya: { fontSize: 14, fontWeight: "800" },
    modalSaatText: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
    modalSaatNum: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
    modalKapat: {
      marginTop: 16,
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: 10,
      backgroundColor: colors.surface2,
    },
    modalKapatText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  });
}

type ArchiveStyles = ReturnType<typeof createArchiveMonthStyles>;

function GunDetayModal({
  plan,
  tarih,
  onKapat,
  styles: st,
  themeColors,
}: {
  plan: GunlukPlan;
  tarih: string;
  onKapat: () => void;
  styles: ArchiveStyles;
  themeColors: ThemeColors;
}) {
  const { ekip } = useSchedule();
  const gunStr = new Date(tarih + "T12:00:00").toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <Pressable style={st.overlay} onPress={onKapat}>
      <Pressable style={st.modalKart} onPress={(e) => e.stopPropagation()}>
        <View style={st.modalHeader}>
          <Ionicons name="today-outline" size={20} color={themeColors.primary} />
          <Text style={st.modalBaslik}>{gunStr}</Text>
        </View>
        {ekip.map((u) => {
          const v = plan.atamalar[u.id];
          const renk = vardiyaRenk(v, themeColors);
          const saat = shiftKindSaat(v);
          return (
            <View key={u.id} style={st.modalSatir}>
              <View style={[st.modalIndicator, { backgroundColor: renk }]} />
              <View style={st.modalInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={st.modalAd}>{u.ad}</Text>
                  <RolRozeti rol={u.rol} size="sm" />
                </View>
              </View>
              <View style={st.modalRight}>
                <Text style={[st.modalVardiya, { color: renk }]}>{vardiyaEtiket(v)}</Text>
                <Text style={st.modalSaatText}>{vardiyaSaatAraligi(v)}</Text>
                <Text style={st.modalSaatNum}>{saat > 0 ? `${saat} saat` : "—"}</Text>
              </View>
            </View>
          );
        })}
        <Pressable style={st.modalKapat} onPress={onKapat}>
          <Text style={st.modalKapatText}>Kapat</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

export function ArchiveMonthScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createArchiveMonthStyles(colors), [colors]);
  const { yil, ay, etiket } = route.params;
  const { ekip, izinGunu, overrides, resmiTatilTarihleri } = useSchedule();
  const [secilenTarih, setSecilenTarih] = useState<string | null>(null);

  const planlar = useMemo(
    () => ayGunlukPlanlari(yil, ay, ekip, { izinGunu, overrides, resmiTatilTarihleri }),
    [yil, ay, ekip, izinGunu, overrides, resmiTatilTarihleri]
  );

  const planMap = useMemo(
    () => new Map(planlar.map((p) => [p.tarih, p])),
    [planlar]
  );

  const aylikOzet = useMemo(() => saatOzet(planlar, ekip), [planlar, ekip]);

  const haftalar = useMemo(() => {
    const map = new Map<string, { bas: Date; gunler: typeof planlar }>();
    for (const g of planlar) {
      const d = tarihToDate(g.tarih);
      const key = haftaKey(d);
      const pzt = haftaBasiPazartesi(d);
      const cur = map.get(key);
      if (!cur) map.set(key, { bas: pzt, gunler: [g] as any });
      else (cur.gunler as any).push(g);
    }
    return Array.from(map.values()).sort((a, b) => a.bas.getTime() - b.bas.getTime());
  }, [planlar]);

  const secilenPlan = secilenTarih ? planMap.get(secilenTarih) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.head}>{etiket}</Text>
            <Text style={styles.sub}>Haftalık raporlar — güne dokunarak detay görün</Text>
            {user ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                  {user.ad}
                </Text>
                <RolRozeti rol={user.rol} size="sm" />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.ozetKart}>
          <Text style={styles.ozetBaslik}>Aylık toplam</Text>
          {aylikOzet.map(({ uye, saat }) => {
            const oran = Math.min(1, saat / AYLIK_HEDEF_SAAT);
            const renk = oran >= 0.9 ? colors.morning : oran >= 0.5 ? colors.primary : colors.afternoon;
            return (
              <View key={uye.id} style={styles.ozetSatir}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, maxWidth: 168, flexShrink: 0 }}>
                  <Text style={[styles.ozetAd, { width: undefined, flexShrink: 1 }]} numberOfLines={1}>
                    {uye.ad}
                  </Text>
                  <RolRozeti rol={uye.rol} size="sm" />
                </View>
                <View style={styles.ozetTrack}>
                  <View style={[styles.ozetFill, { width: `${oran * 100}%`, backgroundColor: renk }]} />
                </View>
                <Text style={[styles.ozetSaat, { color: renk }]}>{saat}sa</Text>
              </View>
            );
          })}
        </View>

        {haftalar.map((h, hIdx) => {
          const aralik = `${h.bas.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${new Date(
            h.bas.getTime() + 6 * 86400000
          ).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`;

          const gunMap = new Map(h.gunler.map((g) => [g.tarih, g]));
          const gunler = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(h.bas);
            d.setDate(h.bas.getDate() + i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return { tarih: key, plan: gunMap.get(key) };
          });

          const haftaUyeSaat = ekip.map((u) => {
            let toplam = 0;
            for (const g of h.gunler) {
              const v = g.atamalar[u.id];
              if (v) toplam += shiftKindSaat(v);
            }
            return { uye: u, saat: Math.round(toplam * 10) / 10 };
          });

          return (
            <View key={`h-${hIdx}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.cardTitle}>{aralik}</Text>
              </View>

              <View style={styles.gunBaslikRow}>
                <View style={[styles.isimCol, { width: 102 }]} />
                {GUN_KISA.map((g, i) => (
                  <View key={g} style={styles.gunCol}>
                    <Text style={[styles.gunBaslik, i >= 5 && { color: colors.antre }]}>{g}</Text>
                  </View>
                ))}
              </View>

              {ekip.map((u) => (
                <View key={u.id} style={styles.row}>
                  <View style={[styles.isimCol, { width: 102, alignItems: "flex-start", gap: 4 }]}>
                    <Text style={styles.name} numberOfLines={1}>
                      {u.ad}
                    </Text>
                    <RolRozeti rol={u.rol} size="sm" />
                  </View>
                  <View style={styles.badges}>
                    {gunler.map((g, idx) => {
                      const v = (g.plan?.atamalar[u.id] ?? null) as ShiftKind | null;
                      if (!v) {
                        return (
                          <View key={idx} style={styles.gunCol}>
                            <View style={styles.badgeEmpty} />
                          </View>
                        );
                      }
                      const r = vardiyaRenk(v, colors);
                      return (
                        <Pressable key={idx} style={styles.gunCol} onPress={() => g.plan && setSecilenTarih(g.tarih)}>
                          <View style={[styles.badge, { borderColor: r, backgroundColor: r + "22" }]}>
                            <Text style={[styles.badgeText, { color: r }]}>{vardiyaKisa(v)}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={styles.haftaSaatRow}>
                {haftaUyeSaat.map(({ uye, saat }) => (
                  <View key={uye.id} style={styles.haftaSaatItem}>
                    <Text style={styles.haftaSaatAd} numberOfLines={1}>
                      {uye.ad.split(" ")[0]}
                    </Text>
                    <Text style={styles.haftaSaatDeger}>{saat}sa</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {secilenPlan && secilenTarih && (
        <GunDetayModal
          plan={secilenPlan}
          tarih={secilenTarih}
          onKapat={() => setSecilenTarih(null)}
          styles={styles}
          themeColors={colors}
        />
      )}
    </View>
  );
}
