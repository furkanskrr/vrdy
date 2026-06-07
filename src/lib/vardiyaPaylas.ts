import { Alert, Platform } from "react-native";
import type { RefObject } from "react";
import type { View } from "react-native";

export async function vardiyaTablosuPaylas(captureView: RefObject<View | null>): Promise<void> {
  if (!captureView.current) {
    Alert.alert("Paylaş", "Vardiya tablosu hazırlanamadı.");
    return;
  }
  try {
    const { captureRef } = await import("react-native-view-shot");
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

    const Sharing = await import("expo-sharing");
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
    const msg = e instanceof Error ? e.message : "Görüntü oluşturulamadı.";
    if (Platform.OS !== "web" && /native module|TurboModule|view-shot/i.test(msg)) {
      Alert.alert(
        "Uygulama güncellemesi gerekli",
        "Vardiya paylaşımı için yeni APK kurulumu gerekiyor. Diğer özellikler OTA ile güncellenir."
      );
      return;
    }
    Alert.alert("Paylaş", msg);
  }
}
