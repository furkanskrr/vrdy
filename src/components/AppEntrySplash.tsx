import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const APP_NAME = Constants.expoConfig?.name ?? "Vardiyam?";

type Props = {
  /** Oturum / veri yüklenirken altta gösterilir */
  showSpinner?: boolean;
};

function createSplashStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
    },
    logoWrap: {
      marginBottom: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    logoIcon: {
      opacity: 0.96,
    },
    title: {
      color: colors.primary,
      fontSize: 26,
      fontWeight: "700",
      letterSpacing: -0.5,
      textShadowColor: "rgba(37, 99, 235, 0.2)",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    },
    footer: {
      position: "absolute",
      bottom: 56,
    },
  });
}

export function AppEntrySplash({ showSpinner = true }: Props) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createSplashStyles(colors), [colors]);
  const logoSize = Math.min(200, Math.max(132, Math.round(width * 0.38)));

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <View style={[styles.logoWrap, { width: logoSize, height: logoSize }]}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={Math.round(logoSize * 0.82)}
            color={colors.primary}
            style={styles.logoIcon}
          />
        </View>
        <Text style={styles.title}>{APP_NAME}</Text>
      </View>
      {showSpinner ? (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}
