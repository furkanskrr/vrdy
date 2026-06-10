import { Alert, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { sohbetEkUriHazirla, type SohbetEkTaslak } from "./groupChatMedia";

type WebDosya = { uri: string; name: string; mime: string; size?: number; blob: Blob };

function webDosyaSec(accept: string): Promise<WebDosya | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file) {
        resolve(null);
        return;
      }
      const blob =
        typeof File !== "undefined"
          ? new File([file], file.name, { type: file.type || "application/octet-stream" })
          : file;
      resolve({
        uri: URL.createObjectURL(blob),
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        blob,
      });
    };
    input.click();
  });
}

async function assetToTaslak(a: ImagePicker.ImagePickerAsset): Promise<SohbetEkTaslak> {
  const mime = a.mimeType ?? "image/jpeg";
  const ad = a.fileName ?? `foto-${Date.now()}.jpg`;
  const uri = await sohbetEkUriHazirla(a.uri, ad);
  return { uri, tur: "image", ad, mime, boyut: a.fileSize };
}

async function galeriAc(): Promise<SohbetEkTaslak | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
  if (!perm.granted) {
    throw new Error("Galeri izni gerekli. Telefon ayarlarından izin verin.");
  }
  const sonuc = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.86,
    allowsEditing: false,
  });
  if (sonuc.canceled || !sonuc.assets?.[0]) return null;
  return assetToTaslak(sonuc.assets[0]);
}

async function kameraAc(): Promise<SohbetEkTaslak | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Kamera izni gerekli. Telefon ayarlarından izin verin.");
  }
  const sonuc = await ImagePicker.launchCameraAsync({
    quality: 0.86,
    allowsEditing: false,
  });
  if (sonuc.canceled || !sonuc.assets?.[0]) return null;
  return assetToTaslak(sonuc.assets[0]);
}

function fotoKaynakSec(): Promise<"galeri" | "kamera" | null> {
  return new Promise((resolve) => {
    Alert.alert("Fotoğraf", "Kaynak seçin", [
      { text: "Galeri", onPress: () => resolve("galeri") },
      { text: "Kamera", onPress: () => resolve("kamera") },
      { text: "İptal", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

function bekleyenSonucMu(
  sonuc: ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult
): sonuc is ImagePicker.ImagePickerResult {
  return "canceled" in sonuc;
}

/** Android: ImagePicker sonrası Activity yeniden başlarsa seçimi kurtarır */
export async function sohbetBekleyenMedyaAl(): Promise<SohbetEkTaslak | null> {
  if (Platform.OS !== "android") return null;
  try {
    const sonuc = await ImagePicker.getPendingResultAsync();
    if (!bekleyenSonucMu(sonuc) || sonuc.canceled || !sonuc.assets?.[0]) return null;
    return assetToTaslak(sonuc.assets[0]);
  } catch {
    return null;
  }
}

async function dosyaTaslakHazir(
  uri: string,
  ad: string,
  mime: string,
  boyut?: number
): Promise<SohbetEkTaslak> {
  const hazirUri = await sohbetEkUriHazirla(uri, ad);
  return {
    uri: hazirUri,
    tur: mime.startsWith("image/") ? "image" : "file",
    ad,
    mime,
    boyut,
  };
}

export async function sohbetFotoSec(): Promise<SohbetEkTaslak | null> {
  if (Platform.OS === "web") {
    const f = await webDosyaSec("image/*");
    if (!f) return null;
    return {
      uri: f.uri,
      tur: "image",
      ad: f.name,
      mime: f.mime,
      boyut: f.size,
      webDosya: f.blob,
    };
  }

  const kaynak = await fotoKaynakSec();
  if (!kaynak) return null;
  if (kaynak === "kamera") return kameraAc();
  return galeriAc();
}

export async function sohbetDosyaSec(): Promise<SohbetEkTaslak | null> {
  if (Platform.OS === "web") {
    const f = await webDosyaSec("image/*,application/pdf,.doc,.docx,text/plain");
    if (!f) return null;
    return {
      uri: f.uri,
      tur: f.mime.startsWith("image/") ? "image" : "file",
      ad: f.name,
      mime: f.mime,
      boyut: f.size,
      webDosya: f.blob,
    };
  }

  const sonuc = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ["image/*", "application/pdf", "text/*", "*/*"],
  });
  if (sonuc.canceled || !sonuc.assets?.[0]) return null;
  const a = sonuc.assets[0];
  const mime = a.mimeType ?? "application/octet-stream";
  return dosyaTaslakHazir(a.uri, a.name ?? "dosya", mime, a.size);
}
