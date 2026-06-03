import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import type { ThemeColors } from "../constants/theme";
import { useTheme } from "./ThemeContext";

export type BildirimTipi = "vardiya" | "izin" | "bilgi";

export type Bildirim = {
  id: string;
  tip: BildirimTipi;
  baslik: string;
  mesaj: string;
  zaman: Date;
};

type NotificationContextValue = {
  bildirimler: Bildirim[];
  bildirimGonder: (tip: BildirimTipi, baslik: string, mesaj: string) => void;
  temizle: () => void;
  /** Üstte kısa uygulama içi özet (vardiya / izin kaydı vb.) */
  icBildirimKutusu: boolean;
  setIcBildirimKutusu: (acik: boolean) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const IC_BILDIRIM_STORAGE = "@vrdy_ic_bildirim_kutusu";

let _sayac = 0;

function createToastStyles(colors: ThemeColors) {
  return StyleSheet.create({
    toast: {
      position: "absolute",
      top: 54,
      left: 16,
      right: 16,
      zIndex: 999,
    },
    toastInner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      elevation: 8,
    },
    toastIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    toastContent: { flex: 1 },
    toastBaslik: { fontSize: 14, fontWeight: "700", color: colors.text },
    toastMesaj: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  });
}

function NotificationProviderInner({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [icBildirimKutusu, setIcBildirimKutusuState] = useState(true);
  const [toast, setToast] = useState<Bildirim | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createToastStyles(colors), [colors]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(IC_BILDIRIM_STORAGE);
        if (!alive) return;
        if (raw === "0") setIcBildirimKutusuState(false);
      } catch {
        /* */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setIcBildirimKutusu = useCallback((acik: boolean) => {
    setIcBildirimKutusuState(acik);
    void AsyncStorage.setItem(IC_BILDIRIM_STORAGE, acik ? "1" : "0");
  }, []);

  const toastGoster = useCallback(
    (b: Bildirim) => {
      setToast(b);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setToast(null));
    },
    [toastAnim]
  );

  const bildirimGonder = useCallback(
    (tip: BildirimTipi, baslik: string, mesaj: string) => {
      const yeni: Bildirim = {
        id: `n-${++_sayac}-${Date.now()}`,
        tip,
        baslik,
        mesaj,
        zaman: new Date(),
      };
      setBildirimler((s) => [yeni, ...s].slice(0, 50));
      if (icBildirimKutusu) toastGoster(yeni);
    },
    [toastGoster, icBildirimKutusu]
  );

  const temizle = useCallback(() => setBildirimler([]), []);

  const value = useMemo(
    () => ({
      bildirimler,
      bildirimGonder,
      temizle,
      icBildirimKutusu,
      setIcBildirimKutusu,
    }),
    [bildirimler, bildirimGonder, temizle, icBildirimKutusu, setIcBildirimKutusu]
  );

  const tipIkon: Record<BildirimTipi, keyof typeof Ionicons.glyphMap> = {
    vardiya: "calendar",
    izin: "bed-outline",
    bilgi: "information-circle",
  };
  const tipRenk: Record<BildirimTipi, string> = {
    vardiya: colors.primary,
    izin: colors.afternoon,
    bilgi: colors.morning,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-40, 0],
                  }),
                },
              ],
            },
          ]}
          /** Bilgi amaçlı; dokunuşları almasın — üstteki Kaydet / sekmelerle çakışmasın */
          pointerEvents="none"
        >
          <View style={styles.toastInner}>
            <View style={[styles.toastIcon, { backgroundColor: tipRenk[toast.tip] + "33" }]}>
              <Ionicons name={tipIkon[toast.tip]} size={18} color={tipRenk[toast.tip]} />
            </View>
            <View style={styles.toastContent}>
              <Text style={styles.toastBaslik} numberOfLines={1}>
                {toast.baslik}
              </Text>
              <Text style={styles.toastMesaj} numberOfLines={2}>
                {toast.mesaj}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  return <NotificationProviderInner>{children}</NotificationProviderInner>;
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification NotificationProvider içinde olmalı");
  return ctx;
}
