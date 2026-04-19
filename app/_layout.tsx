import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthOAuthCallback } from '@/hooks/use-auth-oauth-callback';
import { AuthProvider, useAuth } from '../context/auth-context';
import { IntegrationsProvider } from '@/components/integrations/integrations-states';
import { tokens } from '@/styles/tokens';

// This handles the "messy" layout at the root level
import "../global.css"; 

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootLayoutNav() {
  useAuthOAuthCallback();

  useEffect(() => {
    if (Platform.OS === 'web') {
      WebBrowser.maybeCompleteAuthSession();
    }
  }, []);

  const { user, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, initialized, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Artie Settings',
            headerStyle: { backgroundColor: tokens.color.brandTealDark },
            headerTintColor: tokens.color.white,
            headerTitleStyle: { color: tokens.color.white, fontWeight: '600' },
            headerShadowVisible: false,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <IntegrationsProvider>
          <RootLayoutNav />
        </IntegrationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}