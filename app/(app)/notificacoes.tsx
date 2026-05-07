/**
 * Tela de Notificações — visual limpo
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { NotificacoesService } from '@/services';
import { LoadingSpinner } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function NotificacoesScreen() {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await NotificacoesService.carregar(user.id);
    setNotificacoes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleMarcarLida = async (id: string) => {
    await NotificacoesService.marcarComoLida(id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  if (loading) return <LoadingSpinner message="Carregando notificações..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={notificacoes}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: SPACING.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>N</Text>
            </View>
            <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
            <Text style={styles.emptyText}>Você será notificado sobre atualizações de cargas e sistema.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.lida && styles.cardUnread]}
            onPress={() => handleMarcarLida(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.dot, !item.lida && styles.dotActive]} />
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
  empty: { justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl, marginTop: 40 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyIconText: { fontSize: 24, fontWeight: '800', color: COLORS.textTertiary },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },

  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, ...SHADOWS.sm },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border, marginRight: SPACING.sm },
  dotActive: { backgroundColor: COLORS.primary },
  title: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.textPrimary },
  titleUnread: { fontWeight: '700' },
  message: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  time: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: 8 },
});
