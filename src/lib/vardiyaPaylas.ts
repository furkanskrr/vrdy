import { Alert, PixelRatio, Platform } from "react-native";
import type { RefObject } from "react";
import type { View } from "react-native";

/** Paylaşım PNG çözünürlüğü — düşük cihazlarda en az 2x */
export function vardiyaPaylasimOlcegi(): number {
  return Math.min(3, Math.max(2, Math.round(PixelRatio.get())));
}

function iosWebTarayiciMi(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function webDomOgesiBul(ref: View | null): HTMLElement | null {
  if (!ref) return null;
  const aday = ref as unknown as HTMLElement & { _nativeNode?: HTMLElement };
  if (typeof aday.nodeType === "number" && aday.nodeType === 1) return aday;
  if (aday._nativeNode && aday._nativeNode.nodeType === 1) return aday._nativeNode;
  return null;
}

async function webPngIndirVeyaPaylas(dataUri: string, dosyaAdi: string): Promise<void> {
  if (!dataUri.startsWith("data:image/")) {
    throw new Error("Görüntü oluşturulamadı.");
  }

  const res = await fetch(dataUri);
  const blob = await res.blob();
  const dosya = new File([blob], dosyaAdi, { type: "image/png" });

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [dosya] })) {
        await navigator.share({ files: [dosya], title: "Vardiya" });
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    }
  }

  if (iosWebTarayiciMi()) {
    const onizleme = window.open("", "_blank");
    if (onizleme) {
      onizleme.document.write(
        `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>Vardiya</title></head>` +
          `<body style="margin:0;background:#0f1419;display:flex;justify-content:center;padding:12px">` +
          `<img src="${dataUri}" alt="Vardiya" style="max-width:100%;height:auto;border-radius:8px" />` +
          `</body></html>`
      );
      onizleme.document.close();
      Alert.alert(
        "Paylaş",
        "Görüntü yeni sekmede açıldı. Basılı tutup «Resme Kaydet» veya paylaş simgesini kullanın."
      );
      return;
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = dosyaAdi;
    document.body.appendChild(link);
    link.click();
    link.remove();
    Alert.alert(
      "Paylaş",
      "Vardiya görüntüsü indirildi. Galeriden veya Dosyalar'dan WhatsApp ile paylaşabilirsiniz."
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function webTabloYakala(captureView: RefObject<View | null>): Promise<void> {
  await new Promise((r) => setTimeout(r, iosWebTarayiciMi() ? 320 : 160));

  const dom = webDomOgesiBul(captureView.current);
  if (dom) {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(dom, {
        useCORS: true,
        scale: Math.min(3, Math.max(2, Math.round(PixelRatio.get()))),
        backgroundColor: null,
        logging: false,
      });
      const uri = canvas.toDataURL("image/png");
      if (uri.length > 100) {
        await webPngIndirVeyaPaylas(uri, `vardiya-${Date.now()}.png`);
        return;
      }
    } catch {
      /* captureRef yedegi */
    }
  }

  const { captureRef } = await import("react-native-view-shot");
  const uri = await captureRef(captureView, {
    format: "png",
    quality: 1,
    result: "data-uri",
  });
  await webPngIndirVeyaPaylas(uri, `vardiya-${Date.now()}.png`);
}

export async function vardiyaTablosuPaylas(captureView: RefObject<View | null>): Promise<void> {
  if (!captureView.current) {
    Alert.alert("Paylaş", "Vardiya tablosu hazırlanamadı.");
    return;
  }
  try {
    if (Platform.OS === "web") {
      await webTabloYakala(captureView);
      return;
    }

    const { captureRef } = await import("react-native-view-shot");
    const uri = await captureRef(captureView, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      ...(Platform.OS === "ios" ? { useRenderInContext: true } : {}),
    });

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
