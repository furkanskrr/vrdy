import type { NavigatorScreenParams } from "@react-navigation/native";
import type { ArchiveStackParamList } from "../screens/ArchiveMonthScreen";

export type AuthStackParamList = {
  Giris: undefined;
  Kayit: undefined;
  SifremiUnuttum: undefined;
};

export type MainTabParamList = {
  Ana: undefined;
  Vardiya: undefined;
  Puantaj: undefined;
  Sohbet: undefined;
  Ayarlar: undefined;
};

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Arsiv: NavigatorScreenParams<ArchiveStackParamList> | undefined;
  Takas: undefined;
  HesapBilgileri: undefined;
  SifreBelirle: undefined;
  GizlilikPolitikasi: undefined;
  KullanimRehberi: undefined;
  DelightHub: undefined;
  TemizlikTakvimi: undefined;
};

/** E-posta OTP / deep link ile gelen şifre sıfırlama yığını */
export type RecoveryStackParamList = {
  SifreBelirle: undefined;
};
