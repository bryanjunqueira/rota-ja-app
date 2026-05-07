/**
 * Tela de Cargas — funcionalidade diferente por role
 * Motorista: cargas disponíveis para aceitar
 * Empresa: seus fretes publicados (atalho para o dashboard)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { FretesService } from '@/services';
import { LoadingSpinner, Badge } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS, getStatusColor, getStatusLabel } from '@/config/theme';

export default function CargasScreen() {
  const { role, user, motorista, empresa } = useAuth();
  const router = useRouter();

  if (role === 'empresa') return <CargasEmpresa userId={user?.id || ''} />;
  if (role === 'motorista') return <CargasMotorista />;

  return (
    <View style={styles.blockedContainer}>
      <View style={styles.blockedIcon}><Text style={styles.blockedIconText}>?</Text></View>
      <Text style={styles.blockedTitle}>Complete seu cadastro</Text>
      <Text style={styles.blockedText}>Cadastre-se como motorista ou empresa para acessar as cargas.</Text>
    </View>
  );
}

// ── CARGAS MOTORISTA ──

function CargasMotorista() {
  const { motorista } = useAuth();
  const [cargas, setCargas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCargas = useCallback(async () => {
    if (motorista) {
      const { data } = await FretesService.buscarCargasDisponiveis(motorista.tipo_veiculo);
      setCargas(data);
    }
    setLoading(false);
  }, [motorista]);

  useEffect(() => { loadCargas(); }, [loadCargas]);
  const onRefresh = async () => { setRefreshing(true); await loadCargas(); setRefreshing(false); };

  const handleAceitar = async (freteId: string) => {
    if (!motorista) return;
    Alert.alert('Aceitar Carga', 'Deseja aceitar esta carga?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aceitar', onPress: async () => {
        const result = await FretesService.aceitarCarga(freteId, motorista.id);
        if (result.success) { Alert.alert('Sucesso', 'Carga aceita!'); loadCargas(); }
        else Alert.alert('Erro', result.error || 'Não foi possível aceitar.');
      }},
    ]);
  };

  if (loading) return <LoadingSpinner message="Carregando cargas..." />;

  if (motorista?.status !== 'aprovado') {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedIcon}><Text style={styles.blockedIconText}>!</Text></View>
        <Text style={styles.blockedTitle}>Acesso restrito</Text>
        <Text style={styles.blockedText}>Você poderá buscar cargas assim que seu cadastro for aprovado.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={cargas}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: SPACING.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>0</Text></View>
          <Text style={styles.emptyTitle}>Nenhuma carga disponível</Text>
          <Text style={styles.emptyText}>Não há cargas para {motorista?.tipo_veiculo} no momento.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={styles.route}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.city}>{item.origem_cidade}/{item.origem_estado}</Text>
              </View>
              <View style={styles.routeLineVert} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.accent }]} />
                <Text style={styles.city}>{item.destino_cidade}/{item.destino_estado}</Text>
              </View>
            </View>
            <Badge variant="success">Disponível</Badge>
          </View>

          <View style={styles.detailsGrid}>
            <DetailCell label="Valor" value={`R$ ${Number(item.valor_frete).toFixed(2)}`} highlight />
            <DetailCell label="Peso" value={`${item.peso}kg`} />
            <DetailCell label="Veículo" value={item.tipo_veiculo} />
            <DetailCell label="Coleta" value={item.data_coleta} />
          </View>

          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAceitar(item.id)} activeOpacity={0.8}>
            <Text style={styles.acceptText}>Aceitar Carga</Text>
          </TouchableOpacity>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
    />
  );
}

// ── CARGAS EMPRESA (fretes publicados) ──

function CargasEmpresa({ userId }: { userId: string }) {
  const router = useRouter();
  const [fretes, setFretes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await FretesService.buscarFretesEmpresa(userId);
    setFretes(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <LoadingSpinner message="Carregando fretes..." />;

  return (
    <FlatList
      style={styles.container}
      data={fretes}
      keyExtractor={item => item.id}
      contentContainerStyle={{ padding: SPACING.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      ListHeaderComponent={
        <TouchableOpacity style={styles.publishBtn} onPress={() => router.push('/(app)/novo-frete')} activeOpacity={0.8}>
          <Text style={styles.publishPlus}>+</Text>
          <Text style={styles.publishText}>Publicar Novo Frete</Text>
        </TouchableOpacity>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>0</Text></View>
          <Text style={styles.emptyTitle}>Nenhum frete publicado</Text>
          <Text style={styles.emptyText}>Publique seu primeiro frete para encontrar motoristas.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.freteId}>#{item.id?.slice(0, 8)}</Text>
            <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status).bg }]}>
              <Text style={[styles.statusPillText, { color: getStatusColor(item.status).text }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
          <View style={styles.route}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.city}>{item.origem_cidade}/{item.origem_estado}</Text>
            </View>
            <View style={styles.routeLineVert} />
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.city}>{item.destino_cidade}/{item.destino_estado}</Text>
            </View>
          </View>
          <View style={styles.detailsGrid}>
            <DetailCell label="Valor" value={`R$ ${Number(item.valor_frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} highlight />
            <DetailCell label="Peso" value={`${item.peso}kg`} />
            <DetailCell label="Veículo" value={item.tipo_veiculo} />
            <DetailCell label="Coleta" value={new Date(item.data_coleta).toLocaleDateString('pt-BR')} />
          </View>
          {item.motoristas && (
            <View style={styles.motoristaRow}>
              <View style={styles.motoristaAvatar}>
                <Text style={styles.motoristaInit}>{item.motoristas.nome_completo?.charAt(0)?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.motoristaName}>{item.motoristas.nome_completo}</Text>
                <Text style={styles.motoristaPhone}>{item.motoristas.celular}</Text>
              </View>
            </View>
          )}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
    />
  );
}

// ── SHARED COMPONENTS ──

function DetailCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && { color: COLORS.primary, fontWeight: '700' }]}>{value}</Text>
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

  // Publish button (empresa)
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  publishPlus: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.textPrimary, marginRight: 6 },
  publishText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },

  // Cards
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, ...SHADOWS.sm },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  freteId: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  statusPillText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

  // Route
  route: { marginBottom: SPACING.sm },
  routePoint: { flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  routeLineVert: { width: 1, height: 14, backgroundColor: COLORS.border, marginLeft: 4, marginVertical: 2 },
  city: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },

  // Details grid
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  detailCell: { width: '46%' },
  detailLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  detailValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '500' },

  // Accept button
  acceptBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  acceptText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },

  // Motorista info
  motoristaRow: {
    flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  motoristaAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
  },
  motoristaInit: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary },
  motoristaName: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  motoristaPhone: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
});
