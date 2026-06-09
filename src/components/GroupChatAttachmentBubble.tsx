import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { sohbetEkAc, sohbetEkImzaliUrl } from "../lib/groupChatMedia";
import type { GrupMesaji } from "../types";

type Props = {
  mesaj: GrupMesaji;
  mine: boolean;
  colors: ThemeColors;
};

export function GroupChatAttachmentBubble({ mesaj, mine, colors }: Props) {
  const [url, setUrl] = useState<string | null>(mesaj.attachment_url ?? null);
  const [yukleniyor, setYukleniyor] = useState(!!mesaj.attachment_path && !mesaj.attachment_url);

  useEffect(() => {
    let iptal = false;
    if (!mesaj.attachment_path || mesaj.attachment_url) return;
    void (async () => {
      const u = await sohbetEkImzaliUrl(mesaj.attachment_path!);
      if (!iptal) {
        setUrl(u);
        setYukleniyor(false);
      }
    })();
    return () => {
      iptal = true;
    };
  }, [mesaj.attachment_path, mesaj.attachment_url]);

  if (!mesaj.attachment_path && !mesaj.attachment_type) return null;

  if (yukleniyor) {
    return (
      <View style={styles.yukle}>
        <ActivityIndicator size="small" color={mine ? "#fff" : colors.primary} />
      </View>
    );
  }

  if (mesaj.attachment_type === "image" && url) {
    return (
      <Pressable onPress={() => sohbetEkAc(url)} style={styles.gorselWrap}>
        <Image source={{ uri: url }} style={styles.gorsel} resizeMode="cover" />
      </Pressable>
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
  yukle: { paddingVertical: 12, alignItems: "center" },
  gorselWrap: { marginBottom: 4, borderRadius: 10, overflow: "hidden" },
  gorsel: { width: 220, height: 160, borderRadius: 10 },
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
