import { Alert, Platform } from "react-native";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

export async function vardiyaTablosuPaylas(captureView: RefObject<View | null>): Promise<void> {
  if (!captureView.current) {
    Alert.alert("Paylaş", "Vardiya tablosu hazırlanamadı.");
    return;
  }
  try {
    const uri = await captureRef(captureView, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    if (Platform.OS === "web") {
      const link = document.createElement("a");
      link.href = uri;
      link.download = `vardiya-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      Alert.alert("Paylaş", "Vardiya görüntüsü indirildi. WhatsApp veya galeriden paylaşabilirsiniz.");
      return;
    }

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Paylaş", "Bu cihazda paylaşım menüsü kullanılamıyor.");
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      dialogTitle: "Vardiyayı paylaş",
      UTI: "public.png",
    });
  } catch (e) {
    Alert.alert("Paylaş", e instanceof Error ? e.message : "Görüntü oluşturulamadı.");
  }
}
