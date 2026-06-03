import { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { ustEkranBoslugu } from "../lib/safeArea";

type Props = {
  gorunur: boolean;
  /** İlk kez: sistem diyaloğu öncesi; reddedildiyse: ayarlara yönlendirme metni */
  mod: "undetermined" | "denied";
  yukleniyor?: boolean;
  onAtla: () => void;
  /** undetermined: izin iste; denied: ayarları aç */
  onBirincil: () => void | Promise<void>;
};

function createPushModalStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      justifyContent: "center",
      paddingHorizontal: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 18,
    },
    baslik: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
      textAlign: "center",
      letterSpacing: -0.3,
      marginBottom: 10,
    },
    aciklama: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      marginBottom: 22,
    },
    btnPrimary: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    btnPressed: { opacity: 0.88 },
    btnPrimaryText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    btnGhost: {
      marginTop: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    btnGhostPressed: { opacity: 0.7 },
    btnGhostText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}

export function PushPermissionModal({
  gorunur,
  mod,
  yukleniyor = false,
  onAtla,
  onBirincil,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createPushModalStyles(colors), [colors]);
  const baslik =
    mod === "undetermined"
      ? "Bildirimlerle haberdar olun"
      : "Bildirimler kapalı";
  const aciklama =
    mod === "undetermined"
      ? "Vardiya değişiklikleri, izin güncellemeleri ve takas talepleri için kısa bildirimler gönderebiliriz. İsterseniz bir sonraki adımda sistem izin penceresini göreceksiniz."
      : "Bildirimleri daha önce reddettiyseniz veya kapattıysanız, telefon ayarlarından uygulama için bildirimleri açmanız gerekir.";
  const birincilMetin = mod === "undetermined" ? "Devam et" : "Ayarlara git";

  return (
    <Modal
      visible={gorunur}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onAtla}
    >
      <View style={[styles.backdrop, { paddingTop: ustEkranBoslugu(insets.top, 12), paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.baslik}>{baslik}</Text>
          <Text style={styles.aciklama}>{aciklama}</Text>

          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={() => void onBirincil()}
            disabled={yukleniyor}
          >
            {yukleniyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>{birincilMetin}</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
            onPress={onAtla}
            disabled={yukleniyor}
          >
            <Text style={styles.btnGhostText}>Şimdilik atla</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
