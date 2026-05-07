/**
 * Root Layout — Ponto de entrada do app com expo-router
 * Provê AuthProvider e configura navegação global.
 */
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

// Esconder barra de navegação do Android — aparece ao arrastar de baixo
if (Platform.OS === 'android') {
  NavigationBar.setVisibilityAsync('hidden');
  NavigationBar.setBehaviorAsync('overlay-swipe');
  NavigationBar.setBackgroundColorAsync('#00000000');
}

function RootNavigationGuard() {
  const { user, loading, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Não logado → redireciona para login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Logado mas está na tela de auth → redireciona baseado no role
      if (role === 'motorista') {
        router.replace('/(app)/dashboard');
      } else if (role === 'empresa') {
        router.replace('/(app)/dashboard');
      } else {
        // Sem cadastro ainda → vai para seleção de perfil
        router.replace('/(auth)/selecionar-perfil');
      }
    }
  }, [user, loading, role, segments]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

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
