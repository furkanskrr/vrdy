import React, { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";

/** iOS Safari, 16px altı input fontunda otomatik zoom yapar. */
export function webFormFontSize(): number {
  return Platform.OS === "web" ? 16 : 15;
}

type Props = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  colors: ThemeColors;
  style?: ViewStyle;
  trailing?: ReactNode;
  children: ReactNode;
};

/** Giriş / kayıt formları: odakta tema rengiyle çerçeve, web zoom yok. */
export function AuthInputRow({ icon, colors, style, trailing, children }: Props) {
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => createStyles(colors, focused), [colors, focused]);

  const child = React.Children.only(children) as ReactElement<{
    onFocus?: (e: unknown) => void;
    onBlur?: (e: unknown) => void;
    style?: unknown;
  }>;

  const input = React.cloneElement(child, {
    onFocus: (e: unknown) => {
      setFocused(true);
      child.props.onFocus?.(e);
    },
    onBlur: (e: unknown) => {
      setFocused(false);
      child.props.onBlur?.(e);
    },
    style: [child.props.style, { fontSize: webFormFontSize() }],
  });

  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} style={styles.icon} />
      {input}
      {trailing}
    </View>
  );
}

function createStyles(colors: ThemeColors, focused: boolean) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: focused ? colors.surface : colors.surface2,
      borderWidth: focused ? 2 : 1,
      borderColor: focused ? colors.primary : colors.border,
      borderRadius: 14,
      marginBottom: 12,
      paddingHorizontal: 14,
      ...(Platform.OS === "web" && focused
        ? ({
            boxShadow: `0 0 0 3px ${colors.primaryMuted}55`,
          } as ViewStyle)
        : null),
    },
    icon: { marginRight: 10 },
  });
}
