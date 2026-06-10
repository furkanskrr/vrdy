import { Platform } from "react-native";
import { getInfoAsync } from "expo-file-system/legacy";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  type AudioRecorder,
} from "expo-audio";
import { type SohbetEkTaslak } from "./groupChatMedia";

export const SES_KAYIT_MAX_SN = 120;

let recorder: AudioRecorder | null = null;
let webMediaRecorder: MediaRecorder | null = null;
let webChunks: Blob[] = [];
let webStream: MediaStream | null = null;

function bekle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sureFormat(sn: number): string {
  const s = Math.max(0, Math.floor(sn));
  const dk = Math.floor(s / 60);
  const kalan = s % 60;
  return `${dk}:${kalan.toString().padStart(2, "0")}`;
}

export function sesKayitAdi(): string {
  return `ses-${Date.now()}.${Platform.OS === "web" ? "webm" : "m4a"}`;
}

export function sesKayitMime(): string {
  return Platform.OS === "web" ? "audio/webm" : "audio/mp4";
}

async function izinAl(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }
  const status = await AudioModule.requestRecordingPermissionsAsync();
  if (!status.granted) return false;
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
  return true;
}

async function uriBoyutluMu(uri: string): Promise<boolean> {
  try {
    const info = await getInfoAsync(uri);
    return !!(info.exists && "size" in info && (info.size ?? 0) > 0);
  } catch {
    return false;
  }
}

async function nativeKayitUri(rec: AudioRecorder): Promise<string> {
  const uri = rec.uri;
  if (!uri) throw new Error("Kayıt dosyası bulunamadı");
  for (let i = 0; i < 6; i++) {
    if (await uriBoyutluMu(uri)) return uri;
    await bekle(120 * (i + 1));
  }
  throw new Error("Kayıt boş. Tekrar deneyin.");
}

export async function sesKaydiBaslat(): Promise<void> {
  const izin = await izinAl();
  if (!izin) {
    throw new Error("Mikrofon izni gerekli. Telefon ayarlarından izin verin.");
  }

  if (Platform.OS === "web") {
    webChunks = [];
    webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    webMediaRecorder = new MediaRecorder(webStream, { mimeType: mime });
    webMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) webChunks.push(e.data);
    };
    webMediaRecorder.start(200);
    return;
  }

  if (recorder?.isRecording) {
    try {
      await recorder.stop();
    } catch {
      /* yoksay */
    }
  }

  recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
  await recorder.prepareToRecordAsync();
  recorder.record();
}

export function sesKaydiAktifMi(): boolean {
  if (Platform.OS === "web") return webMediaRecorder?.state === "recording";
  return !!recorder?.isRecording;
}

export async function sesKaydiDurdur(sureSn: number): Promise<SohbetEkTaslak | null> {
  if (sureSn < 1) {
    await sesKaydiIptal();
    return null;
  }

  if (Platform.OS === "web") {
    if (!webMediaRecorder || webMediaRecorder.state !== "recording") return null;
    const blob = await new Promise<Blob>((resolve, reject) => {
      webMediaRecorder!.onstop = () => {
        const parca = webChunks.length ? new Blob(webChunks, { type: "audio/webm" }) : null;
        if (!parca?.size) reject(new Error("Kayıt boş"));
        else resolve(parca);
      };
      webMediaRecorder!.stop();
    });
    webStream?.getTracks().forEach((t) => t.stop());
    webStream = null;
    webMediaRecorder = null;
    webChunks = [];

    const ad = sesKayitAdi();
    const uri = URL.createObjectURL(blob);
    return {
      uri,
      tur: "audio",
      ad,
      mime: "audio/webm",
      boyut: blob.size,
      webDosya: blob,
      sesSureSn: sureSn,
    };
  }

  if (!recorder?.isRecording) return null;
  await recorder.stop();
  const uri = await nativeKayitUri(recorder);
  const ad = sesKayitAdi();
  return {
    uri,
    tur: "audio",
    ad,
    mime: sesKayitMime(),
    sesSureSn: sureSn,
  };
}

export async function sesKaydiIptal(): Promise<void> {
  if (Platform.OS === "web") {
    if (webMediaRecorder?.state === "recording") {
      webMediaRecorder.onstop = null;
      webMediaRecorder.stop();
    }
    webStream?.getTracks().forEach((t) => t.stop());
    webStream = null;
    webMediaRecorder = null;
    webChunks = [];
    return;
  }
  if (recorder?.isRecording) {
    try {
      await recorder.stop();
    } catch {
      /* yoksay */
    }
  }
  recorder = null;
}

export { sureFormat };
