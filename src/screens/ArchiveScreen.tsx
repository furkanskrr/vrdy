import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import { rolEtiket } from "../data/team";
import { arsivAylar, ayGunlukPlanlari, saatOzet } from "../data/mockSchedule";
import { AYLIK_HEDEF_SAAT } from "../constants/shifts";
import { useSchedule } from "../context/ScheduleContext";
import { useAuth } from "../context/AuthContext";
import { RolRozeti } from "../components/RolRozeti";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ArchiveStackParamList } from "./ArchiveMonthScreen";
import type { ShiftKind } from "../types";

type Props = NativeStackScreenProps<ArchiveStackParamList, "ArsivListe">;

type ArchiveListeStyles = ReturnType<typeof createArchiveListeStyles>;

function createArchiveListeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 16, paddingBottom: 40 },

    headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
    headerText: { flex: 1 },
    head: { fontSize: 24, fontWeight: "800", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.primaryMuted + "22",
      borderRadius: 12,
      padding: 14,
      marginTop: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.primaryMuted + "44",
    },
    infoText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text },

    cardStats: { flexDirection: "row", gap: 12, marginBottom: 14 },
    cardStat: {
      backgroundColor: colors.surface2,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      alignItems: "center",
    },
    cardStatNum: { fontSize: 18, fontWeight: "800", color: colors.text },
    cardStatLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "600", marginTop: 2 },

    uyeListesi: { gap: 8 },
    uyeSatir: { flexDirection: "row", alignItems: "center" },
    uyeAd: { width: 90, fontSize: 12, color: colors.text, fontWeight: "600" },
    miniTrack: {
      flex: 1,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.surface2,
      marginHorizontal: 8,
      overflow: "hidden",
    },
    miniFill: { height: 5, borderRadius: 3 },
    uyeSaat: { fontSize: 12, fontWeight: "700", width: 42, textAlign: "right" },
  });
}

function AyKart({
  yil,
  ay,
  etiket,
  onPress,
  st,
  themeColors,
}: {
  yil: number;
  ay: number;
  etiket: string;
  onPress: () => void;
  st: ArchiveListeStyles;
  themeColors: ThemeColors;
}) {
  const { ekip, izinGunu, overrides, resmiTatilTarihleri } = useSchedule();
  const planlar = useMemo(
    () => ayGunlukPlanlari(yil, ay, ekip, { izinGunu, overrides, resmiTatilTarihleri }),
    [yil, ay, ekip, izinGunu, overrides, resmiTatilTarihleri]
  );
  const ozet = useMemo(() => saatOzet(planlar, ekip), [planlar, ekip]);

  const vardiyaDagilim = useMemo(() => {
    const s: Partial<Record<ShiftKind, number>> = {};
    for (const p of planlar) {
      for (const u of ekip) {
        const v = p.atamalar[u.id];
        if (v) s[v] = (s[v] || 0) + 1;
      }
    }
    return s;
  }, [planlar, ekip]);

  const tamGun = vardiyaDagilim.tamgun ?? 0;
  const izinGunler = vardiyaDagilim.izin ?? 0;
  const toplamGun = planlar.length;

  return (
    <TouchableOpacity style={st.card} onPress={onPress} activeOpacity={0.7}>
      <View style={st.cardHeader}>
        <View style={st.cardHeaderLeft}>
          <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
          <Text style={st.cardTitle}>{etiket}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
      </View>

      <View style={st.cardStats}>
        <View style={st.cardStat}>
          <Text style={st.cardStatNum}>{toplamGun}</Text>
          <Text style={st.cardStatLabel}>Gün</Text>
        </View>
        <View style={st.cardStat}>
          <Text style={[st.cardStatNum, { color: themeColors.fullday }]}>{tamGun}</Text>
          <Text style={st.cardStatLabel}>Tam gün</Text>
        </View>
        <View style={st.cardStat}>
          <Text style={[st.cardStatNum, { color: themeColors.off }]}>{izinGunler}</Text>
          <Text style={st.cardStatLabel}>İzin</Text>
        </View>
      </View>

      <View style={st.uyeListesi}>
        {ozet.map(({ uye, saat }) => {
          const oran = Math.min(1, saat / AYLIK_HEDEF_SAAT);
          const renk =
            oran >= 0.9 ? themeColors.morning : oran >= 0.5 ? themeColors.primary : themeColors.afternoon;
          return (
            <View key={uye.id} style={st.uyeSatir}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, maxWidth: 150, flexShrink: 0 }}>
                <Text style={[st.uyeAd, { width: undefined, flexShrink: 1 }]} numberOfLines={1}>
                  {uye.ad}
                </Text>
                <RolRozeti rol={uye.rol} size="sm" />
              </View>
              <View style={st.miniTrack}>
                <View style={[st.miniFill, { width: `${oran * 100}%`, backgroundColor: renk }]} />
              </View>
              <Text style={[st.uyeSaat, { color: renk }]}>{saat}sa</Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

export function ArchiveScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createArchiveListeStyles(colors), [colors]);
  const aylar = arsivAylar(6);

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Ionicons name="archive-outline" size={24} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={styles.head}>Arşiv</Text>
          <Text style={styles.sub}>Son 6 aylık vardiya geçmişi</Text>
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

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.infoText}>
          Aya dokunarak haftalık detaylı raporlara ulaşabilirsiniz. Hedef: kişi başı aylık{" "}
          {AYLIK_HEDEF_SAAT} saat.
        </Text>
      </View>

      {aylar.map((a) => (
        <AyKart
          key={`${a.yil}-${a.ay}`}
          yil={a.yil}
          ay={a.ay}
          etiket={a.etiket}
          st={styles}
          themeColors={colors}
          onPress={() => navigation.navigate("ArsivAy", { yil: a.yil, ay: a.ay, etiket: a.etiket })}
        />
      ))}
    </ScrollView>
  );
}
