import "react-native-gesture-handler";
import { LogBox, Platform, StyleSheet } from "react-native";

if (__DEV__) {
  LogBox.ignoreLogs([
    "Invalid Refresh Token",
    "Refresh Token Not Found",
    "AuthApiError: Invalid Refresh Token",
  ]);
}
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { SohbetOkunmamisProvider } from "./src/context/SohbetOkunmamisContext";
import { ScheduleProvider } from "./src/context/ScheduleContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { DelightProvider } from "./src/context/DelightContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { UpdateProvider } from "./src/context/UpdateContext";
import { AppNavigator } from "./src/navigation/AppNavigator";

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function AppInner() {
  return (
    <>
      <AppNavigator />
      <ThemedStatusBar />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root}>
        <DelightProvider>
          <ThemeProvider>
            <UpdateProvider>
              <AuthProvider>
                <SohbetOkunmamisProvider>
                  <ScheduleProvider>
                    <NotificationProvider>
                      <AppInner />
                    </NotificationProvider>
                  </ScheduleProvider>
                </SohbetOkunmamisProvider>
              </AuthProvider>
            </UpdateProvider>
          </ThemeProvider>
        </DelightProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === "web" ? { backgroundColor: "#0f1419" } : null),
  },
});
