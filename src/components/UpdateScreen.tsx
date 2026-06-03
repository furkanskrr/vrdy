import { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import type { GuncellemeDurumu } from "../lib/appUpdate";

type Props = {
  durum: Extract<GuncellemeDurumu, { tur: "guncelleme" }>;
  yukleniyor: boolean;
  onGuncelle: () => void;
  onSonra?: () => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bg,
      zIndex: 9999,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
    },
    ikonWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 16,
    },
    baslik: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    surum: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: 16,
    },
    notBaslik: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    notlar: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 21,
      marginBottom: 20,
    },
    talimat: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
      marginBottom: 20,
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 12,
    },
    birincil: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      marginBottom: 10,
    },
    birincilText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    ikincil: { alignItems: "center", paddingVertical: 10 },
    ikincilText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  });
}

function platformTalimati(): string {
  if (Platform.OS === "web") {
    return "Güncelle dediğinizde sayfa yenilenir. iPhone’da Ana Ekrana ekli kısayolu kullanıyorsanız uygulama otomatik açılır.";
  }
  if (Platform.OS === "android") {
    return "Güncelle dediğinizde Vardiyam.apk indirilir. İndirme bitince açıp “Güncelle” deyin; uygulamayı silmenize gerek yok.";
  }
  return "Güncelleme arka planda uygulanır.";
}

export function UpdateScreen({ durum, yukleniyor, onGuncelle, onSonra }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const notlar = durum.config.releaseNotes?.trim() || "Hata düzeltmeleri ve iyileştirmeler.";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.card}>
        <View style={styles.ikonWrap}>
          <Ionicons name="cloud-download-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.baslik}>
          {durum.zorunlu ? "Güncelleme gerekli" : "Yeni sürüm var"}
        </Text>
        <Text style={styles.surum}>
          {durum.mevcutSurum} → {durum.hedefSurum}
        </Text>
        <Text style={styles.notBaslik}>Bu sürümde</Text>
        <Text style={styles.notlar}>{notlar}</Text>
        <Text style={styles.talimat}>{platformTalimati()}</Text>
        <Pressable
          style={styles.birincil}
          onPress={onGuncelle}
          disabled={yukleniyor}
        >
          {yukleniyor ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.birincilText}>Güncelle</Text>
            </>
          )}
        </Pressable>
        {onSonra ? (
          <Pressable style={styles.ikincil} onPress={onSonra}>
            <Text style={styles.ikincilText}>Daha sonra</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
