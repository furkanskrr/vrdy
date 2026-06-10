import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import type { GrupMesaji } from "../types";

type MesajEylemAltSayfaProps = {
  gorunur: boolean;
  mesaj: GrupMesaji | null;
  colors: ThemeColors;
  mesajSabitli: boolean;
  silGoster: boolean;
  duzenleGoster: boolean;
  onKapat: () => void;
  onYanitla: () => void;
  onDuzenle: () => void;
  onSabitleIste: () => void;
  onSabitleKaldirIste: () => void;
  onSilIste: () => void;
};

function mesajOzetMetni(m: GrupMesaji | null): string {
  if (!m) return "";
  const metin = m.body?.trim();
  if (metin) return metin;
  if (m.attachment_type === "image") return "📷 Fotoğraf";
  if (m.attachment_type === "audio") return "🎤 Ses mesajı";
  if (m.attachment_path) return `📎 ${m.attachment_name?.trim() || "Dosya"}`;
  return "";
}

function EylemSatiri({
  ikon,
  ikonRenk,
  metin,
  metinRenk,
  colors,
  onPress,
  altCizgi,
}: {
  ikon: keyof typeof Ionicons.glyphMap;
  ikonRenk: string;
  metin: string;
  metinRenk?: string;
  colors: ThemeColors;
  onPress: () => void;
  altCizgi?: boolean;
}) {
  const st = eylemSatiriStiller(colors);
  return (
    <Pressable
      style={({ pressed }) => [st.satir, altCizgi && st.satirAltCizgi, pressed && st.satirPressed]}
      onPress={onPress}
    >
      <Ionicons name={ikon} size={22} color={ikonRenk} />
      <Text style={[st.satirText, metinRenk ? { color: metinRenk } : null]}>{metin}</Text>
    </Pressable>
  );
}

export function MesajEylemAltSayfa({
  gorunur,
  mesaj,
  colors,
  mesajSabitli,
  silGoster,
  duzenleGoster,
  onKapat,
  onYanitla,
  onDuzenle,
  onSabitleIste,
  onSabitleKaldirIste,
  onSilIste,
}: MesajEylemAltSayfaProps) {
  const insets = useSafeAreaInsets();
  const st = mesajEylemModalStiller(colors);

  return (
    <Modal visible={gorunur} transparent animationType="fade" onRequestClose={onKapat}>
      <View
        style={[
          st.arka,
          {
            paddingTop: Math.max(24, insets.top + 12),
            paddingBottom: Math.max(24, insets.bottom + 12),
            paddingHorizontal: Math.max(24, insets.left + 20, insets.right + 20),
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onKapat}
          accessibilityRole="button"
          accessibilityLabel="Menüyü kapat"
        />
        <View style={st.kart}>
          <View style={st.ustSatir}>
            <View style={st.ustMetin}>
              <Text style={st.baslik} numberOfLines={1}>
                {mesaj?.sender_ad ?? "Mesaj"}
              </Text>
              <Text style={st.ozet} numberOfLines={3}>
                {mesajOzetMetni(mesaj)}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [st.kapatBtn, pressed && st.kapatBtnPressed]}
              onPress={onKapat}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={st.eylemler}>
            <EylemSatiri
              ikon="arrow-undo-outline"
              ikonRenk={colors.primary}
              metin="Yanıtla"
              colors={colors}
              altCizgi
              onPress={() => {
                onYanitla();
                onKapat();
              }}
            />

            {duzenleGoster ? (
              <EylemSatiri
                ikon="create-outline"
                ikonRenk={colors.primary}
                metin="Düzenle"
                colors={colors}
                altCizgi
                onPress={() => {
                  onDuzenle();
                  onKapat();
                }}
              />
            ) : null}

            {mesajSabitli ? (
              <EylemSatiri
                ikon="pin-outline"
                ikonRenk={colors.afternoon}
                metin="Sabitlemeyi kaldır"
                metinRenk={colors.afternoon}
                colors={colors}
                altCizgi
                onPress={() => {
                  onSabitleKaldirIste();
                  onKapat();
                }}
              />
            ) : (
              <EylemSatiri
                ikon="pin"
                ikonRenk={colors.primary}
                metin="Duyuruya sabitle"
                colors={colors}
                altCizgi
                onPress={() => {
                  onSabitleIste();
                  onKapat();
                }}
              />
            )}

            {silGoster ? (
              <EylemSatiri
                ikon="trash-outline"
                ikonRenk={colors.danger}
                metin="Mesajı sil"
                metinRenk={colors.danger}
                colors={colors}
                onPress={() => {
                  onSilIste();
                  onKapat();
                }}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function mesajEylemModalStiller(colors: ThemeColors) {
  return StyleSheet.create({
    arka: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    kart: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      zIndex: 1,
    },
    ustSatir: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingTop: 16,
      paddingLeft: 18,
      paddingRight: 12,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    ustMetin: { flex: 1, minWidth: 0 },
    baslik: { fontSize: 17, fontWeight: "800", color: colors.text, letterSpacing: -0.2 },
    ozet: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      lineHeight: 20,
    },
    kapatBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface2,
    },
    kapatBtnPressed: { opacity: 0.75 },
    eylemler: { paddingVertical: 4 },
  });
}

function eylemSatiriStiller(colors: ThemeColors) {
  return StyleSheet.create({
    satir: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 18,
    },
    satirAltCizgi: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    satirPressed: { backgroundColor: colors.surface2 },
    satirText: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
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
