import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ustEkranBoslugu } from "../lib/safeArea";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import type { MainStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<MainStackParamList, "SifreBelirle">;

function createSifreBelirleStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingBottom: 24 },
    geri: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
    geriText: { color: colors.text, fontSize: 16, fontWeight: "600" },
    baslik: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8 },
    alt: { fontSize: 14, color: colors.textMuted, marginBottom: 20, lineHeight: 20 },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: colors.text, paddingVertical: 14, fontSize: 15 },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 12,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
}

export function SifreBelirleScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createSifreBelirleStyles(colors), [colors]);
  const {
    sifreGuncelleOturumda,
    sifreKurtarmaBekliyor,
    sifreKurtarmaSonlandir,
    sifreKurtarmaIptal,
  } = useAuth();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);

  async function kaydet() {
    if (a.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (a !== b) {
      Alert.alert("Hata", "Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    let err: string | null = null;
    try {
      err = await sifreGuncelleOturumda(a);
    } catch (e) {
      err = e instanceof Error ? e.message : "Beklenmeyen hata.";
    } finally {
      setBusy(false);
    }
    if (err) {
      Alert.alert("Hata", err);
      return;
    }
    const kurtarmaydi = sifreKurtarmaBekliyor;
    if (kurtarmaydi) sifreKurtarmaSonlandir();
    Alert.alert("Tamam", "Şifreniz güncellendi.", [
      {
        text: "Tamam",
        onPress: () => {
          if (!kurtarmaydi) navigation.goBack();
        },
      },
    ]);
  }

  function geri() {
    if (sifreKurtarmaBekliyor) {
      Alert.alert("İptal", "Şifre sıfırlamayı iptal edip çıkış yapılsın mı?", [
        { text: "Hayır", style: "cancel" },
        { text: "Evet", style: "destructive", onPress: () => void sifreKurtarmaIptal() },
      ]);
      return;
    }
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.geri} onPress={geri} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
        <Text style={styles.geriText}>Geri</Text>
      </TouchableOpacity>

      <Text style={styles.baslik}>Yeni şifre</Text>
      <Text style={styles.alt}>Güçlü bir şifre seçin; en az 6 karakter.</Text>

      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Yeni şifre"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={a}
          onChangeText={setA}
        />
      </View>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Yeni şifre (tekrar)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={b}
          onChangeText={setB}
        />
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => void kaydet()} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Kaydet</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
