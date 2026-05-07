/**
 * Tela de Cargas — visual profissional
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { FretesService } from '@/services';
import { LoadingSpinner, Badge } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function CargasScreen() {
  const { role, motorista } = useAuth();
  const [cargas, setCargas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCargas = async () => {
    if (role === 'motorista' && motorista) {
      const { data } = await FretesService.buscarCargasDisponiveis(motorista.tipo_veiculo);
      setCargas(data);
    }
    setLoading(false);
  };

  useEffect(() => { loadCargas(); }, [role, motorista]);
  const onRefresh = async () => { setRefreshing(true); await loadCargas(); setRefreshing(false); };

  const handleAceitar = async (freteId: string) => {
    if (!motorista) return;
    Alert.alert('Aceitar Carga', 'Deseja aceitar esta carga?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aceitar', onPress: async () => {
        const result = await FretesService.aceitarCarga(freteId, motorista.id);
        if (result.success) { Alert.alert('Sucesso', 'Carga aceita com sucesso!'); loadCargas(); }
        else Alert.alert('Erro', result.error || 'Não foi possível aceitar.');
      }},
    ]);
  };

  if (loading) return <LoadingSpinner message="Carregando cargas..." />;

  if (role === 'motorista' && motorista?.status !== 'aprovado') {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedIcon}>
          <Text style={styles.blockedIconText}>!</Text>
        </View>
        <Text style={styles.blockedTitle}>Acesso restrito</Text>
        <Text style={styles.blockedText}>Você poderá buscar cargas assim que seu cadastro for aprovado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cargas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>0</Text>
            </View>
            <Text style={styles.emptyTitle}>Nenhuma carga disponível</Text>
            <Text style={styles.emptyText}>
              Não há cargas disponíveis para {motorista?.tipo_veiculo || 'seu veículo'} no momento. Puxe para atualizar.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.route}>
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.city}>{item.origem_cidade}/{item.origem_estado}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routePoint}>
                  <View style={[styles.routeDot, { backgroundColor: COLORS.accent }]} />
                  <Text style={styles.city}>{item.destino_cidade}/{item.destino_estado}</Text>
                </View>
              </View>
              <Badge variant="success">Disponível</Badge>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Valor</Text>
                <Text style={[styles.detailValue, { color: COLORS.primary, fontWeight: '700' }]}>
                  R$ {Number(item.valor_frete).toFixed(2)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Peso</Text>
                <Text style={styles.detailValue}>{item.peso}kg</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Veículo</Text>
                <Text style={styles.detailValue}>{item.tipo_veiculo}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Coleta</Text>
                <Text style={styles.detailValue}>{item.data_coleta}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAceitar(item.id)} activeOpacity={0.8}>
              <Text style={styles.acceptText}>Aceitar Carga</Text>
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  blockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  blockedIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.warningLight,
    justifyContent: 'center', alignItems: 'center',
  },
  blockedIconText: { fontSize: 28, fontWeight: '900', color: COLORS.warning },
  blockedTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  blockedText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
  empty: { justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl, marginTop: 40 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyIconText: { fontSize: 24, fontWeight: '800', color: COLORS.textTertiary },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },

  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  route: { flex: 1 },
  routePoint: { flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  routeLine: { width: 1, height: 14, backgroundColor: COLORS.border, marginLeft: 4, marginVertical: 2 },
  city: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.md },
  detailItem: { width: '45%' },
  detailLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  detailValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '500' },

  acceptBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  acceptText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },
});
