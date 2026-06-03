import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const DISMISS_KEY = "vrdy_web_install_hint_dismiss";

function isWebStandalone(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

function isAndroidBrowser(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    text: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    bold: { color: colors.text, fontWeight: "700" },
    close: { padding: 4 },
  });
}

/** Android Chrome: PWA kurulum yönlendirmesi (manifest düzeldikten sonra menüden eklenebilir). */
export function WebInstallHint() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [hidden, setHidden] = useState(() => {
    if (Platform.OS !== "web" || typeof localStorage === "undefined") return true;
    return localStorage.getItem(DISMISS_KEY) === "1";
  });

  if (Platform.OS !== "web" || hidden || isWebStandalone() || !isAndroidBrowser()) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
        <Text style={styles.text}>
          <Text style={styles.bold}>Ana ekrana eklemek için: </Text>
          Chrome sağ üstteki ⋮ menüsü →{" "}
          <Text style={styles.bold}>Ana ekrana ekle</Text> veya{" "}
          <Text style={styles.bold}>Uygulamayı yükle</Text>
        </Text>
        <Pressable
          style={styles.close}
          onPress={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setHidden(true);
          }}
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}
