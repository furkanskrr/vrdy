import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import type { GrupMesaji } from "../types";

type MesajEylemAltSayfaProps = {
  gorunur: boolean;
  mesaj: GrupMesaji | null;
  colors: ThemeColors;
  mudur: boolean;
  mesajSabitli: boolean;
  onKapat: () => void;
  onYanitla: () => void;
  onSabitleIste: () => void;
  onSabitleKaldirIste: () => void;
};

export function MesajEylemAltSayfa({
  gorunur,
  mesaj,
  colors,
  mudur,
  mesajSabitli,
  onKapat,
  onYanitla,
  onSabitleIste,
  onSabitleKaldirIste,
}: MesajEylemAltSayfaProps) {
  const insets = useSafeAreaInsets();
  const st = sheetStyles(colors);

  return (
    <Modal visible={gorunur} transparent animationType="fade" onRequestClose={onKapat}>
      <Pressable style={st.backdrop} onPress={onKapat}>
        <Pressable style={[st.sheet, { paddingBottom: Math.max(16, insets.bottom + 8) }]} onPress={(e) => e.stopPropagation()}>
          <View style={st.grabber} />
          <Text style={st.sheetBaslik} numberOfLines={1}>
            {mesaj?.sender_ad ?? "Mesaj"}
          </Text>
          <Text style={st.sheetOz} numberOfLines={3}>
            {mesaj?.body ?? ""}
          </Text>

          <Pressable
            style={({ pressed }) => [st.satir, pressed && st.satirPressed]}
            onPress={() => {
              onYanitla();
              onKapat();
            }}
          >
            <Ionicons name="arrow-undo-outline" size={22} color={colors.primary} />
            <Text style={st.satirText}>Yanıtla</Text>
          </Pressable>

          {mudur ? (
            mesajSabitli ? (
              <Pressable
                style={({ pressed }) => [st.satir, pressed && st.satirPressed]}
                onPress={() => {
                  onSabitleKaldirIste();
                  onKapat();
                }}
              >
                <Ionicons name="pin-outline" size={22} color={colors.afternoon} />
                <Text style={[st.satirText, { color: colors.afternoon }]}>Sabitlemeyi kaldır</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [st.satir, pressed && st.satirPressed]}
                onPress={() => {
                  onSabitleIste();
                  onKapat();
                }}
              >
                <Ionicons name="pin" size={22} color={colors.primary} />
                <Text style={st.satirText}>Duyuruya sabitle</Text>
              </Pressable>
            )
          ) : null}

          <Pressable style={({ pressed }) => [st.satir, st.iptalSatir, pressed && st.satirPressed]} onPress={onKapat}>
            <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
            <Text style={[st.satirText, { color: colors.textMuted }]}>Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function sheetStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 18,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    grabber: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: 14,
    },
    sheetBaslik: { fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
    sheetOz: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 8,
      lineHeight: 20,
      marginBottom: 14,
    },
    satir: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderRadius: 12,
    },
    satirPressed: { opacity: 0.85, backgroundColor: colors.surface2 },
    satirText: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
    iptalSatir: { marginTop: 4 },
  });
}

type KritikOnayModalProps = {
  gorunur: boolean;
  baslik: string;
  aciklama: string;
  onayLabel: string;
  iptalLabel?: string;
  tehlikeli?: boolean;
  colors: ThemeColors;
  onOnay: () => void;
  onIptal: () => void;
};

export function KritikOnayModal({
  gorunur,
  baslik,
  aciklama,
  onayLabel,
  iptalLabel = "Vazgeç",
  tehlikeli = false,
  colors,
  onOnay,
  onIptal,
}: KritikOnayModalProps) {
  const insets = useSafeAreaInsets();
  const st = onayStyles(colors);

  return (
    <Modal visible={gorunur} transparent animationType="fade" onRequestClose={onIptal}>
      <View style={st.wrap}>
        <View style={[st.kart, { marginBottom: Math.max(16, insets.bottom) }]}>
          <Text style={st.baslik}>{baslik}</Text>
          <Text style={st.aciklama}>{aciklama}</Text>
          <View style={st.btnSatir}>
            <Pressable
              style={({ pressed }) => [st.btn, st.btnIptal, pressed && st.btnPressed]}
              onPress={onIptal}
            >
              <Text style={st.btnIptalText}>{iptalLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                st.btn,
                tehlikeli ? st.btnTehlikeli : st.btnOnay,
                pressed && st.btnPressed,
              ]}
              onPress={() => void Promise.resolve(onOnay()).finally(() => onIptal())}
            >
              <Text style={tehlikeli ? st.btnTehlikeliText : st.btnOnayText}>{onayLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function onayStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    kart: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    baslik: { fontSize: 18, fontWeight: "800", color: colors.text },
    aciklama: { fontSize: 14, color: colors.textMuted, marginTop: 10, lineHeight: 20 },
    btnSatir: { flexDirection: "row", gap: 10, marginTop: 20 },
    btn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: "center",
    },
    btnPressed: { opacity: 0.88 },
    btnIptal: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    btnIptalText: { fontSize: 15, fontWeight: "700", color: colors.text },
    btnOnay: { backgroundColor: colors.primary },
    btnOnayText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    btnTehlikeli: { backgroundColor: colors.danger },
    btnTehlikeliText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  });
}
