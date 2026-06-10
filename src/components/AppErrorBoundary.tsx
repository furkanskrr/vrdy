import React, { Component, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ANDROID_APK_VARSAYILAN_URL } from "../lib/appUpdate";

type Props = { children: ReactNode };
type State = { hata: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hata: false };

  static getDerivedStateFromError(): State {
    return { hata: true };
  }

  render() {
    if (!this.state.hata) return this.props.children;

    return (
      <View style={styles.kutu}>
        <Text style={styles.baslik}>Vardiyam yeniden başlatılıyor</Text>
        <Text style={styles.metin}>
          Bir sorun oluştu. Aşağıdaki düğmeyle güncel sürümü kurun (silmenize gerek yok) veya uygulamayı
          bir kez daha açmayı deneyin.
        </Text>
        <Pressable
          style={styles.btn}
          onPress={() => void Linking.openURL(ANDROID_APK_VARSAYILAN_URL)}
        >
          <Text style={styles.btnMetin}>Güncel APK indir</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  kutu: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#0f1419",
    gap: 14,
  },
  baslik: { color: "#fff", fontSize: 20, fontWeight: "800" },
  metin: { color: "#94a3b8", fontSize: 15, lineHeight: 22 },
  btn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnMetin: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
