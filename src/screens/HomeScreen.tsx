import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import { uyeBul } from "../data/team";
import { ayGunlukPlanlari, bugununPlani, saatOzet } from "../data/mockSchedule";
import { vardiyaEtiket, vardiyaRenk, vardiyaSaatAraligi } from "../lib/vardiya";
import { shiftKindSaat, AYLIK_HEDEF_SAAT } from "../constants/shifts";
import { HoursBar } from "../components/HoursBar";
import { RolRozeti } from "../components/RolRozeti";
import { useSchedule } from "../context/ScheduleContext";
import { useAuth } from "../context/AuthContext";
import type { ShiftKind, TeamRole } from "../types";

function createHomeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
    selamRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    head: { fontSize: 26, fontWeight: "800", color: colors.text },
    date: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    magazaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    magazaText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },

    bosCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 40,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 20,
    },
    bosBaslik: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 16 },
    bosAciklama: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
    },

    statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNum: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 6 },
    statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: "600" },

    section: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 8, marginBottom: 12 },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    cardLeft: { flex: 1, marginRight: 12 },
    ad: { color: colors.text, fontSize: 15, fontWeight: "700" },
    rol: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    shiftBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
    shiftLabel: { fontSize: 13, fontWeight: "700" },
    cardBottom: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cardInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
    cardInfoText: { fontSize: 12, color: colors.textMuted },

    hedefCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hedefText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  });
}

function selamla(): { mesaj: string; ikon: keyof typeof Ionicons.glyphMap } {
  const saat = new Date().getHours();
  if (saat < 6) return { mesaj: "İyi geceler", ikon: "moon-outline" };
  if (saat < 12) return { mesaj: "Günaydın", ikon: "sunny-outline" };
  if (saat < 18) return { mesaj: "İyi günler", ikon: "partly-sunny-outline" };
  return { mesaj: "İyi akşamlar", ikon: "moon-outline" };
}

function VardiyaKarti({
  ad,
  teamRol,
  shift,
  partnerAd,
}: {
  ad: string;
  teamRol: TeamRole;
  shift: ShiftKind;
  partnerAd?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createHomeStyles(colors), [colors]);
  const renk = vardiyaRenk(shift, colors);
  const saat = shiftKindSaat(shift);
  return (
    <View style={[styles.card, { borderLeftColor: renk, borderLeftWidth: 4 }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={styles.ad}>{ad}</Text>
            <RolRozeti rol={teamRol} size="sm" />
          </View>
        </View>
        <View style={[styles.shiftBadge, { backgroundColor: renk + "22", borderColor: renk }]}>
          <Text style={[styles.shiftLabel, { color: renk }]}>{vardiyaEtiket(shift)}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.cardInfo}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.cardInfoText}>{vardiyaSaatAraligi(shift)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Ionicons name="hourglass-outline" size={13} color={colors.textMuted} />
          <Text style={styles.cardInfoText}>{saat > 0 ? `${saat} saat` : "—"}</Text>
        </View>
        {partnerAd && (
          <View style={styles.cardInfo}>
            <Ionicons name="people-outline" size={13} color={colors.textMuted} />
            <Text style={styles.cardInfoText}>Partner: {partnerAd}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createHomeStyles(colors), [colors]);
  const { ekip, izinGunu, overrides, resmiTatilTarihleri } = useSchedule();
  const { user } = useAuth();
  const bugun = bugununPlani(new Date(), ekip, { izinGunu, overrides, resmiTatilTarihleri });
  const simdi = new Date();
  const ayPlan = ayGunlukPlanlari(simdi.getFullYear(), simdi.getMonth() + 1, ekip, {
    izinGunu,
    overrides,
    resmiTatilTarihleri,
  });
  const aylikOzet = saatOzet(ayPlan, ekip);
  const { mesaj, ikon } = selamla();

  const tarihStr = simdi.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const ayBaslik = simdi.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  const bugunCalisan = bugun
    ? ekip.filter((u) => bugun.atamalar[u.id] !== "izin" && bugun.atamalar[u.id] !== "envanter_izni").length
    : 0;
  const bugunIzinli = bugun ? ekip.length - bugunCalisan : 0;

  const ekipBos = ekip.length === 0;

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.selamRow}>
            <Ionicons name={ikon} size={22} color={colors.primary} />
            <Text style={[styles.head, { flex: 1 }]} numberOfLines={2}>
              {mesaj}
              {user?.ad?.trim() ? `, ${user.ad.trim()}` : ""}
            </Text>
            {user ? <RolRozeti rol={user.rol} size="md" /> : null}
          </View>
          <Text style={styles.date}>{tarihStr}</Text>
          {user?.magazaAdi ? (
            <View style={styles.magazaRow}>
              <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
              <Text style={styles.magazaText}>{user.magazaAdi}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {ekipBos ? (
        <View style={styles.bosCard}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.bosBaslik}>Ekip henüz oluşturulmadı</Text>
          <Text style={styles.bosAciklama}>
            Ayarlar sekmesinden ekip üyelerini ekleyin.{"\n"}
            Ekip eklendikten sonra vardiyalar otomatik hesaplanır.
          </Text>
        </View>
      ) : (
        <>
          {bugun && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={20} color={colors.morning} />
                <Text style={styles.statNum}>{bugunCalisan}</Text>
                <Text style={styles.statLabel}>Çalışan</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="bed-outline" size={20} color={colors.off} />
                <Text style={styles.statNum}>{bugunIzinli}</Text>
                <Text style={styles.statLabel}>İzinli</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.statNum}>{simdi.getDate()}</Text>
                <Text style={styles.statLabel}>Gün</Text>
              </View>
            </View>
          )}

          <Text style={styles.section}>Bugünkü vardiyalar</Text>
          {ekip.map((u) => {
            const v = bugun?.atamalar[u.id] ?? "sabah";
            const partner = uyeBul(ekip, u.partnerId);
            return (
              <VardiyaKarti
                key={u.id}
                ad={u.ad}
                teamRol={u.rol}
                shift={v}
                partnerAd={partner?.ad}
              />
            );
          })}

          <Text style={styles.section}>{ayBaslik} — çalışma süreleri</Text>
          <View style={styles.hedefCard}>
            <Ionicons name="flag-outline" size={16} color={colors.primary} />
            <Text style={styles.hedefText}>Aylık hedef: {AYLIK_HEDEF_SAAT} saat</Text>
          </View>
          {aylikOzet.map(({ uye, saat }) => (
            <HoursBar key={uye.id} uye={uye} saat={saat} hedef={AYLIK_HEDEF_SAAT} />
          ))}
        </>
      )}
    </ScrollView>
  );
}
