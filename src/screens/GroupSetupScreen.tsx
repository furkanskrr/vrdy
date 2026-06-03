import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";
import { useAuth } from "../context/AuthContext";

type Mod = "secim" | "olustur" | "katil";

function createGroupSetupStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingHorizontal: 24, paddingBottom: 40 },
    geriBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
    geriBtnText: { color: colors.text, fontWeight: "600", fontSize: 15 },
    header: { alignItems: "center", marginBottom: 28 },
    logoCircle: {
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    baslik: { fontSize: 26, fontWeight: "900", color: colors.text },
    altBaslik: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    secimCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secimIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    secimInfo: { flex: 1 },
    secimBaslik: { fontSize: 16, fontWeight: "700", color: colors.text },
    secimAciklama: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    label: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 10 },
    kodInput: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 20,
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 8,
    },
    devamBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
    },
    devamBtnDisabled: { opacity: 0.4 },
    devamBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
    onizlemeCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    onizlemeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    onizlemeLabel: { flex: 1, fontSize: 13, color: colors.textMuted },
    onizlemeValue: { fontSize: 14, fontWeight: "700", color: colors.text },
    successHeader: { alignItems: "center", marginBottom: 28 },
    successCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.morning,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    successBaslik: { fontSize: 26, fontWeight: "900", color: colors.text },
    successAlt: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 8, lineHeight: 20 },
    kodCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      marginBottom: 20,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    kodLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600", marginBottom: 8 },
    kodText: { fontSize: 36, fontWeight: "900", color: colors.primary, letterSpacing: 6 },
    paylasBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      marginBottom: 20,
    },
    paylasBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
    anaEkranBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.surface,
      paddingVertical: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.primary,
      marginBottom: 16,
    },
    anaEkranBtnText: { color: colors.primary, fontSize: 17, fontWeight: "700" },
    bilgiText: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  });
}

export function GroupSetupScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createGroupSetupStyles(colors), [colors]);
  const scrollPad = useMemo(
    () => [styles.scroll, { paddingTop: ustEkranBoslugu(insets.top, 16) }],
    [insets.top, styles]
  );
  const { user, grupOlustur, grupKurulumuYerelTamamla, grubaKatil } = useAuth();
  const [mod, setMod] = useState<Mod>("secim");
  const [olusturSonuc, setOlusturSonuc] = useState<{ kod: string; groupId: string } | null>(null);
  const [katilKodu, setKatilKodu] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const isMudur = user?.rol === "mudur";

  async function handleOlustur() {
    setYukleniyor(true);
    try {
      const sonuc = await grupOlustur();
      if (sonuc) setOlusturSonuc(sonuc);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Grup oluşturulamadı.");
    } finally {
      setYukleniyor(false);
    }
  }

  async function handleKatil() {
    const temiz = katilKodu.toUpperCase().trim();
    if (temiz.length < 4) {
      Alert.alert("Hata", "Geçerli bir grup kodu girin.");
      return;
    }
    setYukleniyor(true);
    try {
      const hata = await grubaKatil(temiz);
      if (hata) Alert.alert("Hata", hata);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Bağlantı hatası.");
    } finally {
      setYukleniyor(false);
    }
  }

  async function paylas(kod: string) {
    try {
      await Share.share({
        message: `Vardiyam? ekip daveti!\n\nMağaza: ${user?.magazaAdi}\nGrup kodu: ${kod}\n\nUygulamayı indir ve bu kodla ekibe katıl.`,
      });
    } catch {
      /* iptal */
    }
  }

  if (olusturSonuc) {
    const { kod } = olusturSonuc;
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={scrollPad} showsVerticalScrollIndicator={false}>
          <View style={styles.successHeader}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={styles.successBaslik}>Grup oluşturuldu!</Text>
            <Text style={styles.successAlt}>Aşağıdaki kodu ekip arkadaşlarınla paylaş.</Text>
          </View>

          <View style={styles.kodCard}>
            <Text style={styles.kodLabel}>Grup Kodu</Text>
            <Text style={styles.kodText}>{kod}</Text>
          </View>

          <Pressable style={styles.paylasBtn} onPress={() => paylas(kod)}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.paylasBtnText}>Kodu paylaş</Text>
          </Pressable>

          <Pressable
            style={styles.anaEkranBtn}
            onPress={() => grupKurulumuYerelTamamla(olusturSonuc.kod, olusturSonuc.groupId)}
          >
            <Ionicons name="arrow-forward-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.anaEkranBtnText}>Ana ekrana geç</Text>
          </Pressable>

          <Text style={styles.bilgiText}>
            Ekip üyeleri bu kodu girerek gruba katılabilir. Tüm vardiya ve izin değişiklikleri grubun tamamına anlık olarak
            yansır.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (mod === "olustur") {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={scrollPad} showsVerticalScrollIndicator={false}>
          <Pressable
            style={styles.geriBtn}
            onPress={() => setMod("secim")}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={styles.geriBtnText}>Geri</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: colors.morning }]}>
              <Ionicons name="add-circle" size={32} color="#fff" />
            </View>
            <Text style={styles.baslik}>Yeni grup oluştur</Text>
            <Text style={styles.altBaslik}>{user?.magazaAdi} mağazası için yeni bir ekip grubu oluşturulacak.</Text>
          </View>

          <View style={styles.onizlemeCard}>
            <View style={styles.onizlemeRow}>
              <Ionicons name="storefront-outline" size={16} color={colors.textMuted} />
              <Text style={styles.onizlemeLabel}>Mağaza</Text>
              <Text style={styles.onizlemeValue}>{user?.magazaAdi}</Text>
            </View>
            <View style={styles.onizlemeRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
              <Text style={styles.onizlemeLabel}>Rolünüz</Text>
              <Text style={styles.onizlemeValue}>Müdür (Yönetici)</Text>
            </View>
          </View>

          <Pressable style={styles.devamBtn} onPress={handleOlustur} disabled={yukleniyor}>
            {yukleniyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={styles.devamBtnText}>Grubu oluştur</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (mod === "katil") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={scrollPad}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.geriBtn}
            onPress={() => setMod("secim")}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={styles.geriBtnText}>Geri</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: colors.fullday }]}>
              <Ionicons name="enter-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.baslik}>Gruba katıl</Text>
            <Text style={styles.altBaslik}>Müdürünüzden aldığınız 6 haneli grup kodunu girin.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Grup Kodu</Text>
            <TextInput
              style={styles.kodInput}
              placeholder="XXXXXX"
              placeholderTextColor={colors.textMuted}
              value={katilKodu}
              onChangeText={(t) => setKatilKodu(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              textAlign="center"
            />
          </View>

          <Pressable
            style={[styles.devamBtn, katilKodu.trim().length < 4 && styles.devamBtnDisabled]}
            onPress={handleKatil}
            disabled={katilKodu.trim().length < 4 || yukleniyor}
          >
            {yukleniyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="enter-outline" size={20} color="#fff" />
                <Text style={styles.devamBtnText}>Gruba katıl</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={scrollPad} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="people" size={32} color="#fff" />
          </View>
          <Text style={styles.baslik}>Ekip kurulumu</Text>
          <Text style={styles.altBaslik}>
            {isMudur
              ? "Müdür olarak yeni bir grup oluşturabilir veya mevcut bir gruba katılabilirsiniz."
              : "Müdürünüzün paylaştığı grup kodunu girerek ekibe katılın."}
          </Text>
        </View>

        {isMudur && (
          <Pressable style={styles.secimCard} onPress={() => setMod("olustur")}>
            <View style={[styles.secimIconWrap, { backgroundColor: colors.morning }]}>
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
            </View>
            <View style={styles.secimInfo}>
              <Text style={styles.secimBaslik}>Yeni grup oluştur</Text>
              <Text style={styles.secimAciklama}>Ekip kodunu oluştur ve arkadaşlarınla paylaş</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}

        <Pressable style={styles.secimCard} onPress={() => setMod("katil")}>
          <View style={[styles.secimIconWrap, { backgroundColor: colors.fullday }]}>
            <Ionicons name="enter-outline" size={28} color="#fff" />
          </View>
          <View style={styles.secimInfo}>
            <Text style={styles.secimBaslik}>Mevcut gruba katıl</Text>
            <Text style={styles.secimAciklama}>Müdürünüzden aldığınız kodu girin</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
