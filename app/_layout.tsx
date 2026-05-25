import { Stack, useRouter, SplashScreen } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { UserProvider } from '../context/UserContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext'; // <--- IMPORTAR
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/welcome');
      }
    }
  }, [session, loading, router]);

  if (loading) {
    return null;
  }

  return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="tutorial/tutorial1" />
        <Stack.Screen name="tutorial/tutorial2" />
        <Stack.Screen name="tutorial/tutorial3" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="configuracion" />
        <Stack.Screen name="mapa" />
      </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserProvider>
        {/* Envolver con NotificationProvider dentro de UserProvider (necesita userId) */}
        <NotificationProvider>
            <PaperProvider theme={theme}>
            <RootLayoutNav />
            <StatusBar style="auto" />
            </PaperProvider>
        </NotificationProvider>
      </UserProvider>
    </AuthProvider>
  );
}