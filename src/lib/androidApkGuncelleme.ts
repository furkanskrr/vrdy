import * as IntentLauncher from "expo-intent-launcher";
import {
  cacheDirectory,
  createDownloadResumable,
  deleteAsync,
  getContentUriAsync,
} from "expo-file-system/legacy";
import { ANDROID_APK_DOSYA_ADI } from "./appUpdate";

export type ApkIndirmeIlerleme = {
  yuzde: number;
  indirilenBayt: number;
  toplamBayt: number;
};

export class ApkIndirmeHatasi extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApkIndirmeHatasi";
  }
}

export async function androidApkIndirVeKur(
  url: string,
  onProgress?: (ilerleme: ApkIndirmeIlerleme) => void,
): Promise<void> {
  if (!cacheDirectory) {
    throw new ApkIndirmeHatasi("Önbellek klasörü kullanılamıyor.");
  }

  const hedefUri = `${cacheDirectory}${ANDROID_APK_DOSYA_ADI}`;

  try {
    await deleteAsync(hedefUri, { idempotent: true });
  } catch {
    /* önceki dosya yoksa sorun değil */
  }

  const indirme = createDownloadResumable(
    url,
    hedefUri,
    { cache: false },
    (data) => {
      const toplam = data.totalBytesExpectedToWrite ?? 0;
      const indirilen = data.totalBytesWritten ?? 0;
      const yuzde = toplam > 0 ? Math.min(1, indirilen / toplam) : 0;
      onProgress?.({ yuzde, indirilenBayt: indirilen, toplamBayt: toplam });
    },
  );

  const sonuc = await indirme.downloadAsync();
  if (!sonuc) {
    throw new ApkIndirmeHatasi("İndirme iptal edildi.");
  }
  if (sonuc.status !== 200) {
    throw new ApkIndirmeHatasi(`İndirme başarısız (HTTP ${sonuc.status}).`);
  }

  onProgress?.({
    yuzde: 1,
    indirilenBayt: sonuc.headers["Content-Length"]
      ? parseInt(sonuc.headers["Content-Length"], 10) || 0
      : 0,
    toplamBayt: sonuc.headers["Content-Length"]
      ? parseInt(sonuc.headers["Content-Length"], 10) || 0
      : 0,
  });

  const contentUri = await getContentUriAsync(sonuc.uri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1,
    type: "application/vnd.android.package-archive",
  });
}
