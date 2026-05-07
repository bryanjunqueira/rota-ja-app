/**
 * Layout autenticado — Tabs com swipe entre telas
 * Badge de notificações, título dinâmico por role.
 * novo-frete oculto (acessado via push).
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/config/theme';
import { useAuth } from '@/hooks/useAuth';
import { NotificacoesService } from '@/services';

const TAB_ROUTES = ['/(app)/dashboard', '/(app)/cargas', '/(app)/notificacoes', '/(app)/perfil'] as const;

function NotifBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export default function AppLayout() {
  const { user, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Notificações: carregar contagem + realtime
  useEffect(() => {
    if (!user) return;

    const loadCount = async () => {
      try {
        const { data } = await NotificacoesService.carregar(user.id, 50);
        setUnreadCount(data.filter(n => !n.lida).length);
      } catch { /* silencioso */ }
    };
    loadCount();

    const unsub = NotificacoesService.subscribeToNew(user.id, () => {
      setUnreadCount(prev => prev + 1);
    });

    return unsub;
  }, [user]);

  // Swipe entre tabs
  const currentIndex = useRef(0);

  // Atualiza index baseado no pathname
  useEffect(() => {
    const idx = TAB_ROUTES.findIndex(r => pathname.includes(r.split('/').pop()!));
    if (idx >= 0) currentIndex.current = idx;
  }, [pathname]);

  const navigateBySwipe = useCallback((direction: 'left' | 'right') => {
    const delta = direction === 'left' ? 1 : -1;
    const nextIdx = currentIndex.current + delta;
    if (nextIdx < 0 || nextIdx >= TAB_ROUTES.length) return;
    currentIndex.current = nextIdx;
    router.replace(TAB_ROUTES[nextIdx]);
  }, [router]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => {
        // Só ativar swipe se movimento horizontal forte e vertical fraco
        return Math.abs(gs.dx) > 30 && Math.abs(gs.dy) < 30;
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60) navigateBySwipe('right');
        else if (gs.dx < -60) navigateBySwipe('left');
      },
    })
  ).current;

  // Titulo dinâmico: "Cargas" para motorista, "Fretes" para empresa
  const cargasTitle = role === 'empresa' ? 'Fretes' : 'Cargas';

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerShadowVisible: true,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textTertiary,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.borderLight,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Início',
            headerTitle: 'ROTA JÁ',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cargas"
          options={{
            title: cargasTitle,
            headerTitle: cargasTitle,
            tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="notificacoes"
          options={{
            title: 'Avisos',
            tabBarIcon: ({ color, size }) => (
              <View>
                <Ionicons name="notifications-outline" size={size} color={color} />
                <NotifBadge count={unreadCount} />
              </View>
            ),
          }}
          listeners={{ tabPress: () => setUnreadCount(0) }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="novo-frete"
          options={{
            title: 'Novo Frete',
            headerTitle: 'Publicar Frete',
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: COLORS.error, borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
});
