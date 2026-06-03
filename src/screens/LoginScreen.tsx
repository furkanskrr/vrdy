import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ustEkranBoslugu } from "../lib/safeArea";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import type { AuthStackParamList } from "../navigation/types";
import { WebInstallHint } from "../components/WebInstallHint";
import { AuthInputRow } from "../components/AuthInputRow";

type Props = NativeStackScreenProps<AuthStackParamList, "Giris">;

function createLoginStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 24,
      paddingBottom: 24,
      justifyContent: "center",
    },
    logoWrap: { alignItems: "center", marginBottom: 32 },
    logoCircle: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    logo: { fontSize: 36, fontWeight: "900", color: colors.text, letterSpacing: 2 },
    logoSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: "500" },

    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 20 },

    input: {
      flex: 1,
      color: colors.text,
      paddingVertical: 14,
    },
    eyeBtn: { padding: 6 },

    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: 14,
      marginTop: 8,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    forgotBtn: { alignItems: "center", marginTop: 14, paddingVertical: 6 },
    forgotText: { color: colors.primary, fontSize: 14, fontWeight: "700" },

    link: { color: colors.textMuted, textAlign: "center", fontSize: 15 },
    linkBold: { color: colors.primary, fontWeight: "700" },
  });
}

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createLoginStyles(colors), [colors]);
  const { girisYap } = useAuth();
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreGoster, setSifreGoster] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function handleGiris() {
    if (!email.trim() || !sifre) {
      Alert.alert("Hata", "E-posta ve şifre gerekli.");
      return;
    }
    setYukleniyor(true);
    const hata = await girisYap(email.trim(), sifre);
    setYukleniyor(false);
    if (hata) Alert.alert("Giriş başarısız", hata);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: ustEkranBoslugu(insets.top, 8) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logoWrap}>
        <View style={styles.logoCircle}>
          <Ionicons name="calendar" size={32} color="#fff" />
        </View>
        <Text style={styles.logo}>Vardiyam?</Text>
        <Text style={styles.logoSub}>Vardiya Yönetim Sistemi</Text>
      </View>

      <WebInstallHint />

      <View style={styles.formCard}>
        <Text style={styles.title}>Giriş yap</Text>

        <AuthInputRow icon="mail-outline" colors={colors}>
          <TextInput
            style={styles.input}
            placeholder="E-posta adresiniz"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </AuthInputRow>

        <AuthInputRow
          icon="lock-closed-outline"
          colors={colors}
          trailing={
            <TouchableOpacity onPress={() => setSifreGoster(!sifreGoster)} style={styles.eyeBtn}>
              <Ionicons
                name={sifreGoster ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          }
        >
          <TextInput
            style={styles.input}
            placeholder="Şifreniz"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!sifreGoster}
            value={sifre}
            onChangeText={setSifre}
          />
        </AuthInputRow>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleGiris}
          activeOpacity={0.8}
          disabled={yukleniyor}
        >
          {yukleniyor ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Giriş yap</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate("SifremiUnuttum")}>
          <Text style={styles.forgotText}>Şifremi unuttum</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate("Kayit")}>
        <Text style={styles.link}>
          Hesabın yok mu? <Text style={styles.linkBold}>Kayıt ol</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
