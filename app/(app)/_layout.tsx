/**
 * Layout autenticado — Tabs com Swipe Fluido estilo Instagram
 * Integração de PagerView para animação de deslizamento entre abas.
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { PagerView } from '@/components/PagerViewWrapper';
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
  const { user, loading, role, motorista, empresa, logout, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('inset-touch');
    }
  }, []);

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
      router.navigate(`/(app)/${ROUTES[newIdx]}`);
    }
  };

  const handleTabPress = (index: number) => {
    if (index !== activeIndex) {
      setActiveIndex(index);
      pagerRef.current?.setPage(index);
      router.navigate(`/(app)/${ROUTES[index]}`);
    }
  };

  if (!user || loading || !role) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const status = role === 'motorista' ? motorista?.status : role === 'empresa' ? empresa?.status : 'pendente';
  const isApproved = status === 'aprovado';

  // Se a conta não estiver aprovada (pendente ou reprovada), bloqueia o app inteiro
  if (!isApproved) {
    const isReproved = status === 'reprovado' || status === 'rejeitado' || status === 'rejeitada';
    
    return (
      <View style={[blockedStyles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="dark" translucent />
        
        <View style={blockedStyles.content}>
          <View style={blockedStyles.illustrationContainer}>
            <View style={[blockedStyles.iconBg, isReproved ? blockedStyles.iconBgError : blockedStyles.iconBgWarning]}>
              <Ionicons 
                name={isReproved ? "close-circle" : "hourglass"} 
                size={48} 
                color={isReproved ? COLORS.error : COLORS.warning} 
              />
            </View>
          </View>

          <Text style={blockedStyles.title}>
            {isReproved ? 'Acesso Indisponível' : 'Conta em Análise'}
          </Text>
          
          <Text style={blockedStyles.description}>
            {isReproved 
              ? 'Infelizmente seu cadastro não atende aos requisitos da plataforma ou foi reprovado. Entre em contato com nosso suporte para mais detalhes.'
              : 'Seus dados foram enviados e estão sendo revisados pela nossa equipe administrativa. Você terá acesso total ao aplicativo assim que seu cadastro for aprovado.'}
          </Text>

          <View style={blockedStyles.statusBadge}>
            <Text style={blockedStyles.statusText}>
              Status atual: <Text style={blockedStyles.statusTextBold}>{isReproved ? 'Reprovado' : 'Aguardando aprovação'}</Text>
            </Text>
          </View>

          <View style={blockedStyles.buttonContainer}>
            <TouchableOpacity 
              style={blockedStyles.refreshButton}
              onPress={async () => {
                setRefreshing(true);
                try {
                  await refreshProfile();
                } catch {}
                setRefreshing(false);
              }}
              disabled={refreshing}
              activeOpacity={0.8}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color={COLORS.white} />
                  <Text style={blockedStyles.refreshButtonText}>Atualizar Status</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={blockedStyles.logoutButton}
              onPress={async () => {
                await logout();
                router.replace('/(auth)/landing');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
              <Text style={blockedStyles.logoutButtonText}>Sair da Conta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const cargasTitle = role === 'empresa' ? 'Fretes' : 'Cargas';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent />
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

const blockedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  illustrationContainer: {
    marginBottom: 24,
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBgWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  iconBgError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  statusBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 32,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusTextBold: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  logoutButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

