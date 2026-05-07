/**
 * Dashboard — Tela principal com separação real entre motorista e empresa
 * Empresa: stats + lista de fretes (replica PerfilEmpresa do web)
 * Motorista: stats + situação cadastral + ações rápidas
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { FretesService } from '@/services';
import { LoadingSpinner, Badge } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS, getStatusColor, getStatusLabel } from '@/config/theme';
import { useRouter } from 'expo-router';

// ─── DASHBOARD MOTORISTA ───

function DashboardMotorista() {
  const { motorista } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ cargasDisponiveis: 0, cargasEmTransporte: 0, cargasTransportadas: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!motorista) return;
    const s = await FretesService.buscarEstatisticasMotorista(motorista.id, motorista.tipo_veiculo);
    setStats(s);
    setLoading(false);
  }, [motorista]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <LoadingSpinner message="Carregando painel..." />;
  if (!motorista) return null;

  const status = motorista.status || 'pendente';
  const statusInfo = getStatusColor(status);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      {/* Saudação */}
      <View style={styles.greeting}>
        <Text style={styles.greetingTitle}>Olá, {motorista.nome_completo.split(' ')[0]}!</Text>
        <Text style={styles.greetingSubtitle}>Painel do Motorista</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(app)/cargas')} activeOpacity={0.7}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.primaryFaded }]}>
            <Text style={styles.statIconText}>C</Text>
          </View>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.cargasDisponiveis}</Text>
          <Text style={styles.statLabel}>Disponíveis</Text>
          <Text style={styles.statDetail}>Para {motorista.tipo_veiculo}</Text>
        </TouchableOpacity>

        <View style={styles.statCard}>
          <View style={[styles.statIconBg, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statIconText, { color: statusInfo.text }]}>S</Text>
          </View>
          <Badge variant={status === 'aprovado' ? 'success' : status === 'pendente' ? 'warning' : 'destructive'}>
            {getStatusLabel(status)}
          </Badge>
          <Text style={styles.statDetail}>
            {status === 'aprovado' ? 'Conta verificada' : status === 'pendente' ? 'Aguardando aprovação' : 'Contate suporte'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.accentFaded }]}>
            <Text style={[styles.statIconText, { color: COLORS.accent }]}>T</Text>
          </View>
          <Text style={[styles.statValue, { color: COLORS.accent }]}>{stats.cargasEmTransporte}</Text>
          <Text style={styles.statLabel}>Em Transporte</Text>
          <Text style={styles.statDetail}>Cargas ativas</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.statIconText, { color: COLORS.success }]}>E</Text>
          </View>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.cargasTransportadas}</Text>
          <Text style={styles.statLabel}>Entregues</Text>
          <Text style={styles.statDetail}>Concluídas</Text>
        </View>
      </View>

      {/* Aviso de aprovação pendente */}
      {status !== 'aprovado' && (
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <View style={styles.warningDot} />
            <Text style={styles.warningTitle}>Atenção</Text>
          </View>
          <Text style={styles.warningText}>
            {status === 'pendente'
              ? 'Seu cadastro está em análise. Você poderá buscar cargas assim que for aprovado pela equipe.'
              : 'Seu cadastro foi reprovado. Entre em contato com nosso suporte para mais informações.'
            }
          </Text>
        </View>
      )}

      {/* Ações rápidas */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.actionCard, status !== 'aprovado' && styles.actionDisabled]}
          onPress={() => status === 'aprovado' && router.push('/(app)/cargas')}
          activeOpacity={0.7}
          disabled={status !== 'aprovado'}
        >
          <Text style={styles.actionTitle}>Buscar Cargas</Text>
          <Text style={styles.actionDesc}>Encontre cargas disponíveis na sua região</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

// ─── DASHBOARD EMPRESA ───

function DashboardEmpresa() {
  const { user, empresa } = useAuth();
  const router = useRouter();
  const [fretes, setFretes] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, ativos: 0, andamento: 0, finalizados: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todos');

  const load = useCallback(async () => {
    if (!user) return;
    const [fretesResult, statsResult] = await Promise.all([
      FretesService.buscarFretesEmpresa(user.id),
      FretesService.buscarEstatisticasEmpresa(user.id),
    ]);
    setFretes(fretesResult.data);
    setStats(statsResult);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <LoadingSpinner message="Carregando painel..." />;
  if (!empresa) return null;

  // Bloqueio se empresa não aprovada
  if (empresa.status !== 'aprovado') {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedIcon}>
          <Text style={styles.blockedIconText}>
            {empresa.status === 'pendente' ? '⏳' : '✕'}
          </Text>
        </View>
        <Text style={styles.blockedTitle}>
          {empresa.status === 'pendente' ? 'Conta Pendente de Aprovação' :
           empresa.status === 'rejeitada' ? 'Conta Rejeitada' : 'Conta Bloqueada'}
        </Text>
        <Text style={styles.blockedText}>
          {empresa.status === 'pendente'
            ? 'Sua conta está sendo analisada pela nossa equipe. Você receberá um email quando for aprovada.'
            : 'Entre em contato com nosso suporte para mais informações.'}
        </Text>
        <View style={styles.blockedStatusPill}>
          <Text style={styles.blockedStatusText}>Status: {empresa.status}</Text>
        </View>
      </View>
    );
  }

  const fretesFiltrados = fretes.filter(f => {
    if (filtro === 'todos') return true;
    if (filtro === 'ativos') return f.status === 'disponivel';
    if (filtro === 'andamento') return f.status === 'aceito' || f.status === 'em_transporte';
    if (filtro === 'finalizados') return f.status === 'entregue';
    return true;
  });

  const filtros = [
    { key: 'todos', label: 'Todos', count: stats.total },
    { key: 'ativos', label: 'Ativos', count: stats.ativos },
    { key: 'andamento', label: 'Andamento', count: stats.andamento },
    { key: 'finalizados', label: 'Finalizados', count: stats.finalizados },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      {/* Saudação empresa + botão novo frete */}
      <View style={styles.greetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingTitle}>{empresa.nome_empresa}</Text>
          <Text style={styles.greetingSubtitle}>Painel da Empresa</Text>
        </View>
        <TouchableOpacity style={styles.novoFreteBtn} onPress={() => router.push('/(app)/novo-frete')} activeOpacity={0.8}>
          <Text style={styles.novoBtnPlus}>+</Text>
          <Text style={styles.novoBtnText}>Novo Frete</Text>
        </TouchableOpacity>
      </View>

      {/* Stats 4 cards — como no web PerfilEmpresa */}
      <View style={styles.empresaStatsRow}>
        <View style={styles.empresaStatCard}>
          <Text style={[styles.empresaStatValue, { color: COLORS.primary }]}>{stats.total}</Text>
          <Text style={styles.empresaStatLabel}>Total</Text>
        </View>
        <View style={styles.empresaStatCard}>
          <Text style={[styles.empresaStatValue, { color: COLORS.success }]}>{stats.ativos}</Text>
          <Text style={styles.empresaStatLabel}>Ativos</Text>
        </View>
        <View style={styles.empresaStatCard}>
          <Text style={[styles.empresaStatValue, { color: COLORS.info }]}>{stats.andamento}</Text>
          <Text style={styles.empresaStatLabel}>Andamento</Text>
        </View>
        <View style={styles.empresaStatCard}>
          <Text style={[styles.empresaStatValue, { color: COLORS.textTertiary }]}>{stats.finalizados}</Text>
          <Text style={styles.empresaStatLabel}>Finalizados</Text>
        </View>
      </View>

      {/* Filtros tabs — como no web */}
      <View style={styles.filtroSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Meus Fretes</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/novo-frete')}>
            <Text style={{ color: COLORS.accent, fontSize: FONT_SIZES.sm, fontWeight: '600' }}>+ Publicar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroRow}>
          {filtros.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filtroTab, filtro === f.key && styles.filtroTabActive]}
              onPress={() => setFiltro(f.key)}
            >
              <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActive]}>
                {f.label} ({f.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de fretes */}
      {fretesFiltrados.length === 0 ? (
        <View style={styles.emptyFretes}>
          <Text style={styles.emptyTitle}>Nenhum frete encontrado</Text>
          <Text style={styles.emptyText}>
            {filtro === 'todos' ? 'Publique seu primeiro frete para encontrar motoristas.' : `Nenhum frete com status "${filtro}".`}
          </Text>
        </View>
      ) : (
        fretesFiltrados.map(frete => (
          <View key={frete.id} style={styles.freteCard}>
            <View style={styles.freteHeader}>
              <Text style={styles.freteId}>Frete #{frete.id?.slice(0, 8)}</Text>
              <View style={[styles.freteStatusBadge, { backgroundColor: getStatusColor(frete.status).bg }]}>
                <Text style={[styles.freteStatusText, { color: getStatusColor(frete.status).text }]}>
                  {getStatusLabel(frete.status)}
                </Text>
              </View>
            </View>

            <View style={styles.freteRoute}>
              <View style={styles.freteRoutePoint}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.freteRouteText}>{frete.origem_cidade}/{frete.origem_estado}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.freteRoutePoint}>
                <View style={[styles.routeDot, { backgroundColor: COLORS.accent }]} />
                <Text style={styles.freteRouteText}>{frete.destino_cidade}/{frete.destino_estado}</Text>
              </View>
            </View>

            <View style={styles.freteDetails}>
              <View style={styles.freteDetailItem}>
                <Text style={styles.freteDetailLabel}>Valor</Text>
                <Text style={styles.freteDetailValue}>R$ {Number(frete.valor_frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.freteDetailItem}>
                <Text style={styles.freteDetailLabel}>Peso</Text>
                <Text style={styles.freteDetailValue}>{frete.peso}kg</Text>
              </View>
              <View style={styles.freteDetailItem}>
                <Text style={styles.freteDetailLabel}>Veículo</Text>
                <Text style={styles.freteDetailValue}>{frete.tipo_veiculo}</Text>
              </View>
              <View style={styles.freteDetailItem}>
                <Text style={styles.freteDetailLabel}>Coleta</Text>
                <Text style={styles.freteDetailValue}>{new Date(frete.data_coleta).toLocaleDateString('pt-BR')}</Text>
              </View>
            </View>

            {/* Motorista que aceitou */}
            {frete.motoristas && (
              <View style={styles.motoristaInfo}>
                <View style={styles.motoristaAvatar}>
                  <Text style={styles.motoristaAvatarText}>{frete.motoristas.nome_completo?.charAt(0)?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.motoristaName}>{frete.motoristas.nome_completo}</Text>
                  <Text style={styles.motoristaContact}>{frete.motoristas.celular}</Text>
                </View>
              </View>
            )}
          </View>
        ))
      )}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

// ─── ROOT DASHBOARD ───

export default function DashboardScreen() {
  const { role, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Carregando..." />;

  if (role === 'motorista') return <DashboardMotorista />;
  if (role === 'empresa') return <DashboardEmpresa />;

  // Sem role — orienta completar cadastro
  return (
    <View style={styles.noRoleContainer}>
      <View style={styles.noRoleIcon}>
        <Text style={styles.noRoleIconText}>?</Text>
      </View>
      <Text style={styles.noRoleTitle}>Complete seu cadastro</Text>
      <Text style={styles.noRoleText}>Acesse a aba Perfil para completar seu cadastro como motorista ou empresa.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Greeting
  greeting: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  greetingRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, paddingBottom: SPACING.sm },
  greetingTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary },
  greetingSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  novoFreteBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full, ...SHADOWS.sm,
  },
  novoBtnPlus: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginRight: 4 },
  novoBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },

  // ── Motorista Stats ──
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  statCard: {
    width: '48%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm,
  },
  statIconBg: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  statIconText: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.primary },
  statValue: { fontSize: FONT_SIZES.xxl, fontWeight: '800' },
  statLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  statDetail: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: 2 },

  // Warning card
  warningCard: {
    margin: SPACING.lg, marginTop: SPACING.md, backgroundColor: COLORS.warningLight,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  warningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning, marginRight: SPACING.sm },
  warningTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#92400E' },
  warningText: { fontSize: FONT_SIZES.sm, color: '#92400E', lineHeight: 20 },

  // Actions
  actionsSection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  actionCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, ...SHADOWS.sm,
  },
  actionDisabled: { opacity: 0.5 },
  actionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.primary },
  actionDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },

  // ── Empresa Stats ──
  empresaStatsRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  empresaStatCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm,
  },
  empresaStatValue: { fontSize: FONT_SIZES.xl, fontWeight: '800' },
  empresaStatLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },

  // Filtros
  filtroSection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  filtroRow: { marginBottom: SPACING.md },
  filtroTab: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceVariant,
  },
  filtroTabActive: { backgroundColor: COLORS.primary },
  filtroText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: '500' },
  filtroTextActive: { color: COLORS.white, fontWeight: '600' },

  // Fretes list
  emptyFretes: { alignItems: 'center', padding: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },

  freteCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, ...SHADOWS.sm,
  },
  freteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  freteId: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  freteStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  freteStatusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

  // Route visual
  freteRoute: { marginBottom: SPACING.md },
  freteRoutePoint: { flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  routeLine: { width: 1, height: 16, backgroundColor: COLORS.border, marginLeft: 4, marginVertical: 2 },
  freteRouteText: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.textPrimary },

  // Frete details grid
  freteDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  freteDetailItem: { width: '47%' },
  freteDetailLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  freteDetailValue: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },

  // Motorista info on frete
  motoristaInfo: {
    flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  motoristaAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
  },
  motoristaAvatarText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary },
  motoristaName: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  motoristaContact: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

  // Blocked (empresa not approved)
  blockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  blockedIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.warningLight,
    justifyContent: 'center', alignItems: 'center',
  },
  blockedIconText: { fontSize: 32 },
  blockedTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.lg, textAlign: 'center' },
  blockedText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 22 },
  blockedStatusPill: { backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, marginTop: SPACING.lg },
  blockedStatusText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },

  // No role
  noRoleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  noRoleIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  noRoleIconText: { fontSize: 28, fontWeight: '800', color: COLORS.textSecondary },
  noRoleTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  noRoleText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
});
