import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import type { TeamRole } from "../types";
import { RolRozeti } from "../components/RolRozeti";

const ROLLER: { rol: TeamRole; baslik: string; aciklama: string; ikon: keyof typeof Ionicons.glyphMap }[] = [
  {
    rol: "mudur",
    baslik: "Müdür",
    aciklama: "Ekibi yönet, vardiya ve izinleri düzenle, grup oluştur",
    ikon: "shield-checkmark-outline",
  },
  {
    rol: "yardimci",
    baslik: "Müdür Yardımcısı",
    aciklama: "Vardiyaları görüntüle, müdürün partneri",
    ikon: "people-outline",
  },
  {
    rol: "personel",
    baslik: "Personel",
    aciklama: "Vardiyaları görüntüle, ekip üyesi",
    ikon: "person-outline",
  },
];

function createOnboardingStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { paddingHorizontal: 24, paddingBottom: 40 },

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
      paddingHorizontal: 16,
    },

    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    label: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: colors.text, paddingVertical: 14, fontSize: 15 },

    rolHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 18 },

    rolCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface2,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    rolCardSecili: { borderColor: colors.primary, backgroundColor: colors.primaryMuted + "22" },
    rolIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    rolIconSecili: { backgroundColor: colors.primary },
    rolInfo: { flex: 1 },
    rolBaslik: { fontSize: 15, fontWeight: "700", color: colors.text },
    rolBaslikSecili: { color: colors.primary },
    rolAciklama: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 16 },

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

    geriBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    geriText: { fontSize: 16, fontWeight: "600", color: colors.primary },
  });
}

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createOnboardingStyles(colors), [colors]);
  const scrollPad = useMemo(
    () => [styles.scroll, { paddingTop: ustEkranBoslugu(insets.top, 16) }],
    [insets.top, styles]
  );
  const { user, profilTamamla, cikisYap } = useAuth();
  const [magazaAdi, setMagazaAdi] = useState("");
  const [secilenRol, setSecilenRol] = useState<TeamRole | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const mudurMu = secilenRol === "mudur";
  const devamEdebilir = secilenRol !== null && (!mudurMu || magazaAdi.trim().length >= 2);

  async function devam() {
    if (!devamEdebilir || !secilenRol || kaydediyor) return;
    setKaydediyor(true);
    try {
      await profilTamamla(mudurMu ? magazaAdi.trim() : "", secilenRol);
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Kurulum kaydedilemedi.");
    } finally {
      setKaydediyor(false);
    }
  }

  function geri() {
    Alert.alert(
      "Giriş ekranına dön",
      "Kurulum yarım kaldıysa çıkış yaparak giriş veya kayıt ekranına dönebilirsiniz.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış yap",
          style: "destructive",
          onPress: () => {
            void cikisYap();
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={scrollPad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.geriBtn}
          onPress={geri}
          accessibilityRole="button"
          accessibilityLabel="Giriş ekranına dön"
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.geriText}>Geri</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="storefront" size={32} color="#fff" />
          </View>
          <Text style={styles.baslik}>Kurulum</Text>
          <Text style={styles.altBaslik}>
            Hoş geldin{user?.ad ? `, ${user.ad}` : ""}! Önce mağazadaki rolünü seç. Mağaza adını yalnızca müdür girer.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 10 }}>
            <RolRozeti rol={secilenRol ?? user?.rol ?? "personel"} size="md" />
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Rolünüz</Text>
          <Text style={styles.rolHint}>
            Müdür grup oluşturur ve mağaza adını belirler; yardımcı ve personel yalnızca rolünü seçer, sonra grup kodu ile
            katılır.
          </Text>

          {ROLLER.map((r) => {
            const secili = secilenRol === r.rol;
            return (
              <Pressable
                key={r.rol}
                style={[styles.rolCard, secili && styles.rolCardSecili]}
                onPress={() => {
                  setSecilenRol(r.rol);
                  if (r.rol !== "mudur") setMagazaAdi("");
                }}
              >
                <View style={[styles.rolIconWrap, secili && styles.rolIconSecili]}>
                  <Ionicons name={r.ikon} size={22} color={secili ? "#fff" : colors.textMuted} />
                </View>
                <View style={styles.rolInfo}>
                  <Text style={[styles.rolBaslik, secili && styles.rolBaslikSecili]}>{r.baslik}</Text>
                  <Text style={styles.rolAciklama}>{r.aciklama}</Text>
                </View>
                {secili && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}

          {mudurMu && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>Mağaza adı</Text>
              <Text style={styles.rolHint}>Bu ad grup ve davet mesajlarında görünür; yalnızca müdür tarafından girilir.</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="business-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Mağaza İstanbul"
                  placeholderTextColor={colors.textMuted}
                  value={magazaAdi}
                  onChangeText={setMagazaAdi}
                  maxLength={40}
                />
              </View>
            </>
          )}
        </View>

        <Pressable
          style={[styles.devamBtn, (!devamEdebilir || kaydediyor) && styles.devamBtnDisabled]}
          onPress={devam}
          disabled={!devamEdebilir || kaydediyor}
        >
          {kaydediyor ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.devamBtnText}>Devam et</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
