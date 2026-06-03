import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useNotification } from "../context/NotificationContext";
import type { AuthStackParamList } from "../navigation/types";
import { AuthInputRow } from "../components/AuthInputRow";

type Props = NativeStackScreenProps<AuthStackParamList, "Kayit">;

function createRegisterStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 24,
      paddingBottom: 24,
      justifyContent: "center",
    },
    headerWrap: { alignItems: "center", marginBottom: 28 },
    logoCircle: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor: colors.morning,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    title: { fontSize: 24, fontWeight: "800", color: colors.text },
    hint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },

    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },

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
      backgroundColor: colors.morning,
      paddingVertical: 15,
      borderRadius: 14,
      marginTop: 8,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    link: { color: colors.textMuted, textAlign: "center", fontSize: 15 },
    linkBold: { color: colors.primary, fontWeight: "700" },
  });
}

export function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createRegisterStyles(colors), [colors]);
  const { kayitOl } = useAuth();
  const { bildirimGonder } = useNotification();
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreGoster, setSifreGoster] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function handleKayit() {
    if (!ad.trim() || !email.trim() || sifre.length < 6) {
      bildirimGonder("bilgi", "Eksik bilgi", "Ad, e-posta ve en az 6 karakterli şifre gerekli.");
      return;
    }
    setYukleniyor(true);
    const sonuc = await kayitOl(email.trim(), sifre, ad.trim());
    setYukleniyor(false);
    if (!sonuc.ok) {
      bildirimGonder("bilgi", "Kayıt başarısız", sonuc.hata);
      return;
    }
    bildirimGonder("bilgi", "Kayıt tamam", "Hesabınız oluşturuldu. Kuruluma devam edebilirsiniz.");
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: ustEkranBoslugu(insets.top, 12) }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.headerWrap}>
        <View style={styles.logoCircle}>
          <Ionicons name="person-add" size={28} color="#fff" />
        </View>
        <Text style={styles.title}>Hesap oluştur</Text>
        <Text style={styles.hint}>Ekibinle vardiya planlamaya başla</Text>
      </View>

      <View style={styles.formCard}>
        <AuthInputRow icon="person-outline" colors={colors}>
          <TextInput
            style={styles.input}
            placeholder="Ad Soyad"
            placeholderTextColor={colors.textMuted}
            value={ad}
            onChangeText={setAd}
          />
        </AuthInputRow>

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
            placeholder="Şifre (en az 6 karakter)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!sifreGoster}
            value={sifre}
            onChangeText={setSifre}
          />
        </AuthInputRow>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleKayit}
          activeOpacity={0.8}
          disabled={yukleniyor}
        >
          {yukleniyor ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Kayıt ol</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>
          Zaten hesabın var mı? <Text style={styles.linkBold}>Giriş yap</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
