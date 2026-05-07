/**
 * Tela de Notificações — sem subscription duplicada (o _layout já faz)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { NotificacoesService, Notificacao } from '@/services';
import { LoadingSpinner } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function NotificacoesScreen() {
  const { user } = useAuth();
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

  return (
    <View style={styles.container}>
      {temNaoLidas && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarcarTodas} activeOpacity={0.7}>
          <Ionicons name="checkmark-done-outline" size={18} color={COLORS.primary} />
          <Text style={styles.markAllText}>Marcar todas como lidas</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notificacoes}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: SPACING.md, paddingTop: temNaoLidas ? 0 : SPACING.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={32} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
            <Text style={styles.emptyText}>Você será notificado sobre atualizações de cargas e do sistema.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.lida && styles.cardUnread]}
            onPress={() => !item.lida && handleMarcarLida(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Ionicons
                name={item.lida ? 'checkmark-circle-outline' : 'ellipse'}
                size={16}
                color={item.lida ? COLORS.textTertiary : COLORS.primary}
              />
              <Text style={[styles.title, !item.lida && styles.titleUnread]}>{item.titulo}</Text>
            </View>
            <Text style={styles.message}>{item.mensagem}</Text>
            <Text style={styles.time}>
              {new Date(item.created_at).toLocaleDateString('pt-BR')} às{' '}
              {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.sm, marginHorizontal: SPACING.md, marginTop: SPACING.sm,
    backgroundColor: COLORS.primaryFaded, borderRadius: BORDER_RADIUS.sm,
  },
  markAllText: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: '600', marginLeft: 6 },
  empty: { justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl, marginTop: 40 },
  emptyIconContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, ...SHADOWS.sm },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: SPACING.sm },
  title: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.textPrimary, flex: 1 },
  titleUnread: { fontWeight: '700' },
  message: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20, marginLeft: 26 },
  time: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: 8, marginLeft: 26 },
});
