import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  uri: string | null;
  onKapat: () => void;
};

export function SohbetGorselBuyutModal({ visible, uri, onKapat }: Props) {
  const { width, height } = useWindowDimensions();
  const kutuGenis = width * 0.9;
  const kutuYuksek = height * 0.9;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKapat}>
      <View style={styles.arka}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onKapat} accessibilityLabel="Kapat" />
        <View style={[styles.kutu, { width: kutuGenis, height: kutuYuksek }]}>
          <Pressable
            style={styles.kapatBtn}
            onPress={onKapat}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Fotoğrafı kapat"
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.gorsel}
              resizeMode="contain"
              accessibilityLabel="Büyütülmüş fotoğraf"
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  arka: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  kutu: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? { maxWidth: "90vw", maxHeight: "90vh" } : null),
  },
  kapatBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  gorsel: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
});
