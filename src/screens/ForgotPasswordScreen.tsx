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
import type { AuthStackParamList } from "../navigation/types";
import { sifreSifirlamaEpostaGonder, sifreSifirlamaKoduDogrula } from "../lib/authRecovery";
import { useAuth } from "../context/AuthContext";
import { AuthInputRow } from "../components/AuthInputRow";

type Props = NativeStackScreenProps<AuthStackParamList, "SifremiUnuttum">;

function createForgotStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    geri: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
    geriText: { color: colors.text, fontSize: 16, fontWeight: "600" },
    baslik: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 10 },
    alt: { fontSize: 14, color: colors.textMuted, lineHeight: 21, marginBottom: 22 },
    input: { flex: 1, color: colors.text, paddingVertical: 14 },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 8,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    secondaryBtn: { marginTop: 14, alignItems: "center", paddingVertical: 8 },
    secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  });
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createForgotStyles(colors), [colors]);
  const { sifreKurtarmaModunuAc } = useAuth();
  const [eposta, setEposta] = useState("");
  const [kod, setKod] = useState("");
  const [kodGonderildi, setKodGonderildi] = useState(false);
  const [busy, setBusy] = useState(false);

  async function gonder() {
    const t = eposta.trim();
    if (!t.includes("@")) {
      Alert.alert("Hata", "Kayıtlı e-posta adresinizi girin.");
      return;
    }
    setBusy(true);
    try {
      const hata = await sifreSifirlamaEpostaGonder(t);
      if (hata) {
        Alert.alert("Gönderilemedi", hata);
        return;
      }
      setKodGonderildi(true);
      Alert.alert(
        "Kod gönderildi",
        "E-postanızdaki doğrulama kodunu aşağıya yazın veya yapıştırın (genelde 6 rakam). Gelen kutusu ve spam klasörüne bakın.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function koduDogrula() {
    const t = eposta.trim();
    if (!t.includes("@")) {
      Alert.alert("Hata", "Önce e-posta adresinizi girin.");
      return;
    }
    setBusy(true);
    try {
      const hata = await sifreSifirlamaKoduDogrula(t, kod);
      if (hata) {
        Alert.alert("Doğrulanamadı", hata);
        return;
      }
      sifreKurtarmaModunuAc();
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity
        style={styles.geri}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Ionicons name="arrow-back" size={22} color={colors.text} />
        <Text style={styles.geriText}>Geri</Text>
      </TouchableOpacity>

      <Text style={styles.baslik}>Şifremi unuttum</Text>
      <Text style={styles.alt}>
        Kayıtlı e-postaya sıfırlama kodu gelir (çoğunlukla 6 rakam). Kodu buraya girin; şablonda yalnızca
        bağlantı varsa linke tıklayıp uygulamayı açmanız gerekebilir.
      </Text>

      <AuthInputRow icon="mail-outline" colors={colors}>
        <TextInput
          style={styles.input}
          placeholder="E-posta adresiniz"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={eposta}
          onChangeText={setEposta}
          editable={!kodGonderildi}
        />
      </AuthInputRow>
      {!kodGonderildi ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void gonder()} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Kod gönder</Text>
          )}
        </TouchableOpacity>
      ) : (
        <>
          <AuthInputRow icon="keypad-outline" colors={colors} style={{ marginTop: 4 }}>
            <TextInput
              style={styles.input}
              placeholder="E-postadaki kod"
              placeholderTextColor={colors.textMuted}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={128}
              value={kod}
              onChangeText={setKod}
            />
          </AuthInputRow>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void koduDogrula()} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Kodu doğrula</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setKodGonderildi(false);
              setKod("");
            }}
            disabled={busy}
          >
            <Text style={styles.secondaryBtnText}>Farklı e-posta</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
