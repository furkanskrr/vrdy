import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
      alignItems: "center",
    },
    ikonWrap: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    baslik: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 10,
    },
    aciklama: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: "center",
    },
    rozet: {
      marginTop: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rozetText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
  });
}

/** Sohbet sekmesi geçici olarak kapalı — GroupChatScreen kodu korunur. */
export function SohbetYakindaScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.screen, { paddingTop: ustEkranBoslugu(insets.top) }]}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.ikonWrap}>
            <Ionicons name="chatbubbles-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.baslik}>Sohbet yakında</Text>
          <Text style={styles.aciklama}>
            Grup sohbeti üzerinde çalışıyoruz. Bu sekme ilerleyen sürümlerde açılacak; mesajlaşma ve
            bildirimler buradan yönetilebilecek.
          </Text>
          <View style={styles.rozet}>
            <Text style={styles.rozetText}>Yakında</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
