import { useEffect, useState } from "react";
import { Platform } from "react-native";

/** Web alt sekme yüksekliği (px) — React Navigation tab bar */
export const WEB_TAB_BAR_YUKSEKLIK = 52;

export type WebComposerLayout = {
  /** Composer `bottom` (px), viewport altından */
  composerBottom: number;
  /** Mesaj listesi alt iç boşluğu */
  listeAltBosluk: number;
  klavyeAcik: boolean;
};

/**
 * Mobil web/PWA: klavye açıkken composer’ı görünür alanın üstüne sabitler.
 * `interactive-widget=resizes-content` ile birlikte kullanılmaz (çift küçültme olur).
 */
export function useWebComposerLayout(composerYukseklik = 76): WebComposerLayout {
  const [layout, setLayout] = useState<WebComposerLayout>({
    composerBottom: WEB_TAB_BAR_YUKSEKLIK,
    listeAltBosluk: composerYukseklik + WEB_TAB_BAR_YUKSEKLIK + 12,
    klavyeAcik: false,
  });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const guncelle = () => {
      const layoutH = window.innerHeight;
      const gorunurAlt = vv.offsetTop + vv.height;
      const overlap = Math.max(0, layoutH - gorunurAlt);
      const klavyeAcik = overlap > 64;

      const composerBottom = klavyeAcik ? overlap : WEB_TAB_BAR_YUKSEKLIK;
      const listeAltBosluk = composerYukseklik + composerBottom + (klavyeAcik ? 8 : 16);

      setLayout({ composerBottom, listeAltBosluk, klavyeAcik });

      if (vv.offsetTop > 0) {
        window.scrollTo(0, 0);
      }
    };

    guncelle();
    vv.addEventListener("resize", guncelle);
    vv.addEventListener("scroll", guncelle);
    window.addEventListener("resize", guncelle);
    return () => {
      vv.removeEventListener("resize", guncelle);
      vv.removeEventListener("scroll", guncelle);
      window.removeEventListener("resize", guncelle);
    };
  }, [composerYukseklik]);

  return layout;
}
