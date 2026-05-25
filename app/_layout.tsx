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
import { SubscriptionProvider, useSubscription } from '@/hooks/useSubscription';

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
  const { needsUpgrade, loading: subLoading } = useSubscription();
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
    // Esperar todos: auth carregou, onboarding checado, e assinatura carregada
    if (loading || onboardingSeen === null || subLoading) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const isOnboarding = segs[1] === 'onboarding';
    const isPublicAuthRoute = segs[1] === 'planos' || segs[1] === 'checkout' || segs[1] === 'verificar-email';
    const inAppGroup = segs[0] === '(app)';
    const isProtectedAppRoute = inAppGroup || (!inAuthGroup && !isOnboarding);

    // ── REGRA 1: Primeiro acesso → Onboarding (independente de login!)
    if (!onboardingSeen && !isOnboarding) {
      router.replace('/(auth)/onboarding');
      return;
    }

    // ── Se está no onboarding e já viu, sair dele
    if (onboardingSeen && isOnboarding) {
      if (user) {
        if (role === 'motorista' || role === 'empresa') {
          if (needsUpgrade) {
            router.replace('/(auth)/planos');
          } else {
            router.replace('/(app)/dashboard');
          }
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
          if (needsUpgrade) {
            router.replace('/(auth)/planos');
          } else {
            router.replace('/(app)/dashboard');
          }
        } else if (role === null && !loading) {
          router.replace('/(auth)/selecionar-perfil');
        }
      } else if (user && isProtectedAppRoute && needsUpgrade) {
        // Redireciona para planos se a assinatura expirou e ele tentar navegar no app
        router.replace('/(auth)/planos');
      }
    }
  }, [user, loading, role, segments, onboardingSeen, needsUpgrade, subLoading]);

  // Reforça ocultação da barra do Android ao mudar de rota
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, [segments]);

  useEffect(() => {
    if (!loading && onboardingSeen !== null && !subLoading) {
      SplashScreen.hideAsync();
    }
  }, [loading, onboardingSeen, subLoading]);

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

function SubscriptionWrapper({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  return (
    <SubscriptionProvider userId={user?.id ?? null} userGroup={role}>
      {children}
    </SubscriptionProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionWrapper>
        <RootNavigationGuard />
      </SubscriptionWrapper>
    </AuthProvider>
  );
}
