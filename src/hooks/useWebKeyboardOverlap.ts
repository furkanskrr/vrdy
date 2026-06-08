import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

function klavyeBosluguHesapla(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  const layoutAlt = window.innerHeight;
  const gorunurAlt = vv.offsetTop + vv.height;
  return Math.max(0, Math.round(layoutAlt - gorunurAlt));
}

function girdiOdaktaMi(): boolean {
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

/** Klavye açıkken composer için alt boşluk (px) — web/PWA */
export function useWebKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);
  const odaktaRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const guncelle = () => {
      const gap = klavyeBosluguHesapla();
      setOverlap(gap > 6 ? gap : 0);
    };

    const gecikmeliGuncelle = () => {
      guncelle();
      window.setTimeout(guncelle, 60);
      window.setTimeout(guncelle, 180);
      window.setTimeout(guncelle, 420);
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
        odaktaRef.current = true;
        gecikmeliGuncelle();
      }
    };
    const odakCikti = () => {
      odaktaRef.current = false;
      window.setTimeout(guncelle, 150);
    };

    document.addEventListener("focusin", odakGirdi);
    document.addEventListener("focusout", odakCikti);

    const poll = window.setInterval(() => {
      if (odaktaRef.current || girdiOdaktaMi()) guncelle();
    }, 120);

    return () => {
      vv.removeEventListener("resize", gecikmeliGuncelle);
      vv.removeEventListener("scroll", guncelle);
      window.removeEventListener("resize", gecikmeliGuncelle);
      document.removeEventListener("focusin", odakGirdi);
      document.removeEventListener("focusout", odakCikti);
      window.clearInterval(poll);
    };
  }, []);

  return overlap;
}
