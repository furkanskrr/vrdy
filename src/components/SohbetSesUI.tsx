import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import type { SohbetEkTaslak } from "../lib/groupChatMedia";

type KayitBantiProps = {
  sureSn: number;
  colors: ThemeColors;
  onDurdur: () => void;
  onIptal: () => void;
};

type OnizlemeProps = {
  ek: SohbetEkTaslak;
  colors: ThemeColors;
  onKaldir: () => void;
};

type OynaticiProps = {
  uri: string;
  sureSn?: number;
  mine: boolean;
  colors: ThemeColors;
};

/** Ses mesajı geçici kapalı — expo-audio paketi bundle'a dahil edilmez */
export function SohbetSesKayitBanti(_props: KayitBantiProps) {
  return null;
}

export function SohbetSesOnizleme(_props: OnizlemeProps) {
  return null;
}

export function SohbetSesOynatici({ colors }: OynaticiProps) {
  return (
    <View style={st.sesSatir}>
      <Ionicons name="musical-note-outline" size={16} color={colors.textMuted} />
      <Text style={[st.sesMetin, { color: colors.textMuted }]}>Ses mesajı</Text>
    </View>
  );
}

const st = StyleSheet.create({
  sesSatir: { flexDirection: "row", alignItems: "center", gap: 6, padding: 4 },
  sesMetin: { fontSize: 12 },
});
