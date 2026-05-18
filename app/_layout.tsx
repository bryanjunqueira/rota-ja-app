/**
 * Root Layout — Ponto de entrada do app com expo-router
 *
 * Fluxo de primeiro acesso:
 *  1. Splash (nativa)
 *  2. Lê AsyncStorage → já viu onboarding?
 *     NÃO → Onboarding (apenas 1 vez, independente de login)
 *     SIM → Fluxo normal (landing ou dashboard)
 *  3. Depois do onboarding, nunca mais aparece (salvo reinstalação)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Platform, LogBox } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// Ignore Supabase refresh token errors that trigger Expo toasts
LogBox.ignoreLogs([
  'AuthApiError: Invalid Refresh Token',
  'AuthApiError: Refresh Token Not Found',
]);

const ONBOARDING_KEY = '@rotaja_onboarding_seen';

SplashScreen.preventAutoHideAsync();

// Esconder barra de navegação do Android — aparece ao arrastar de baixo
if (Platform.OS === 'android') {
  NavigationBar.setVisibilityAsync('hidden');
  NavigationBar.setBehaviorAsync('overlay-swipe');
}

function RootNavigationGuard() {
  const { user, loading, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // null = ainda carregando, true/false = resultado
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  // Lê o estado do onboarding no mount
  useEffect(() => {
    (async () => {
      try {
        // CASO QUEIRA RESETAR E FORÇAR EXIBIÇÃO PARA TESTAR, DESCOMENTE A LINHA ABAIXO:
        // await AsyncStorage.removeItem(ONBOARDING_KEY);
        
        const val = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingSeen(val === 'true');
      } catch {
        setOnboardingSeen(false);
      }
    })();
  }, []);

  // Re-lê o AsyncStorage toda vez que o segmento muda (ex: saindo do onboarding)
  // Isso garante que o estado atualize quando o usuário completa/pula o onboarding
  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (val === 'true' && !onboardingSeen) {
          setOnboardingSeen(true);
        }
      } catch {}
    })();
  }, [segments]);

  useEffect(() => {
    // Esperar ambos: auth carregou E onboarding checado
    if (loading || onboardingSeen === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isOnboarding = segments[1] === 'onboarding';
    const isPublicAuthRoute = segments[1] === 'planos' || segments[1] === 'checkout';

    // ── REGRA 1: Primeiro acesso → Onboarding (independente de login!)
    if (!onboardingSeen && !isOnboarding) {
      router.replace('/(auth)/onboarding');
      return;
    }

    // ── Se está no onboarding e já viu, sair dele
    if (onboardingSeen && isOnboarding) {
      if (user) {
        if (role === 'motorista' || role === 'empresa') {
          router.replace('/(app)/dashboard');
        } else {
          router.replace('/(auth)/selecionar-perfil');
        }
      } else {
        router.replace('/(auth)/landing');
      }
      return;
    }

    // ── REGRA 2: Fluxo normal de auth (só age quando onboarding já foi visto)
    if (onboardingSeen) {
      if (!user && !inAuthGroup) {
        router.replace('/(auth)/landing');
      } else if (user && inAuthGroup && !isPublicAuthRoute) {
        if (role === 'motorista' || role === 'empresa') {
          router.replace('/(app)/dashboard');
        } else if (role === null && !loading) {
          router.replace('/(auth)/selecionar-perfil');
        }
      }
    }
  }, [user, loading, role, segments, onboardingSeen]);

  // Reforça ocultação da barra do Android ao mudar de rota
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, [segments]);

  useEffect(() => {
    if (!loading && onboardingSeen !== null) {
      SplashScreen.hideAsync();
    }
  }, [loading, onboardingSeen]);

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigationGuard />
    </AuthProvider>
  );
}
