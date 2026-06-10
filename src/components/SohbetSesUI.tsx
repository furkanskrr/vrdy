import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import type { ThemeColors } from "../constants/theme";
import { sureFormat } from "../lib/sohbetSesKaydi";
import type { SohbetEkTaslak } from "../lib/groupChatMedia";

type KayitBantiProps = {
  sureSn: number;
  colors: ThemeColors;
  onDurdur: () => void;
  onIptal: () => void;
};

/** Kayıt sırasında — yanıt bandıyla aynı görsel dil */
export function SohbetSesKayitBanti({ sureSn, colors, onDurdur, onIptal }: KayitBantiProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 520, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const st = useMemo(() => createKayitStyles(colors), [colors]);

  return (
    <View style={st.bant}>
      <Pressable onPress={onIptal} hitSlop={10} accessibilityLabel="Kaydı iptal et">
        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
      </Pressable>
      <Animated.View style={[st.nokta, { opacity: pulse }]} />
      <Text style={st.sure}>{sureFormat(sureSn)}</Text>
      <View style={st.cizgi} />
      <Text style={st.ipucu}>Kaydediliyor</Text>
      <Pressable
        style={st.durdurBtn}
        onPress={onDurdur}
        accessibilityRole="button"
        accessibilityLabel="Kaydı bitir"
      >
        <Ionicons name="stop" size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

type OnizlemeProps = {
  ek: SohbetEkTaslak;
  colors: ThemeColors;
  onKaldir: () => void;
};

export function SohbetSesOnizleme({ ek, colors, onKaldir }: OnizlemeProps) {
  const st = useMemo(() => createOnizlemeStyles(colors), [colors]);
  const player = useAudioPlayer(ek.uri);
  const durum = useAudioPlayerStatus(player);
  const sure = ek.sesSureSn ?? 0;

  return (
    <View style={st.sarmal}>
      <View style={st.kart}>
        <Pressable
          style={st.oynatBtn}
          onPress={() => (durum.playing ? player.pause() : player.play())}
          accessibilityLabel={durum.playing ? "Duraklat" : "Dinle"}
        >
          <Ionicons name={durum.playing ? "pause" : "play"} size={18} color={colors.primary} />
        </Pressable>
        <View style={st.metin}>
          <Text style={st.baslik}>Ses mesajı</Text>
          <Text style={st.sure}>{sureFormat(sure)}</Text>
        </View>
        <View style={st.dalga}>
          {[0.35, 0.7, 1, 0.55, 0.85, 0.4, 0.65].map((h, i) => (
            <View key={i} style={[st.cubuk, { height: 6 + h * 14 }]} />
          ))}
        </View>
      </View>
      <Pressable onPress={onKaldir} hitSlop={8} accessibilityLabel="Ses ekini kaldır">
        <Ionicons name="close-circle" size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

type OynaticiProps = {
  uri: string;
  sureSn?: number;
  mine: boolean;
  colors: ThemeColors;
};

export function SohbetSesOynatici({ uri, sureSn, mine, colors }: OynaticiProps) {
  const player = useAudioPlayer(uri);
  const durum = useAudioPlayerStatus(player);
  const st = useMemo(() => createOynaticiStyles(colors, mine), [colors, mine]);

  const ilerleme =
    durum.duration > 0 ? Math.min(1, durum.currentTime / durum.duration) : 0;
  const gosterilenSure = durum.playing || durum.currentTime > 0
    ? sureFormat(durum.currentTime)
    : sureFormat(sureSn ?? durum.duration);

  return (
    <Pressable
      style={st.kart}
      onPress={() => (durum.playing ? player.pause() : player.play())}
      accessibilityRole="button"
      accessibilityLabel="Ses mesajını oynat"
    >
      <View style={st.oynat}>
        <Ionicons
          name={durum.playing ? "pause" : "play"}
          size={16}
          color={mine ? "#fff" : colors.primary}
        />
      </View>
      <View style={st.izgara}>
        <View style={st.cubuklar}>
          {[0.3, 0.65, 0.45, 0.9, 0.5, 0.75, 0.4, 0.8, 0.55].map((h, i) => (
            <View
              key={i}
              style={[
                st.cubuk,
                { height: 4 + h * 12 },
                i / 9 <= ilerleme ? st.cubukAktif : null,
              ]}
            />
          ))}
        </View>
        <Text style={st.sure}>{gosterilenSure}</Text>
      </View>
    </Pressable>
  );
}

function createKayitStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bant: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.primaryMuted + "22",
    },
    nokta: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#ef4444",
    },
    sure: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
      fontVariant: ["tabular-nums"],
      minWidth: 40,
    },
    cizgi: { flex: 1 },
    ipucu: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    durdurBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}

function createOnizlemeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sarmal: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    kart: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    oynatBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryMuted + "55",
      alignItems: "center",
      justifyContent: "center",
    },
    metin: { minWidth: 72 },
    baslik: { fontSize: 13, fontWeight: "700", color: colors.text },
    sure: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
    dalga: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3 },
    cubuk: {
      width: 3,
      borderRadius: 2,
      backgroundColor: colors.primary + "88",
    },
  });
}

function createOynaticiStyles(colors: ThemeColors, mine: boolean) {
  const vurgu = mine ? "rgba(255,255,255,0.35)" : colors.primary + "44";
  const metin = mine ? "rgba(255,255,255,0.9)" : colors.text;
  const cubukPasif = mine ? "rgba(255,255,255,0.35)" : colors.border;
  const cubukAktifRenk = mine ? "#fff" : colors.primary;

  return StyleSheet.create({
    kart: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 200,
      maxWidth: 240,
      paddingVertical: 4,
      marginBottom: 4,
    },
    oynat: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: vurgu,
      alignItems: "center",
      justifyContent: "center",
    },
    izgara: { flex: 1, gap: 4 },
    cubuklar: { flexDirection: "row", alignItems: "center", gap: 2, height: 18 },
    cubuk: {
      flex: 1,
      maxWidth: 4,
      borderRadius: 2,
      backgroundColor: cubukPasif,
    },
    cubukAktif: { backgroundColor: cubukAktifRenk },
    sure: {
      fontSize: 11,
      fontWeight: "700",
      color: metin,
      fontVariant: ["tabular-nums"],
    },
  });
}
