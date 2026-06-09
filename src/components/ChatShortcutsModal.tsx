import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import type { SohbetKisayolu } from "../lib/chatShortcuts";

type Props = {
  visible: boolean;
  onKapat: () => void;
  kisayollar: SohbetKisayolu[];
  onSil: (id: string) => void;
  colors: ThemeColors;
  isDark: boolean;
};

export function ChatShortcutsModal({ visible, onKapat, kisayollar, onSil, colors, isDark }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onKapat}>
      <Pressable style={styles.arka} onPress={onKapat}>
        <Pressable
          style={[styles.kart, { backgroundColor: isDark ? colors.surface : "#fff", borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.baslikSatir}>
            <Text style={[styles.baslik, { color: colors.text }]}>/ata kısayolları</Text>
            <TouchableOpacity onPress={onKapat} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.aciklama, { color: colors.textMuted }]}>
            Kayıt: /ata furkan şifrem:12345{"\n"}
            Kullanım: sohbette yalnızca furkan veya /furkan yazın → kayıtlı yanıt otomatik gider.
          </Text>
          <ScrollView style={styles.liste} keyboardShouldPersistTaps="handled">
            {kisayollar.length === 0 ? (
              <Text style={[styles.bos, { color: colors.textMuted }]}>Henüz kısayol yok.</Text>
            ) : (
              kisayollar.map((k) => (
                <View key={k.id} style={[styles.satir, { borderColor: colors.border }]}>
                  <View style={styles.satirSol}>
                    <Text style={[styles.tetik, { color: colors.primary }]}>{k.trigger_key}</Text>
                    <Text style={[styles.yanit, { color: colors.text }]} numberOfLines={2}>
                      {k.response_body?.trim()
                        ? k.response_body
                        : k.response_attachment_type === "image"
                          ? "📷 Fotoğraf"
                          : "📎 Dosya"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onSil(k.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.afternoon} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  arka: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  kart: {
    maxHeight: "72%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
  },
  baslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  baslik: { fontSize: 17, fontWeight: "800" },
  aciklama: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  liste: { maxHeight: 360 },
  bos: { fontSize: 13, paddingVertical: 20, textAlign: "center" },
  satir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  satirSol: { flex: 1, minWidth: 0 },
  tetik: { fontSize: 14, fontWeight: "800" },
  yanit: { fontSize: 13, marginTop: 2 },
});
