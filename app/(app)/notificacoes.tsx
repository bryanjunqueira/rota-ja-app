import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { NotificacoesService, Notificacao } from '@/services';
import { LoadingSpinner } from '@/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function NotificacoesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await NotificacoesService.carregar(user.id);
    setNotificacoes(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleMarcarLida = async (id: string) => {
    await NotificacoesService.marcarComoLida(id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const handleMarcarTodas = async () => {
    if (!user) return;
    await NotificacoesService.marcarTodasComoLidas(user.id);
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  if (loading) return <LoadingSpinner message="Carregando notificações..." />;

  const temNaoLidas = notificacoes.some(n => !n.lida);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.screenTitle}>Notificações</Text>
      {temNaoLidas && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarcarTodas} activeOpacity={0.7}>
          <Ionicons name="checkmark-done" size={18} color={COLORS.primary} />
          <Text style={styles.markAllText}>Marcar lidas</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <FlatList
        data={notificacoes}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={40} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Tudo tranquilo por aqui</Text>
            <Text style={styles.emptyText}>Você não tem novas notificações no momento. Nós te avisaremos quando algo importante acontecer.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isDevolucao = item.titulo.toLowerCase().includes('devolvi') || item.titulo.toLowerCase().includes('cancelad');
          const isAceite = item.titulo.toLowerCase().includes('aceit');
          const iconName = isDevolucao ? 'alert-circle' : isAceite ? 'checkmark-circle' : 'notifications';
          const iconColor = isDevolucao ? COLORS.error : isAceite ? COLORS.success : COLORS.primary;
          const bgIconColor = isDevolucao ? COLORS.errorLight : isAceite ? COLORS.successLight : COLORS.primaryFaded;

          return (
            <TouchableOpacity
              style={[styles.card, item.lida ? styles.cardRead : styles.cardUnread]}
              onPress={() => !item.lida && handleMarcarLida(item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, { backgroundColor: item.lida ? COLORS.surfaceVariant : bgIconColor }]}>
                <Ionicons name={iconName} size={22} color={item.lida ? COLORS.textTertiary : iconColor} />
              </View>
              
              <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !item.lida && styles.titleUnread]} numberOfLines={2}>
                    {item.titulo}
                  </Text>
                  {!item.lida && <View style={styles.unreadDot} />}
                </View>
                
                <Text style={[styles.message, item.lida && styles.messageRead]}>{item.mensagem}</Text>
                
                <View style={styles.footerRow}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
                  <Text style={styles.time}>
                    {new Date(item.created_at).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  markAllBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 8, 
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  markAllText: { 
    color: COLORS.textPrimary, 
    fontSize: FONT_SIZES.sm, 
    fontWeight: '600', 
    marginLeft: 6 
  },
  empty: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: SPACING.xl, 
    marginTop: 60 
  },
  emptyIconContainer: {
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: COLORS.surface,
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm
  },
  emptyTitle: { 
    fontSize: FONT_SIZES.lg, 
    fontWeight: '700', 
    color: COLORS.textPrimary, 
    marginBottom: SPACING.sm 
  },
  emptyText: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.textSecondary, 
    textAlign: 'center', 
    lineHeight: 22 
  },
  card: { 
    flexDirection: 'row',
    backgroundColor: COLORS.surface, 
    borderRadius: BORDER_RADIUS.lg, 
    padding: SPACING.md, 
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardUnread: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primaryFaded,
    borderWidth: 1,
  },
  cardRead: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center'
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: COLORS.textPrimary, 
    flex: 1,
    marginRight: 8,
  },
  titleUnread: { 
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  message: { 
    fontSize: 14, 
    color: COLORS.textSecondary, 
    lineHeight: 20, 
    marginBottom: 8 
  },
  messageRead: {
    color: COLORS.textTertiary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  time: { 
    fontSize: 12, 
    color: COLORS.textTertiary, 
    fontWeight: '500'
  },
});
