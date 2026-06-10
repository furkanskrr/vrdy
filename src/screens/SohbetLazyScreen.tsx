import { useEffect, useState, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppEntrySplash } from "../components/AppEntrySplash";
import { useTheme } from "../context/ThemeContext";
import { SOHBET_AKTIF } from "../constants/features";
import { SohbetYakindaScreen } from "./SohbetYakindaScreen";

type SohbetTabProps = BottomTabScreenProps<Record<string, object | undefined>, "Sohbet">;

/**
 * Sohbet ekranını uygulama açılışında değil, sekme açılınca yükler.
 * Eski APK + yeni OTA (expo-audio) uyumsuzluğunda ana uygulama çökmez.
 */
export function SohbetLazyScreen(props: SohbetTabProps) {
  const { colors } = useTheme();
  const [Screen, setScreen] = useState<ComponentType<SohbetTabProps> | null>(null);
  const [yuklenemedi, setYuklenemedi] = useState(false);

  useEffect(() => {
    if (!SOHBET_AKTIF) {
      setScreen(() => SohbetYakindaScreen);
      return;
    }
    try {
      const mod = require("./GroupChatScreen") as { GroupChatScreen: ComponentType<SohbetTabProps> };
      setScreen(() => mod.GroupChatScreen);
    } catch {
      setYuklenemedi(true);
    }
  }, []);

  if (!SOHBET_AKTIF) {
    return <SohbetYakindaScreen {...props} />;
  }

  if (yuklenemedi) {
    return (
      <View style={[styles.kutu, { backgroundColor: colors.bg }]}>
        <Text style={[styles.baslik, { color: colors.text }]}>Sohbet açılamadı</Text>
        <Text style={[styles.metin, { color: colors.textMuted }]}>
          Uygulama sürümünüz eski. Ana ekrandaki güncelleme bildiriminden yeni APK kurun, ardından
          uygulamayı yeniden açın.
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => props.navigation.navigate("Ana")}
        >
          <Text style={styles.btnMetin}>Ana sayfaya dön</Text>
        </Pressable>
      </View>
    );
  }

  if (!Screen) {
    return <AppEntrySplash />;
  }

  return <Screen {...props} />;
}

const styles = StyleSheet.create({
  kutu: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  baslik: {
    fontSize: 20,
    fontWeight: "800",
  },
  metin: {
    fontSize: 15,
    lineHeight: 22,
  },
  btn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnMetin: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
