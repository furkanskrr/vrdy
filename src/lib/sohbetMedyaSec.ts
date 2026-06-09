import { Platform } from "react-native";
import { PermissionStatus, requireNativeModule } from "expo-modules-core";
import type { SohbetEkTaslak } from "./groupChatMedia";

type WebDosya = { uri: string; name: string; mime: string; size?: number };

function webDosyaSec(accept: string): Promise<WebDosya | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        uri: URL.createObjectURL(file),
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
      });
    };
    input.click();
  });
}

async function nativeGaleriSec(): Promise<SohbetEkTaslak | null> {
  const picker = requireNativeModule<{
    requestMediaLibraryPermissionsAsync: (writeOnly?: boolean) => Promise<{ granted?: boolean; status?: string }>;
    launchImageLibraryAsync: (opts: Record<string, unknown>) => Promise<{
      canceled?: boolean;
      assets?: { uri: string; fileName?: string; mimeType?: string; fileSize?: number }[];
    }>;
  }>("ExponentImagePicker");

  const perm = await picker.requestMediaLibraryPermissionsAsync(false);
  if (!perm?.granted && perm?.status !== PermissionStatus.GRANTED) {
    throw new Error("Galeri izni gerekli. Telefon ayarlarından izin verin.");
  }

  const sonuc = await picker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.86,
    allowsEditing: false,
  });
  if (sonuc.canceled || !sonuc.assets?.[0]) return null;
  const a = sonuc.assets[0];
  return {
    uri: a.uri,
    tur: "image",
    ad: a.fileName ?? "foto.jpg",
    mime: a.mimeType ?? "image/jpeg",
    boyut: a.fileSize,
  };
}

async function nativeDosyaSec(): Promise<SohbetEkTaslak | null> {
  const { getDocumentAsync } = await import("expo-document-picker");
  const sonuc = await getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (sonuc.canceled || !sonuc.assets?.[0]) return null;
  const a = sonuc.assets[0];
  const mime = a.mimeType ?? "application/octet-stream";
  return {
    uri: a.uri,
    tur: mime.startsWith("image/") ? "image" : "file",
    ad: a.name ?? "dosya",
    mime,
    boyut: a.size,
  };
}

export async function sohbetFotoSec(): Promise<SohbetEkTaslak | null> {
  if (Platform.OS === "web") {
    const f = await webDosyaSec("image/*");
    if (!f) return null;
    return { uri: f.uri, tur: "image", ad: f.name, mime: f.mime, boyut: f.size };
  }
  return nativeGaleriSec();
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
    };
  }
  return nativeDosyaSec();
}
