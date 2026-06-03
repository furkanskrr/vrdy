import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { AYLIK_HEDEF_SAAT } from "../constants/shifts";
import type { TeamMember } from "../types";
import { RolRozeti } from "./RolRozeti";

type Props = {
  uye: TeamMember;
  saat: number;
  hedef?: number;
};

function barRenk(oran: number, colors: ThemeColors): string {
  if (oran >= 0.9) return colors.morning;
  if (oran >= 0.6) return colors.primary;
  if (oran >= 0.3) return colors.afternoon;
  return colors.antre;
}

function createHoursBarStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      marginBottom: 14,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    meta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    metaLeft: { flex: 1 },
    metaRight: { alignItems: "flex-end" },
    ad: { color: colors.text, fontSize: 14, fontWeight: "700" },
    rol: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    yuzde: { fontSize: 18, fontWeight: "800" },
    saat: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surface2,
      overflow: "hidden",
    },
    fill: {
      height: 8,
      borderRadius: 4,
    },
    eksikRow: { marginTop: 6 },
    eksikText: { fontSize: 11, color: colors.textMuted },
  });
}

export function HoursBar({ uye, saat, hedef = AYLIK_HEDEF_SAAT }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createHoursBarStyles(colors), [colors]);
  const oran = Math.min(1, saat / hedef);
  const yuzde = Math.round(oran * 100);
  const renk = barRenk(oran, colors);
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: oran,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [oran]);

  const animWidth = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.row}>
      <View style={styles.meta}>
        <View style={styles.metaLeft}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={styles.ad} numberOfLines={1}>
              {uye.ad}
            </Text>
            <RolRozeti rol={uye.rol} size="sm" />
          </View>
        </View>
        <View style={styles.metaRight}>
          <Text style={[styles.yuzde, { color: renk }]}>{yuzde}%</Text>
          <Text style={styles.saat}>
            {saat} / {hedef} sa
          </Text>
        </View>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: animWidth, backgroundColor: renk }]} />
      </View>
      <View style={styles.eksikRow}>
        <Text style={styles.eksikText}>
          {saat >= hedef ? "Hedef tamamlandı" : `${(hedef - saat).toFixed(1)} saat kaldı`}
        </Text>
      </View>
    </View>
  );
}
