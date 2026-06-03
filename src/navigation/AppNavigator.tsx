import { useMemo } from "react";
import { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useSohbetOkunmamis } from "../context/SohbetOkunmamisContext";
import { useTheme } from "../context/ThemeContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { sifirlamaBaglantisiniAyikla } from "../lib/passwordResetLink";
import { navigationRef, tryNavigateSifreBelirle } from "./RootNavigation";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { HesapBilgileriScreen } from "../screens/HesapBilgileriScreen";
import { SifreBelirleScreen } from "../screens/SifreBelirleScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { GroupSetupScreen } from "../screens/GroupSetupScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ShiftWeekScreen } from "../screens/ShiftWeekScreen";
import { PuantajScreen } from "../screens/PuantajScreen";
import { ArchiveScreen } from "../screens/ArchiveScreen";
import { ArchiveMonthScreen, type ArchiveStackParamList } from "../screens/ArchiveMonthScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { DelightHubScreen } from "../screens/DelightHubScreen";
import { SOHBET_AKTIF } from "../constants/features";
import { GroupChatScreen } from "../screens/GroupChatScreen";
import { SohbetYakindaScreen } from "../screens/SohbetYakindaScreen";
import { GizlilikPolitikasiScreen } from "../screens/GizlilikPolitikasiScreen";
import { ShiftSwapScreen } from "../screens/ShiftSwapScreen";
import { TemizlikTakvimiScreen } from "../screens/TemizlikTakvimiScreen";
import type { AuthStackParamList, MainStackParamList, RecoveryStackParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RecoveryStack = createNativeStackNavigator<RecoveryStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator();
const ArchiveStack = createNativeStackNavigator<ArchiveStackParamList>();

function DeepLinkSifreHandler() {
  const { user, session, sifreKurtarmaBekliyor } = useAuth();
  const kullaniciKimligi = session?.user?.id;
  const [sifreLinkBekliyor, setSifreLinkBekliyor] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    async function handle(raw: string) {
      if (!raw) return;
      const parsed = sifirlamaBaglantisiniAyikla(raw);
      if (!parsed) return;

      if (parsed.kind === "pkce") {
        const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (!error) setSifreLinkBekliyor(true);
        else if (__DEV__) console.warn("[auth] exchangeCodeForSession:", error.message);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      });
      if (!error) setSifreLinkBekliyor(true);
      else if (__DEV__) console.warn("[auth] setSession (şifre linki):", error.message);
    }
    void Linking.getInitialURL().then((u) => {
      if (u) void handle(u);
    });
    const sub = Linking.addEventListener("url", (e) => void handle(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!user || !kullaniciKimligi || !sifreLinkBekliyor) return;
    setSifreLinkBekliyor(false);
    if (!sifreKurtarmaBekliyor) tryNavigateSifreBelirle();
  }, [user, kullaniciKimligi, sifreLinkBekliyor, sifreKurtarmaBekliyor]);

  return null;
}

function RecoveryStackNav() {
  const { colors } = useTheme();
  return (
    <RecoveryStack.Navigator
      initialRouteName="SifreBelirle"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerShown: false,
      }}
    >
      <RecoveryStack.Screen name="SifreBelirle" component={SifreBelirleScreen} />
    </RecoveryStack.Navigator>
  );
}

function ArchiveStackNav() {
  const { colors } = useTheme();
  return (
    <ArchiveStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <ArchiveStack.Screen name="ArsivListe" component={ArchiveScreen} options={{ title: "Arşiv" }} />
      <ArchiveStack.Screen name="ArsivAy" component={ArchiveMonthScreen} options={{ title: "Rapor" }} />
    </ArchiveStack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  const { okunmamisSayisi } = useSohbetOkunmamis();
  const sohbetRozet =
    SOHBET_AKTIF && okunmamisSayisi > 0
      ? okunmamisSayisi > 99
        ? "99+"
        : okunmamisSayisi
      : undefined;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Ana" component={HomeScreen} options={{ tabBarLabel: "Ana", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Vardiya" component={ShiftWeekScreen} options={{ tabBarLabel: "Vardiya", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tab.Screen name="Puantaj" component={PuantajScreen} options={{ tabBarLabel: "Puantaj", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tab.Screen
        name="Sohbet"
        component={SOHBET_AKTIF ? GroupChatScreen : SohbetYakindaScreen}
        options={{
          tabBarLabel: "Sohbet",
          tabBarBadge: sohbetRozet,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: "#fff",
            fontSize: 11,
            fontWeight: "700",
          },
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen name="Ayarlar" component={SettingsScreen} options={{ tabBarLabel: "Ayarlar", tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

function MainStackNav() {
  const { colors } = useTheme();
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <MainStack.Screen name="Arsiv" component={ArchiveStackNav} options={{ headerShown: false }} />
      <MainStack.Screen
        name="Takas"
        component={ShiftSwapScreen}
        options={{ title: "Vardiya takası", headerBackTitle: "Geri" }}
      />
      <MainStack.Screen
        name="HesapBilgileri"
        component={HesapBilgileriScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="SifreBelirle"
        component={SifreBelirleScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="GizlilikPolitikasi"
        component={GizlilikPolitikasiScreen}
        options={{ title: "Gizlilik politikası", headerBackTitle: "Geri" }}
      />
      <MainStack.Screen
        name="DelightHub"
        component={DelightHubScreen}
        options={{ title: "Deneyim stüdyosu", headerBackTitle: "Geri" }}
      />
      <MainStack.Screen
        name="TemizlikTakvimi"
        component={TemizlikTakvimiScreen}
        options={{ title: "Temizlik takvimi", headerBackTitle: "Geri" }}
      />
    </MainStack.Navigator>
  );
}

function SetupFlow() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const needsOnboarding = !user?.onboardingComplete;
  const needsGroup = !user?.groupId;

  /** Koşullu tek ekranlı Stack yerine doğrudan render: gruba katılınca user.groupId güncellenince ana uygulama her zaman gösterilir. */
  if (needsOnboarding) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <OnboardingScreen />
      </View>
    );
  }
  if (needsGroup) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <GroupSetupScreen />
      </View>
    );
  }
  return <MainStackNav />;
}

export function AppNavigator() {
  const { user, sifreKurtarmaBekliyor } = useAuth();
  const { colors } = useTheme();

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    }),
    [colors]
  );

  const authScreenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.bg },
    }),
    [colors]
  );

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <DeepLinkSifreHandler />
      {sifreKurtarmaBekliyor ? (
        <RecoveryStackNav />
      ) : !user ? (
        <AuthStack.Navigator screenOptions={authScreenOptions}>
          <AuthStack.Screen name="Giris" component={LoginScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Kayit" component={RegisterScreen} options={{ title: "Kayıt" }} />
          <AuthStack.Screen
            name="SifremiUnuttum"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
        </AuthStack.Navigator>
      ) : (
        <SetupFlow />
      )}
    </NavigationContainer>
  );
}
