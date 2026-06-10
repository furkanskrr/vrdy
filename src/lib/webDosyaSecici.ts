/**
 * iOS Safari / PWA: <input type="file"> yalnızca kullanıcı dokunuşuyla aynı çağrı yığınında
 * tetiklenirse güvenilir çalışır. Kalıcı girdi + data: önizleme kullanılır.
 */

export type WebSecilenDosya = {
  uri: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
};

let kaliciGirdi: HTMLInputElement | null = null;

function kaliciDosyaGirdi(): HTMLInputElement {
  if (kaliciGirdi?.isConnected) return kaliciGirdi;
  kaliciGirdi = document.createElement("input");
  kaliciGirdi.type = "file";
  kaliciGirdi.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(kaliciGirdi);
  return kaliciGirdi;
}

function webDosyaDataUri(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Önizleme hazırlanamadı"));
    };
    reader.onerror = () => reject(new Error("Önizleme okunamadı"));
    reader.readAsDataURL(file);
  });
}

function dosyaMime(file: File, accept: string): string {
  if (file.type?.trim()) return file.type;
  const ad = file.name.toLowerCase();
  if (ad.endsWith(".png")) return "image/png";
  if (ad.endsWith(".webp")) return "image/webp";
  if (ad.endsWith(".gif")) return "image/gif";
  if (ad.endsWith(".pdf")) return "application/pdf";
  if (accept.includes("image")) return "image/jpeg";
  return "application/octet-stream";
}

/**
 * Senkron çağrılmalı (Pressable onPress içinde). input.click() aynı event tick'inde çalışır.
 */
export function webDosyaSec(accept: string): Promise<WebSecilenDosya | null> {
  const input = kaliciDosyaGirdi();
  input.accept = accept;
  input.value = "";

  return new Promise((resolve) => {
    const tamamla = (sonuc: WebSecilenDosya | null) => {
      input.removeEventListener("change", degisti);
      input.removeEventListener("cancel", iptal);
      resolve(sonuc);
    };

    const degisti = () => {
      void (async () => {
        const file = input.files?.[0];
        if (!file || file.size === 0) {
          tamamla(null);
          return;
        }
        try {
          const mime = dosyaMime(file, accept);
          const gorsel = mime.startsWith("image/");
          const uri = gorsel ? await webDosyaDataUri(file) : URL.createObjectURL(file);
          tamamla({
            uri,
            name: file.name || `dosya-${Date.now()}`,
            mime,
            size: file.size,
            blob: file,
          });
        } catch {
          tamamla(null);
        }
      })();
    };

    const iptal = () => tamamla(null);

    input.addEventListener("change", degisti, { once: true });
    input.addEventListener("cancel", iptal, { once: true });
    input.click();
  });
}
