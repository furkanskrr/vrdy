import { useEffect, useState, type ComponentType } from "react";
import { Platform } from "react-native";
import { AppEntrySplash } from "./AppEntrySplash";

/**
 * Tam uygulama ağacı yüklenmeden önce güvenli OTA indirir.
 * reloadAsync kullanılmaz — bir sonraki soğuk açılışta düzeltilmiş paket devreye girer.
 */
export function AppBootstrap() {
  const [hazir, setHazir] = useState(Platform.OS === "web");

  useEffect(() => {
    if (Platform.OS === "web") return;

    let iptal = false;
    void (async () => {
      try {
        const Updates = await import("expo-updates");
        if (Updates.isEnabled) {
          const sonuc = await Updates.checkForUpdateAsync();
          if (sonuc.isAvailable) {
            await Updates.fetchUpdateAsync();
          }
        }
      } catch {
        /* ağ / OTA kapalı */
      } finally {
        if (!iptal) setHazir(true);
      }
    })();

    const zamanAsimi = setTimeout(() => {
      if (!iptal) setHazir(true);
    }, 2500);

    return () => {
      iptal = true;
      clearTimeout(zamanAsimi);
    };
  }, []);

  if (!hazir) {
    return <AppEntrySplash />;
  }

  const App = require("../../App").default as ComponentType;
  return <App />;
}
