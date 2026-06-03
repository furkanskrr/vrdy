import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ShiftKind } from "../types";
import { vardiyaEtiket, vardiyaRenk, vardiyaSaatAraligi } from "../lib/vardiya";
import { shiftKindSaat } from "../constants/shifts";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

function vardiyaIkon(v: ShiftKind): keyof typeof Ionicons.glyphMap {
  switch (v) {
    case "sabah":
      return "sunny-outline";
    case "ogle":
      return "partly-sunny-outline";
    case "tamgun":
      return "today-outline";
    case "izin":
      return "bed-outline";
    case "antre":
      return "swap-horizontal-outline";
    case "aksam":
      return "moon-outline";
    case "envanter":
      return "clipboard-outline";
    case "envanter_izni":
      return "checkmark-circle-outline";
    case "envanter_full":
      return "clipboard-outline";
    case "resmi_tatil":
      return "flag-outline";
    default:
      return "help-outline";
  }
}

function createShiftBadgeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: { fontSize: 13, fontWeight: "700" },
    sub: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
    saatText: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: "600" },
    compactWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1.5,
    },
    compactLabel: { fontSize: 13, fontWeight: "700" },
  });
}

type Props = { shift: ShiftKind; compact?: boolean; showHours?: boolean };

export function ShiftBadge({ shift, compact, showHours }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createShiftBadgeStyles(colors), [colors]);
  const bg = vardiyaRenk(shift, colors);
  const saat = shiftKindSaat(shift);

  if (compact) {
    return (
      <View style={[styles.compactWrap, { backgroundColor: bg + "22", borderColor: bg }]}>
        <Ionicons name={vardiyaIkon(shift)} size={14} color={bg} />
        <Text style={[styles.compactLabel, { color: bg }]}>{vardiyaEtiket(shift)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: bg + "18", borderColor: bg }]}>
      <View style={styles.topRow}>
        <Ionicons name={vardiyaIkon(shift)} size={16} color={bg} />
        <Text style={[styles.label, { color: bg }]}>{vardiyaEtiket(shift)}</Text>
      </View>
      <Text style={styles.sub}>{vardiyaSaatAraligi(shift)}</Text>
      {showHours && saat > 0 && <Text style={styles.saatText}>{saat} saat</Text>}
    </View>
  );
}
