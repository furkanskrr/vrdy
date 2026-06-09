import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { sohbetEkAc, sohbetEkGoruntulemeUrl } from "../lib/groupChatMedia";
import type { GrupMesaji } from "../types";
import { SohbetGorselBuyutModal } from "./SohbetGorselBuyutModal";

type Props = {
  mesaj: GrupMesaji;
  mine: boolean;
  colors: ThemeColors;
};

function gorselMi(mesaj: GrupMesaji): boolean {
  if (mesaj.attachment_type === "image") return true;
  const mime = mesaj.attachment_mime ?? "";
  const ad = mesaj.attachment_name ?? "";
  return mime.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(ad);
}

export function GroupChatAttachmentBubble({ mesaj, mine, colors }: Props) {
  const [url, setUrl] = useState<string | null>(mesaj.attachment_url ?? null);
  const [yukleniyor, setYukleniyor] = useState(!!mesaj.attachment_path && !mesaj.attachment_url);
  const [hata, setHata] = useState(false);
  const [buyut, setBuyut] = useState(false);
  const [onizlemeHata, setOnizlemeHata] = useState(false);
  const otomatikDeneme = useRef(0);

  const urlYukle = useCallback(async () => {
    if (!mesaj.attachment_path) return;
    setYukleniyor(true);
    setHata(false);
    setOnizlemeHata(false);
    const u = await sohbetEkGoruntulemeUrl(mesaj.attachment_path);
    setUrl(u);
    setYukleniyor(false);
    if (!u) setHata(true);
  }, [mesaj.attachment_path]);

  useEffect(() => {
    otomatikDeneme.current = 0;
    if (!mesaj.attachment_path || mesaj.attachment_url) return;
    void urlYukle();
  }, [mesaj.attachment_path, mesaj.attachment_url, urlYukle]);

  useEffect(() => {
    if ((!hata && !onizlemeHata) || otomatikDeneme.current >= 2) return;
    otomatikDeneme.current += 1;
    const t = setTimeout(() => void urlYukle(), 700);
    return () => clearTimeout(t);
  }, [hata, onizlemeHata, urlYukle]);

  if (!mesaj.attachment_path && !mesaj.attachment_type) return null;

  const resim = gorselMi(mesaj);

  if (yukleniyor) {
    return (
      <View style={styles.yukle}>
        <ActivityIndicator size="small" color={mine ? "#fff" : colors.primary} />
      </View>
    );
  }

  if (resim) {
    if (hata || !url || onizlemeHata) {
      return (
        <Pressable style={styles.hataKutu} onPress={() => void urlYukle()}>
          <Ionicons name="image-outline" size={22} color={mine ? "#fff" : colors.textMuted} />
          <Text style={[styles.hataMetin, mine && styles.hataMetinMine]}>
            Fotoğraf yüklenemedi · Tekrar dene
          </Text>
        </Pressable>
      );
    }

    return (
      <>
        <Pressable
          onPress={() => setBuyut(true)}
          style={styles.gorselWrap}
          accessibilityRole="button"
          accessibilityLabel="Fotoğrafı büyüt"
        >
          <Image
            source={{ uri: url }}
            style={styles.gorsel}
            resizeMode="cover"
            onError={() => setOnizlemeHata(true)}
          />
        </Pressable>
        <SohbetGorselBuyutModal visible={buyut} uri={url} onKapat={() => setBuyut(false)} />
      </>
    );
  }

  const ad = mesaj.attachment_name?.trim() || "Dosya";
  return (
    <Pressable
      style={[styles.dosyaKart, mine ? styles.dosyaKartMine : null]}
      onPress={() => url && sohbetEkAc(url)}
      disabled={!url}
    >
      <Ionicons name="document-attach-outline" size={18} color={mine ? "#fff" : colors.primary} />
      <Text style={[styles.dosyaAd, mine && styles.dosyaAdMine]} numberOfLines={2}>
        {ad}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  yukle: { paddingVertical: 12, alignItems: "center", minWidth: 120 },
  gorselWrap: {
    marginBottom: 4,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  gorsel: { width: 220, height: 160, borderRadius: 10 },
  hataKutu: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    minWidth: 160,
    minHeight: 80,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginBottom: 4,
    gap: 6,
  },
  hataMetin: { fontSize: 11, fontWeight: "600", color: "#64748b", textAlign: "center" },
  hataMetinMine: { color: "rgba(255,255,255,0.85)" },
  dosyaKart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
    maxWidth: 240,
  },
  dosyaKartMine: {},
  dosyaAd: { flex: 1, fontSize: 13, fontWeight: "600", color: "#1e293b" },
  dosyaAdMine: { color: "#fff" },
});
