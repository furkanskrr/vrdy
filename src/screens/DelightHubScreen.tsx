import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { AppearanceId } from "../constants/appearances";
import { APPEARANCE_CATALOG } from "../constants/appearances";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useDelight } from "../context/DelightContext";
import { playDelightFeedback } from "../lib/delight/feedback";
import { ustEkranBoslugu } from "../lib/safeArea";
import { useAuth } from "../context/AuthContext";
import { RolRozeti } from "../components/RolRozeti";

const ONERILEN_VURGU: string[] = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0d9488",
  "#0891b2",
  "#6366f1",
];

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    scrollInner: { paddingHorizontal: 18, paddingBottom: 36 },
    hero: {
      marginTop: 6,
      marginBottom: 22,
      padding: 18,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    heroEyebrow: { fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 1.2, marginBottom: 6 },
    heroTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
    heroSub: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 19 },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: 12, marginTop: 8 },
    appearanceCard: {
      padding: 16,
      borderRadius: 18,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    appearanceCardActive: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    appearanceRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    swatchRow: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
    swatch: { width: 22, height: 22, borderRadius: 8 },
    appearanceName: { fontSize: 17, fontWeight: "800", color: colors.text },
    appearanceTag: { fontSize: 12, color: colors.primary, fontWeight: "600", marginTop: 2 },
    appearanceNote: { fontSize: 12, color: colors.textMuted, marginTop: 8, lineHeight: 17 },
    expRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    expLabel: { fontSize: 15, fontWeight: "600", color: colors.text, flex: 1 },
    expSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, maxWidth: 260 },
    hexInput: {
      marginTop: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface2,
      fontVariant: ["tabular-nums"],
    },
    oneriRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    oneriChip: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    oneriChipActive: { borderWidth: 2, borderColor: colors.text },
    temizBtn: {
      marginTop: 12,
      alignSelf: "flex-start",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    temizBtnText: { fontSize: 14, fontWeight: "600", color: colors.text },
  });
}

export function DelightHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, appearanceId, setAppearance } = useTheme();
  const { user } = useAuth();
  const delight = useDelight();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [hexTaslak, setHexTaslak] = useState(delight.customAccentHex ?? "");

  useEffect(() => {
    setHexTaslak(delight.customAccentHex ?? "");
  }, [delight.customAccentHex]);

  const ust = ustEkranBoslugu(insets.top, 8);

  async function gorunumSec(id: AppearanceId) {
    setAppearance(id);
    void playDelightFeedback("success", {
      hapticsEnabled: delight.uiHapticsEnabled,
      soundsEnabled: delight.uiSoundsEnabled,
    });
  }

  function hexUygula() {
    const t = hexTaslak.trim();
    if (!t) {
      delight.setCustomAccentHex(null);
      return;
    }
    let normalized = t.startsWith("#") ? t : `#${t}`;
    if (/^#[0-9A-Fa-f]{3}$/.test(normalized)) {
      const r = normalized[1]!;
      const g = normalized[2]!;
      const b = normalized[3]!;
      normalized = `#${r}${r}${g}${g}${b}${b}`;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
      void playDelightFeedback("warning", {
        hapticsEnabled: delight.uiHapticsEnabled,
        soundsEnabled: delight.uiSoundsEnabled,
      });
      return;
    }
    delight.setCustomAccentHex(normalized);
    void playDelightFeedback("success", {
      hapticsEnabled: delight.uiHapticsEnabled,
      soundsEnabled: delight.uiSoundsEnabled,
    });
  }

  function oneriSec(hex: string) {
    setHexTaslak(hex);
    delight.setCustomAccentHex(hex);
    void playDelightFeedback("selection", {
      hapticsEnabled: delight.uiHapticsEnabled,
      soundsEnabled: delight.uiSoundsEnabled,
    });
  }

  function vurguTemizle() {
    setHexTaslak("");
    delight.setCustomAccentHex(null);
    void playDelightFeedback("impactLight", {
      hapticsEnabled: delight.uiHapticsEnabled,
      soundsEnabled: delight.uiSoundsEnabled,
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingTop: ust }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>DENEYİM STÜDYOSU</Text>
          <Text style={styles.heroTitle}>Görünüm ve geri bildirim</Text>
          <Text style={styles.heroSub}>
            Tüm görünüm paketleri herkes için açıktır. İsterseniz önerilen renklerden bir vurgu seçin veya
            #HEX ile kendi renginizi girin; vardiya renkleri korunur, yalnızca birincil aksan güncellenir.
          </Text>
          {user ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                {user.ad}
              </Text>
              <RolRozeti rol={user.rol} size="md" />
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>GÖRÜNÜM PAKETLERİ</Text>
        {APPEARANCE_CATALOG.map((meta) => {
          const aktif = appearanceId === meta.id;
          return (
            <Pressable
              key={meta.id}
              style={[styles.appearanceCard, aktif && styles.appearanceCardActive]}
              onPress={() => void gorunumSec(meta.id)}
            >
              <View style={styles.appearanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appearanceName}>{meta.name}</Text>
                  <Text style={styles.appearanceTag}>{meta.tagline}</Text>
                  <View style={styles.swatchRow}>
                    {meta.accentPreview.map((hex) => (
                      <View key={hex} style={[styles.swatch, { backgroundColor: hex }]} />
                    ))}
                  </View>
                  <Text style={styles.appearanceNote}>{meta.curatorNote}</Text>
                </View>
                {aktif ? (
                  <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={26} color={colors.border} />
                )}
              </View>
            </Pressable>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>KİŞİSEL VURGU RENGİ</Text>
        <View style={styles.appearanceCard}>
          <Text style={[styles.appearanceNote, { marginTop: 0 }]}>
            Önerilen tonlar (dokununca uygulanır). İsterseniz alttan #RRGGBB veya #RGB yazıp uygulayın.
          </Text>
          <View style={styles.oneriRow}>
            {ONERILEN_VURGU.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => oneriSec(hex)}
                style={[
                  styles.oneriChip,
                  { backgroundColor: hex },
                  delight.customAccentHex === hex && styles.oneriChipActive,
                ]}
              />
            ))}
          </View>
          <TextInput
            style={styles.hexInput}
            placeholder="#2563eb veya 2563eb"
            placeholderTextColor={colors.textMuted}
            value={hexTaslak}
            onChangeText={setHexTaslak}
            onSubmitEditing={hexUygula}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Pressable style={styles.temizBtn} onPress={hexUygula}>
            <Text style={styles.temizBtnText}>HEX uygula</Text>
          </Pressable>
          <Pressable style={[styles.temizBtn, { marginTop: 8 }]} onPress={vurguTemizle}>
            <Text style={styles.temizBtnText}>Özel vurguyu kaldır (paket rengine dön)</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>GERİ BİLDİRİM</Text>
        <View style={[styles.appearanceCard, { marginBottom: 0 }]}>
          <View style={styles.expRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expLabel}>Dokunsal (haptic)</Text>
              <Text style={styles.expSub}>Seçim ve onay için titreşim desenleri.</Text>
            </View>
            <Switch
              value={delight.uiHapticsEnabled}
              onValueChange={(v) => {
                delight.setUiHapticsEnabled(v);
                if (v) {
                  void playDelightFeedback("impactLight", { hapticsEnabled: true, soundsEnabled: false });
                }
              }}
              trackColor={{ false: colors.surface2, true: colors.primaryMuted }}
              thumbColor={delight.uiHapticsEnabled ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={[styles.expRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expLabel}>Akustik katman</Text>
              <Text style={styles.expSub}>İleride kısa UI sesleri için hazır; şimdilik kapalı.</Text>
            </View>
            <Switch
              value={delight.uiSoundsEnabled}
              onValueChange={delight.setUiSoundsEnabled}
              trackColor={{ false: colors.surface2, true: colors.primaryMuted }}
              thumbColor={delight.uiSoundsEnabled ? colors.primary : colors.textMuted}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
