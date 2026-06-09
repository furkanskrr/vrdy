import { Platform } from "react-native";
import { PermissionStatus, requireNativeModule } from "expo-modules-core";
import { cacheDirectory, copyAsync } from "expo-file-system/legacy";
import type { SohbetEkTaslak } from "./groupChatMedia";

type WebDosya = { uri: string; name: string; mime: string; size?: number; blob: Blob };

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
        blob: file,
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
  let uri = a.uri;
  if (cacheDirectory && (uri.startsWith("content://") || uri.startsWith("ph://"))) {
    const hedef = `${cacheDirectory}sohbet-${Date.now()}.jpg`;
    try {
      await copyAsync({ from: uri, to: hedef });
      uri = hedef;
    } catch {
      /* kaynak uri ile devam */
    }
  }
  return {
    uri,
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
  let uri = a.uri;
  if (cacheDirectory && uri.startsWith("content://")) {
    const ext = (a.name?.split(".").pop() ?? "bin").slice(0, 8);
    const hedef = `${cacheDirectory}sohbet-${Date.now()}.${ext}`;
    try {
      await copyAsync({ from: uri, to: hedef });
      uri = hedef;
    } catch {
      /* kaynak uri ile devam */
    }
  }
  return {
    uri,
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
    return {
      uri: f.uri,
      tur: "image",
      ad: f.name,
      mime: f.mime,
      boyut: f.size,
      webDosya: f.blob,
    };
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
      webDosya: f.blob,
    };
  }
  return nativeDosyaSec();
}
