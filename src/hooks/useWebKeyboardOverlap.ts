import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

function girdiOdaktaMi(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

function klavyeBosluguHesapla(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const layoutAlt = window.innerHeight;
  const gorunurAlt = vv.offsetTop + vv.height;
  const gap = Math.max(0, Math.round(layoutAlt - gorunurAlt));
  const ustSinir = Math.round(layoutAlt * 0.5);
  return Math.min(gap, ustSinir);
}

/** Klavye açıkken composer margin (px); kapalı veya odak yokken 0 — web/PWA */
export function useWebKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);
  const odaktaRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const guncelle = () => {
      if (!odaktaRef.current && !girdiOdaktaMi()) {
        setOverlap(0);
        return;
      }
      const gap = klavyeBosluguHesapla();
      setOverlap(gap > 10 ? gap : 0);
    };

    const gecikmeliGuncelle = () => {
      guncelle();
      window.setTimeout(guncelle, 80);
      window.setTimeout(guncelle, 220);
    };

    const odakGirdi = (e: FocusEvent) => {
      const hedef = e.target;
      if (
        hedef instanceof HTMLInputElement ||
        hedef instanceof HTMLTextAreaElement ||
        (hedef instanceof HTMLElement && hedef.isContentEditable)
      ) {
        odaktaRef.current = true;
        gecikmeliGuncelle();
      }
    };
    const odakCikti = () => {
      odaktaRef.current = false;
      setOverlap(0);
      window.setTimeout(guncelle, 100);
    };

    guncelle();
    vv.addEventListener("resize", gecikmeliGuncelle);
    vv.addEventListener("scroll", guncelle);
    window.addEventListener("resize", gecikmeliGuncelle);
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
