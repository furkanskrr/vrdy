import { useEffect, useState } from "react";
import { Platform } from "react-native";

function klavyeBosluguHesapla(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const gap = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
  return Math.round(gap);
}

/** Klavye açıkken ekranın altına eklenecek padding (px); kapalıyken 0 — web/PWA */
export function useWebKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const guncelle = () => {
      const gap = klavyeBosluguHesapla();
      setOverlap(gap > 8 ? gap : 0);
    };

    const gecikmeliGuncelle = () => {
      guncelle();
      window.setTimeout(guncelle, 80);
      window.setTimeout(guncelle, 280);
    };

    guncelle();
    vv.addEventListener("resize", gecikmeliGuncelle);
    vv.addEventListener("scroll", guncelle);
    window.addEventListener("resize", gecikmeliGuncelle);

    const odakGirdi = (e: FocusEvent) => {
      const hedef = e.target;
      if (
        hedef instanceof HTMLInputElement ||
        hedef instanceof HTMLTextAreaElement ||
        (hedef instanceof HTMLElement && hedef.isContentEditable)
      ) {
        gecikmeliGuncelle();
      }
    };
    const odakCikti = () => window.setTimeout(guncelle, 120);

    document.addEventListener("focusin", odakGirdi);
    document.addEventListener("focusout", odakCikti);

    return () => {
      vv.removeEventListener("resize", gecikmeliGuncelle);
      vv.removeEventListener("scroll", guncelle);
      window.removeEventListener("resize", gecikmeliGuncelle);
      document.removeEventListener("focusin", odakGirdi);
      document.removeEventListener("focusout", odakCikti);
    };
  }, []);

  return overlap;
}
