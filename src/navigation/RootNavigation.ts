import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function navigateGuvenli(name: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never);
  }
}

/** E-posta sıfırlama deep link: oturum geldikten sonra ana stack hazır olana kadar dener */
export function tryNavigateSifreBelirle(attempt = 0) {
  if (navigationRef.isReady()) {
    navigationRef.navigate("SifreBelirle" as never);
    return;
  }
  if (attempt < 30) {
    setTimeout(() => tryNavigateSifreBelirle(attempt + 1), 200);
  }
}
