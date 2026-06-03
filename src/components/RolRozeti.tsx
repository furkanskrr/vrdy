import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import type { TeamRole } from "../types";
import { useTheme } from "../context/ThemeContext";

export type RolRozetiSize = "sm" | "md" | "lg";

/** Dış kutu (px) — önceki sürüme göre küçültüldü */
const BOX: Record<RolRozetiSize, number> = {
  sm: 20,
  md: 24,
  lg: 28,
};

function ikonOlcu(kutu: number): number {
  return Math.min(12, Math.max(9, Math.round(kutu * 0.42)));
}

function hafifGolge(vurgu: "altin" | "mor" | "notr"): ViewStyle {
  if (vurgu === "altin") {
    return Platform.select({
      ios: {
        shadowColor: "#6b5410",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
      default: {},
    }) as ViewStyle;
  }
  if (vurgu === "mor") {
    return Platform.select({
      ios: {
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 2.5,
      },
      android: { elevation: 2 },
      default: {},
    }) as ViewStyle;
  }
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }) as ViewStyle;
}

function erisimEtiketi(rol: TeamRole): string {
  if (rol === "mudur") return "Müdür rozeti";
  if (rol === "yardimci") return "Müdür yardımcısı rozeti";
  return "Personel rozeti";
}

function yaricap(kutu: number): number {
  return Math.max(6, Math.round(kutu * 0.28));
}

function BadgePersonel({ kutu, colors }: { kutu: number; colors: ThemeColors }) {
  const r = yaricap(kutu);
  const ikon = ikonOlcu(kutu);

  return (
    <View
      style={[
        styles.kutu,
        {
          width: kutu,
          height: kutu,
          borderRadius: r,
          backgroundColor: colors.surface2,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: colors.border,
        },
        hafifGolge("notr"),
      ]}
    >
      <Ionicons name="person-outline" size={ikon} color={colors.textMuted} />
    </View>
  );
}

function BadgeYardimci({ kutu, colors, isDark }: { kutu: number; colors: ThemeColors; isDark: boolean }) {
  const r = yaricap(kutu);
  const ikon = ikonOlcu(kutu);
  const ic = isDark ? "rgba(139, 92, 246, 0.18)" : "rgba(139, 92, 246, 0.12)";

  return (
    <View
      style={[
        styles.kutu,
        {
          width: kutu,
          height: kutu,
          borderRadius: r,
          backgroundColor: ic,
          borderWidth: 1.5,
          borderColor: colors.fullday,
        },
        hafifGolge("mor"),
      ]}
    >
      <Ionicons name="shield-half-outline" size={ikon} color={colors.fullday} />
    </View>
  );
}

function BadgeMudur({ kutu, isDark }: { kutu: number; isDark: boolean }) {
  const r = yaricap(kutu);
  const ikon = ikonOlcu(kutu);
  const icArka = isDark ? "#1f1a14" : "#faf8f4";

  return (
    <LinearGradient
      colors={["#e8d5a8", "#c5a035", "#8a6d1f"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.altinCerceve,
        {
          width: kutu,
          height: kutu,
          borderRadius: r,
          padding: 1.5,
        },
        hafifGolge("altin"),
      ]}
    >
      <View
        style={[
          styles.kutu,
          {
            flex: 1,
            borderRadius: Math.max(4, r - 2),
            backgroundColor: icArka,
            minWidth: 0,
            minHeight: 0,
          },
        ]}
      >
        <Ionicons name="shield" size={ikon} color="#a67c1a" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  kutu: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  altinCerceve: {
    overflow: "hidden",
  },
});

/**
 * Kompakt, yazısız rol mührü — nötr / idari görünüm (oyun veya abartılı süs yok).
 */
export function RolRozeti({ rol, size = "md" }: { rol: TeamRole; size?: RolRozetiSize }) {
  const { colors, isDark } = useTheme();
  const kutu = BOX[size];

  const icerik =
    rol === "mudur" ? (
      <BadgeMudur kutu={kutu} isDark={isDark} />
    ) : rol === "yardimci" ? (
      <BadgeYardimci kutu={kutu} colors={colors} isDark={isDark} />
    ) : (
      <BadgePersonel kutu={kutu} colors={colors} />
    );

  return (
    <View
      style={{ alignItems: "center", justifyContent: "center" }}
      accessibilityRole="image"
      accessibilityLabel={erisimEtiketi(rol)}
    >
      {icerik}
    </View>
  );
}
