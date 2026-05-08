/**
 * Layout autenticado — Tabs com Swipe Fluido estilo Instagram
 * Integração de PagerView para animação de deslizamento entre abas.
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, useRouter, usePathname } from 'expo-router';
import PagerView from 'react-native-pager-view';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/config/theme';
import { useAuth } from '@/hooks/useAuth';
import { NotificacoesService } from '@/services';

// Importando as telas diretamente para o PagerView
import DashboardScreen from './dashboard';
import CargasScreen from './cargas';
import NotificacoesScreen from './notificacoes';
import PerfilScreen from './perfil';

const ROUTES = ['dashboard', 'cargas', 'notificacoes', 'perfil'];

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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Carregar contagem de notificações
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

  // Sincronizar activeIndex com a rota atual quando ela muda externamente
  useEffect(() => {
    const routeName = pathname.split('/').pop();
    const idx = ROUTES.indexOf(routeName || '');
    if (idx !== -1 && idx !== activeIndex) {
      setActiveIndex(idx);
      pagerRef.current?.setPage(idx);
    }
  }, [pathname]);

  const onPageSelected = (e: any) => {
    const newIdx = e.nativeEvent.position;
    if (newIdx !== activeIndex) {
      setActiveIndex(newIdx);
      // Atualiza a URL para que o botão da Tab reflita a seleção
      router.replace(`/(app)/${ROUTES[newIdx]}`);
    }
  };

  const handleTabPress = (index: number) => {
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  };

  const cargasTitle = role === 'empresa' ? 'Fretes' : 'Cargas';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* O PagerView fornece a animação de swipe suave estilo Instagram */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={onPageSelected}
        useNext={false}
      >
        <View key="1" style={styles.page}><DashboardScreen /></View>
        <View key="2" style={styles.page}><CargasScreen /></View>
        <View key="3" style={styles.page}><NotificacoesScreen /></View>
        <View key="4" style={styles.page}><PerfilScreen /></View>
      </PagerView>

      {/* A TabBar continua sendo gerenciada pelo expo-router Tabs para manter os ícones e navegação nativa */}
      <View style={styles.tabBarWrapper}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textTertiary,
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Início',
              tabBarIcon: ({ color, size }) => <Ionicons name={activeIndex === 0 ? "home" : "home-outline"} size={size} color={color} />,
            }}
            listeners={{ tabPress: (e) => { e.preventDefault(); handleTabPress(0); } }}
          />
          <Tabs.Screen
            name="cargas"
            options={{
              title: cargasTitle,
              tabBarIcon: ({ color, size }) => <Ionicons name={activeIndex === 1 ? "cube" : "cube-outline"} size={size} color={color} />,
            }}
            listeners={{ tabPress: (e) => { e.preventDefault(); handleTabPress(1); } }}
          />
          <Tabs.Screen
            name="notificacoes"
            options={{
              title: 'Avisos',
              tabBarIcon: ({ color, size }) => (
                <View>
                  <Ionicons name={activeIndex === 2 ? "notifications" : "notifications-outline"} size={size} color={color} />
                  <NotifBadge count={unreadCount} />
                </View>
              ),
            }}
            listeners={{ tabPress: (e) => { e.preventDefault(); handleTabPress(2); setUnreadCount(0); } }}
          />
          <Tabs.Screen
            name="perfil"
            options={{
              title: 'Perfil',
              tabBarIcon: ({ color, size }) => <Ionicons name={activeIndex === 3 ? "person" : "person-outline"} size={size} color={color} />,
            }}
            listeners={{ tabPress: (e) => { e.preventDefault(); handleTabPress(3); } }}
          />
          <Tabs.Screen name="novo-frete" options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBarWrapper: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 0,
    elevation: 0,
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: COLORS.error, borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
});
