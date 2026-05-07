/**
 * Layout do grupo autenticado — Tab navigation com Ionicons
 * Badge de notificações não-lidas na aba Avisos.
 * novo-frete oculto (acessado via push).
 */
import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES } from '@/config/theme';
import { useAuth } from '@/hooks/useAuth';
import { NotificacoesService } from '@/services';

function NotifBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadCount = async () => {
      const { data } = await NotificacoesService.carregar(user.id, 50);
      setUnreadCount(data.filter(n => !n.lida).length);
    };
    loadCount();

    // Realtime: incrementar quando chega notificação nova
    const unsub = NotificacoesService.subscribeToNew(() => {
      setUnreadCount(prev => prev + 1);
    });

    return unsub;
  }, [user]);

  return (
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
          title: 'Cargas',
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
      {/* Oculto do tab bar */}
      <Tabs.Screen
        name="novo-frete"
        options={{
          title: 'Novo Frete',
          headerTitle: 'Publicar Frete',
          href: null,
        }}
      />
    </Tabs>
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
