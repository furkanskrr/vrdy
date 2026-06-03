import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import { useAuth } from "../context/AuthContext";
import type { MainStackParamList } from "../navigation/types";
import type { TeamRole } from "../types";
import { RolRozeti } from "../components/RolRozeti";

type Props = NativeStackScreenProps<MainStackParamList, "HesapBilgileri">;

const ROL_ETIKET: Record<string, string> = {
  mudur: "Müdür",
  yardimci: "Müdür Yrd.",
  personel: "Personel",
};

function basHarfler(ad: string, email: string): string {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  if (parcalar.length >= 2) {
    return (parcalar[0][0] + parcalar[parcalar.length - 1][0]).toUpperCase();
  }
  if (parcalar.length === 1 && parcalar[0].length >= 2) {
    return parcalar[0].slice(0, 2).toUpperCase();
  }
  if (parcalar.length === 1) {
    return parcalar[0][0].toUpperCase();
  }
  const e = email.trim();
  return e.length >= 2 ? e.slice(0, 2).toUpperCase() : "?";
}

function formatTarih(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function createHesapStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bg,
    },
    topBarBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
    },
    topBarTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
    },
    topBarSpacer: { width: 44 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginTop: 22,
      marginBottom: 10,
      marginLeft: 2,
    },
    hero: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: "center",
      overflow: "hidden",
    },
    heroAccent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: colors.primary,
      opacity: 0.85,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 28,
      backgroundColor: colors.primary + "35",
      borderWidth: 2,
      borderColor: colors.primary + "55",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -1,
    },
    heroName: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      letterSpacing: -0.4,
    },
    heroEmail: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
      maxWidth: "100%",
      paddingHorizontal: 8,
    },
    rolPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    rolPillText: { fontSize: 13, fontWeight: "700" },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 56,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    infoRowSon: { paddingBottom: 16 },
    infoIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + "18",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    infoRowBody: { flex: 1, minWidth: 0 },
    infoRowLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    infoRowValue: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      lineHeight: 22,
    },
    infoRowMono: {
      fontSize: 11,
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
      fontWeight: "500",
      color: colors.textMuted,
      lineHeight: 16,
    },
    kodRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    kodRowBody: { flex: 1, marginRight: 8 },
    kodDeger: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 3,
      marginTop: 2,
    },
    kodPaylasBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    durumSatir: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    durumEtiket: { fontSize: 14, fontWeight: "600", color: colors.text },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    chipOk: { backgroundColor: colors.morning + "22" },
    chipBekle: { backgroundColor: colors.afternoon + "22" },
    chipDot: { width: 6, height: 6, borderRadius: 3 },
    chipDotOk: { backgroundColor: colors.morning },
    chipDotBekle: { backgroundColor: colors.afternoon },
    chipText: { fontSize: 12, fontWeight: "700" },
    chipTextOk: { color: colors.morning },
    chipTextBekle: { color: colors.afternoon },
    navCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginTop: 6,
    },
    navCardSol: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
    navIconBg: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    navCardBaslik: { fontSize: 16, fontWeight: "700", color: colors.text },
    navCardAlt: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    aciklamaKisa: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
    },
    input: {
      marginHorizontal: 16,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
    },
    btnKaydet: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 16,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
    },
    btnKaydetPasif: { opacity: 0.45 },
    btnKaydetText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    bilgiKutu: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginTop: 20,
      padding: 16,
      backgroundColor: colors.surface2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bilgiKutuText: {
      flex: 1,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
    },
    footerNote: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 20,
      lineHeight: 18,
      paddingHorizontal: 12,
    },
    pressed: { opacity: 0.88 },
  });
}

export function HesapBilgileriScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createHesapStyles(colors), [colors]);
  const rolRenk = useMemo(
    (): Record<TeamRole, string> => ({
      mudur: colors.primary,
      yardimci: colors.fullday,
      personel: colors.morning,
    }),
    [colors]
  );

  const { user, session, isMudur, profilGuncelle, refreshProfil } = useAuth();

  const [ad, setAd] = useState(user?.ad ?? "");
  const [busyAd, setBusyAd] = useState(false);

  const email = user?.email ?? session?.user?.email ?? "";
  const rol = user?.rol ?? "personel";
  const harfler = useMemo(() => basHarfler(user?.ad ?? "", email), [user?.ad, email]);

  const authUser = session?.user;
  const uyelikTarihi = formatTarih(authUser?.created_at);
  const sonGiris = formatTarih(authUser?.last_sign_in_at);

  useEffect(() => {
    setAd(user?.ad ?? "");
  }, [user?.ad]);

  async function adKaydet() {
    if (!ad.trim()) {
      Alert.alert("Hata", "Ad boş olamaz.");
      return;
    }
    setBusyAd(true);
    try {
      await profilGuncelle({ ad: ad.trim() });
      await refreshProfil();
      Alert.alert("Tamam", "Görünen adınız güncellendi.");
    } finally {
      setBusyAd(false);
    }
  }

  async function grupKoduPaylas() {
    const kod = user?.grupKodu;
    if (!kod?.trim()) return;
    try {
      await Share.share({
        message: `Vardiyam? grup davet kodu: ${kod}\n\nBu kodu ekibinizle paylaşarak gruba katılmalarını sağlayabilirsiniz.`,
        title: "Grup kodu",
      });
    } catch {
      /* iptal */
    }
  }

  const adDegisti = ad.trim() !== (user?.ad ?? "").trim();

  function SectionLabel({ children }: { children: string }) {
    return <Text style={styles.sectionLabel}>{children}</Text>;
  }

  function InfoRow({
    icon,
    label,
    value,
    valueMono,
    selectable,
    son,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    valueMono?: boolean;
    selectable?: boolean;
    son?: boolean;
  }) {
    return (
      <View style={[styles.infoRow, son && styles.infoRowSon]}>
        <View style={styles.infoIconWrap}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.infoRowBody}>
          <Text style={styles.infoRowLabel}>{label}</Text>
          <Text
            style={[styles.infoRowValue, valueMono && styles.infoRowMono]}
            selectable={selectable}
            numberOfLines={valueMono ? 3 : 4}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top, 8) }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.topBarBtn, pressed && styles.pressed]}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Profil</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{harfler}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={styles.heroName}>{user?.ad?.trim() || "İsimsiz kullanıcı"}</Text>
            {user ? <RolRozeti rol={user.rol} size="lg" /> : null}
          </View>
          <Text style={styles.heroEmail} numberOfLines={1}>
            {email || "—"}
          </Text>
          <View style={[styles.rolPill, { borderColor: rolRenk[rol] + "66", backgroundColor: rolRenk[rol] + "22" }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={rolRenk[rol]} />
            <Text style={[styles.rolPillText, { color: rolRenk[rol] }]}>{ROL_ETIKET[rol] ?? rol}</Text>
          </View>
        </View>

        <SectionLabel>Organizasyon</SectionLabel>
        <View style={styles.card}>
          {user?.magazaAdi ? (
            <InfoRow icon="storefront-outline" label="Mağaza" value={user.magazaAdi} />
          ) : (
            <InfoRow icon="storefront-outline" label="Mağaza" value="Henüz atanmadı" son={!user?.grupKodu} />
          )}
          {user?.grupKodu ? (
            <>
              <View style={styles.divider} />
              <View style={styles.kodRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.kodRowBody}>
                  <Text style={styles.infoRowLabel}>Grup davet kodu</Text>
                  <Text style={styles.kodDeger}>{user.grupKodu}</Text>
                </View>
                <Pressable
                  onPress={() => void grupKoduPaylas()}
                  style={({ pressed }) => [styles.kodPaylasBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="share-outline" size={20} color={colors.primary} />
                </Pressable>
              </View>
            </>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.durumSatir}>
            <Text style={styles.durumEtiket}>Hesap durumu</Text>
            <View style={[styles.chip, user?.onboarded ? styles.chipOk : styles.chipBekle]}>
              <View style={[styles.chipDot, user?.onboarded ? styles.chipDotOk : styles.chipDotBekle]} />
              <Text style={[styles.chipText, user?.onboarded ? styles.chipTextOk : styles.chipTextBekle]}>
                {user?.onboarded ? "Gruba bağlı" : "Grup bekleniyor"}
              </Text>
            </View>
          </View>
        </View>

        <SectionLabel>Oturum ve güvenlik</SectionLabel>
        <View style={styles.card}>
          <InfoRow icon="mail-outline" label="E-posta" value={email || "—"} selectable />
          <View style={styles.divider} />
          <InfoRow icon="calendar-outline" label="Üyelik tarihi" value={uyelikTarihi} />
          <View style={styles.divider} />
          <InfoRow icon="time-outline" label="Son oturum açılışı" value={sonGiris} />
          <View style={styles.divider} />
          <InfoRow
            icon="finger-print-outline"
            label="Kullanıcı kimliği"
            value={authUser?.id ?? "—"}
            valueMono
            selectable
            son
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.navCard, pressed && styles.pressed]}
          onPress={() => navigation.navigate("SifreBelirle")}
        >
          <View style={styles.navCardSol}>
            <View style={[styles.navIconBg, { backgroundColor: colors.primary + "28" }]}>
              <Ionicons name="key-outline" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.navCardBaslik}>Şifre ve güvenlik</Text>
              <Text style={styles.navCardAlt}>Şifrenizi güncelleyin</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <SectionLabel>Görünen ad</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.aciklamaKisa}>
            Ekip listelerinde ve bildirimlerde bu isim görünür. {isMudur ? "" : "Rolünüzü yalnızca müdür değiştirebilir."}
          </Text>
          <TextInput
            style={styles.input}
            value={ad}
            onChangeText={setAd}
            placeholder="Adınız ve soyadınız"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
          <Pressable
            style={({ pressed }) => [
              styles.btnKaydet,
              (!adDegisti || busyAd) && styles.btnKaydetPasif,
              pressed && adDegisti && !busyAd && styles.pressed,
            ]}
            onPress={() => void adKaydet()}
            disabled={!adDegisti || busyAd}
          >
            {busyAd ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.btnKaydetText}>Değişiklikleri kaydet</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.bilgiKutu}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
          <Text style={styles.bilgiKutuText}>
            Şifre sıfırlama e-postadaki kod ile yapılır: giriş ekranı → Şifremi unuttum. E-posta adresiniz burada
            değiştirilemez.
          </Text>
        </View>

        {!isMudur ? (
          <Text style={styles.footerNote}>Mağaza adı ve rol bilgisi yalnızca müdür tarafından güncellenebilir.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
