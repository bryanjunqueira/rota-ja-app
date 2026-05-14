/**
 * Dashboard — Tela principal com separação real entre motorista e empresa
 * Empresa: stats + lista de fretes (replica PerfilEmpresa do web)
 * Motorista: stats + situação cadastral + ações rápidas
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { FretesService, NotificacoesService } from '@/services';
import { LoadingSpinner, Badge, CancelModal } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS, getStatusColor, getStatusLabel } from '@/config/theme';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── DASHBOARD MOTORISTA ───

function DashboardMotorista() {
  const { motorista } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />}>
      {/* Header com gradiente */}
      <LinearGradient colors={['#1565C0', '#1976D2', '#2094F3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroHeader, { paddingTop: insets.top + 30 }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Olá, {motorista.nome_completo.split(' ')[0]} 👋</Text>
            <Text style={styles.heroSub}>Painel do Motorista</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.heroBadge, { backgroundColor: statusInfo.bg }]}>
              <Ionicons name={status === 'aprovado' ? 'checkmark-circle' : 'time-outline'} size={14} color={statusInfo.text} />
              <Text style={[styles.heroBadgeText, { color: statusInfo.text }]}>{getStatusLabel(status)}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(auth)/planos')} activeOpacity={0.7}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.crownCircleSmall}>
                <Ionicons name="ribbon" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.heroVehicle}>
          <Ionicons name="car-sport" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.heroVehicleText}>{motorista.tipo_veiculo}</Text>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(app)/cargas')} activeOpacity={0.7}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.primaryFaded }]}>
            <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.cargasDisponiveis}</Text>
          <Text style={styles.statLabel}>Disponíveis</Text>
          <Text style={styles.statDetail}>Para {motorista.tipo_veiculo}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(app)/cargas')} activeOpacity={0.7}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.accentFaded }]}>
            <Ionicons name="swap-horizontal" size={20} color={COLORS.accent} />
          </View>
          <Text style={[styles.statValue, { color: COLORS.accent }]}>{stats.cargasEmTransporte}</Text>
          <Text style={styles.statLabel}>Em Transporte</Text>
          <Text style={styles.statDetail}>Cargas ativas</Text>
        </TouchableOpacity>

        <View style={styles.statCard}>
          <View style={[styles.statIconBg, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="checkmark-done" size={20} color={COLORS.success} />
          </View>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.cargasTransportadas}</Text>
          <Text style={styles.statLabel}>Entregues</Text>
          <Text style={styles.statDetail}>Concluídas</Text>
        </View>

        <View style={styles.statCardStatus}>
          <View style={[styles.statIconBg, { backgroundColor: statusInfo.bg }]}>
            <Ionicons name={status === 'aprovado' ? 'shield-checkmark' : 'hourglass-outline'} size={20} color={statusInfo.text} />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={[styles.statLabel, { marginTop: 0 }]}>Status</Text>
            <Badge variant={status === 'aprovado' ? 'success' : status === 'pendente' ? 'warning' : 'destructive'}>
              {getStatusLabel(status)}
            </Badge>
          </View>
          <Text style={styles.statDetail}>
            {status === 'aprovado' ? 'Conta verificada' : status === 'pendente' ? 'Aguardando' : 'Contate suporte'}
          </Text>
        </View>
      </View>

      {/* Aviso de aprovação pendente */}
      {status !== 'aprovado' && (
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
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
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <TouchableOpacity
          style={[styles.actionCard, status !== 'aprovado' && styles.actionDisabled]}
          onPress={() => status === 'aprovado' && router.push('/(app)/cargas')}
          activeOpacity={0.7}
          disabled={status !== 'aprovado'}
        >
          <View style={[styles.actionIconBg, { backgroundColor: COLORS.primaryFaded }]}>
            <Ionicons name="search" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Buscar Cargas</Text>
            <Text style={styles.actionDesc}>Encontre cargas disponíveis na sua região</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, status !== 'aprovado' && styles.actionDisabled]}
          onPress={() => status === 'aprovado' && router.push('/(app)/perfil')}
          activeOpacity={0.7}
          disabled={status !== 'aprovado'}
        >
          <View style={[styles.actionIconBg, { backgroundColor: COLORS.accentFaded }]}>
            <Ionicons name="person" size={22} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Meu Perfil</Text>
            <Text style={styles.actionDesc}>Visualize e edite seus dados cadastrais</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, status !== 'aprovado' && styles.actionDisabled]}
          onPress={() => status === 'aprovado' && router.push('/(app)/notificacoes')}
          activeOpacity={0.7}
          disabled={status !== 'aprovado'}
        >
          <View style={[styles.actionIconBg, { backgroundColor: COLORS.infoLight }]}>
            <Ionicons name="notifications" size={22} color={COLORS.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Notificações</Text>
            <Text style={styles.actionDesc}>Acompanhe suas atualizações</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
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
  const insets = useSafeAreaInsets();
  const [fretes, setFretes] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, ativos: 0, andamento: 0, finalizados: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('todos');

  // Ações do Frete
  const [selectedFrete, setSelectedFrete] = useState<any>(null);
  const [selectedFreteId, setSelectedFreteId] = useState<string | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const MOTIVOS_CANCELAMENTO = [
    'Não tenho mais interesse',
    'Frete cancelado pela empresa',
    'Dados da carga incorretos',
    'Problema operacional/logístico',
    'Motorista incompatível',
    'Carga indisponível no momento',
    'Outro motivo'
  ];

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

  const handleCancelar = async (motivo: string, mensagem: string) => {
    if (!selectedFreteId) return;
    setCancelling(true);

    const frete = fretes.find(f => f.id === selectedFreteId);
    const result = await FretesService.cancelarFrete(selectedFreteId, motivo, mensagem);

    if (result.success) {
      if (frete?.motorista_id) {
        await NotificacoesService.enviar(
          frete.motorista_id,
          'Frete cancelado pela empresa',
          `A empresa ${empresa?.nome_empresa} cancelou o frete #${selectedFreteId.slice(0, 8)}. Motivo: ${motivo}`,
          selectedFreteId
        );
      }
      Alert.alert('Sucesso', 'Frete cancelado com sucesso.');
      load();
      setCancelModalVisible(false);
    } else {
      Alert.alert('Erro', result.error || 'Erro ao cancelar frete.');
    }
    setCancelling(false);
  };

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
      <View style={[styles.greetingRow, { paddingTop: insets.top + 30 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingTitle}>{empresa.nome_empresa}</Text>
          <Text style={styles.greetingSubtitle}>Painel da Empresa</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(auth)/planos')} activeOpacity={0.7} style={{ marginRight: 12 }}>
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.crownCircleSmall}>
            <Ionicons name="ribbon" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.novoFreteBtn} onPress={() => router.push('/novo-frete')} activeOpacity={0.7}>
          <Ionicons name="add-circle" size={18} color={COLORS.white} />
          <Text style={styles.novoBtnText}>Novo Frete</Text>
        </TouchableOpacity>
      </View>

      {/* Stats 4 cards com ícones */}
      <View style={styles.empresaStatsRow}>
        <View style={styles.empresaStatCard}>
          <Ionicons name="layers-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.empresaStatValue, { color: COLORS.primary }]}>{stats.total}</Text>
          <Text style={styles.empresaStatLabel}>Total</Text>
        </View>
        <View style={styles.empresaStatCard}>
          <Ionicons name="radio-button-on" size={18} color={COLORS.success} />
          <Text style={[styles.empresaStatValue, { color: COLORS.success }]}>{stats.ativos}</Text>
          <Text style={styles.empresaStatLabel}>Ativos</Text>
        </View>
        <View style={styles.empresaStatCard}>
          <Ionicons name="swap-horizontal" size={18} color={COLORS.info} />
          <Text style={[styles.empresaStatValue, { color: COLORS.info }]}>{stats.andamento}</Text>
          <Text style={styles.empresaStatLabel}>Andamento</Text>
        </View>
        <View style={styles.empresaStatCard}>
          <Ionicons name="checkmark-done" size={18} color={COLORS.success} />
          <Text style={[styles.empresaStatValue, { color: COLORS.success }]}>{stats.finalizados}</Text>
          <Text style={styles.empresaStatLabel}>Finalizados</Text>
        </View>
      </View>

      {/* Filtros tabs */}
      <View style={styles.filtroSection}>
        <Text style={styles.sectionTitle}>Meus Fretes</Text>
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
          <View 
            key={frete.id} 
            style={[styles.freteCard, { position: 'relative', zIndex: actionMenuVisible === frete.id ? 100 : 1 }]}
          >
            <View style={styles.freteHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.freteId}>Frete #{frete.id?.slice(0, 8)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.freteStatusBadge, { backgroundColor: getStatusColor(frete.status).bg }]}>
                  <Text style={[styles.freteStatusText, { color: getStatusColor(frete.status).text }]}>
                    {getStatusLabel(frete.status)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={{ padding: 4 }}
                  onPress={() => setActionMenuVisible(actionMenuVisible === frete.id ? null : frete.id)}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Janelinha branca de Ações */}
              {actionMenuVisible === frete.id && (
                <View style={[styles.popoverMenu, { right: 0, top: 40 }]}>
                  <TouchableOpacity 
                    style={styles.popoverItem}
                    onPress={() => { setActionMenuVisible(null); setSelectedFrete(frete); setDetailsVisible(true); }}
                  >
                    <Text style={styles.popoverText}>Ver Detalhes</Text>
                  </TouchableOpacity>
                  {(frete.status !== 'cancelado_empresa' && frete.status !== 'entregue') && (
                    <TouchableOpacity 
                      style={[styles.popoverItem, { borderBottomWidth: 0 }]}
                      onPress={() => { setActionMenuVisible(null); setSelectedFreteId(frete.id); setCancelModalVisible(true); }}
                    >
                      <Text style={[styles.popoverText, { color: COLORS.error }]}>Excluir</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
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
            {(() => {
              const motoristaCard = frete.motoristas ? (Array.isArray(frete.motoristas) ? frete.motoristas[0] : frete.motoristas) : null;
              return motoristaCard ? (
                <View style={styles.motoristaInfo}>
                  <View style={styles.motoristaAvatar}>
                    <Text style={styles.motoristaAvatarText}>{motoristaCard.nome_completo?.charAt(0)?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.motoristaName}>{motoristaCard.nome_completo}</Text>
                    <Text style={styles.motoristaContact}>{motoristaCard.celular}</Text>
                  </View>
                </View>
              ) : null;
            })()}
          </View>
        ))
      )}

      <View style={{ height: SPACING.xxl }} />

      {/* ActionMenu foi removido e substituído pela janelinha inline no View freteCard */}

      {/* Modal de Detalhes Empresa */}
      <Modal visible={detailsVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentDetail}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Revisão do Frete</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <View style={[styles.freteStatusBadge, { 
                backgroundColor: getStatusColor(selectedFrete?.status || '').bg,
                alignSelf: 'flex-start',
                paddingHorizontal: 15,
                paddingVertical: 6,
                marginBottom: 20
              }]}>
                <Text style={[styles.freteStatusText, { 
                  color: getStatusColor(selectedFrete?.status || '').text,
                  fontSize: 14
                }]}>
                  {getStatusLabel(selectedFrete?.status || '')}
                </Text>
              </View>

              {/* Informações do Motorista (se houver) */}
              {(() => {
                const motoristaVinculado = selectedFrete?.motoristas ? (Array.isArray(selectedFrete.motoristas) ? selectedFrete.motoristas[0] : selectedFrete.motoristas) : null;
                return motoristaVinculado ? (
                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="person" size={18} color={COLORS.primary} />
                      <Text style={styles.sectionTitleModal}>Motorista Vinculado</Text>
                    </View>
                    <View style={styles.sectionBody}>
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabelModal}>Nome: </Text>
                        {motoristaVinculado.nome_completo}
                      </Text>
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabelModal}>Celular: </Text>
                        {motoristaVinculado.celular}
                      </Text>
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabelModal}>Veículo: </Text>
                        {motoristaVinculado.tipo_veiculo || 'Não informado'}
                      </Text>
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabelModal}>Placa: </Text>
                        {motoristaVinculado.placa_veiculo || 'Não informada'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="person" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.sectionTitleModal}>Motorista Vinculado</Text>
                    </View>
                    <View style={styles.sectionBody}>
                      <Text style={styles.detailText}>Nenhum motorista aceitou este frete ainda.</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Rota Detalhada */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="map" size={18} color={COLORS.primary} />
                  <Text style={styles.sectionTitleModal}>Rota e Endereços</Text>
                </View>
                <View style={styles.sectionBody}>
                  <View style={styles.addressBox}>
                    <Text style={[styles.addressType, { color: COLORS.primary }]}>RETIRADA</Text>
                    <Text style={styles.addressText}>
                      {selectedFrete?.endereco_retirada}, {selectedFrete?.numero_retirada}
                    </Text>
                    {selectedFrete?.complemento_retirada && (
                      <Text style={styles.addressText}>{selectedFrete.complemento_retirada}</Text>
                    )}
                    <Text style={styles.addressText}>
                      {selectedFrete?.origem_cidade} - {selectedFrete?.origem_estado}
                    </Text>
                    <Text style={styles.addressText}>CEP: {selectedFrete?.cep_retirada}</Text>
                  </View>

                  <View style={[styles.addressBox, { marginTop: 12 }]}>
                    <Text style={[styles.addressType, { color: COLORS.accent }]}>ENTREGA</Text>
                    <Text style={styles.addressText}>
                      {selectedFrete?.endereco_entrega}, {selectedFrete?.numero_entrega}
                    </Text>
                    {selectedFrete?.complemento_entrega && (
                      <Text style={styles.addressText}>{selectedFrete.complemento_entrega}</Text>
                    )}
                    <Text style={styles.addressText}>
                      {selectedFrete?.destino_cidade} - {selectedFrete?.destino_estado}
                    </Text>
                    <Text style={styles.addressText}>CEP: {selectedFrete?.cep_entrega}</Text>
                  </View>
                </View>
              </View>

              {/* Dados da Carga */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="list" size={18} color={COLORS.primary} />
                  <Text style={styles.sectionTitleModal}>Especificações</Text>
                </View>
                <View style={[styles.sectionBody, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                  <View style={{ width: '50%', marginBottom: 10 }}>
                    <Text style={styles.detailLabelModal}>Volume</Text>
                    <Text style={styles.detailText}>{selectedFrete?.volume || 'N/I'}</Text>
                  </View>
                  <View style={{ width: '50%', marginBottom: 10 }}>
                    <Text style={styles.detailLabelModal}>Peso</Text>
                    <Text style={styles.detailText}>{selectedFrete?.peso} kg</Text>
                  </View>
                  <View style={{ width: '50%' }}>
                    <Text style={styles.detailLabelModal}>Dimensões</Text>
                    <Text style={styles.detailText}>{selectedFrete?.dimensao || 'N/I'}</Text>
                  </View>
                  <View style={{ width: '50%' }}>
                    <Text style={styles.detailLabelModal}>Veículo</Text>
                    <Text style={styles.detailText}>{selectedFrete?.tipo_veiculo}</Text>
                  </View>
                </View>
              </View>

              {/* Datas */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar" size={18} color={COLORS.primary} />
                  <Text style={styles.sectionTitleModal}>Cronograma</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={styles.detailLabelModal}>Coleta</Text>
                    <Text style={styles.detailText}>
                      {selectedFrete ? new Date(selectedFrete.data_coleta).toLocaleDateString('pt-BR') : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.detailLabelModal}>Prazo de Entrega</Text>
                    <Text style={styles.detailText}>
                      {selectedFrete ? new Date(selectedFrete.prazo_entrega).toLocaleDateString('pt-BR') : ''}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Linha do Tempo (Timeline) */}
              {(selectedFrete?.data_aceite || selectedFrete?.data_inicio_transporte || selectedFrete?.data_entrega || selectedFrete?.data_cancelamento || selectedFrete?.data_devolucao) && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time" size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitleModal}>Linha do Tempo</Text>
                  </View>
                  <View style={styles.sectionBody}>
                    {selectedFrete?.data_aceite && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabelModal}>Aceito em: </Text>
                          {new Date(selectedFrete.data_aceite).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                    )}
                    {selectedFrete?.data_inicio_transporte && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <Ionicons name="play-circle" size={16} color={COLORS.info} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabelModal}>Transporte iniciado: </Text>
                          {new Date(selectedFrete.data_inicio_transporte).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                    )}
                    {selectedFrete?.data_entrega && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <Ionicons name="flag" size={16} color={COLORS.primary} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabelModal}>Entregue em: </Text>
                          {new Date(selectedFrete.data_entrega).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                    )}
                    {selectedFrete?.data_cancelamento && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <Ionicons name="close-circle" size={16} color={COLORS.error} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabelModal}>Cancelado em: </Text>
                          {new Date(selectedFrete.data_cancelamento).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                    )}
                    {selectedFrete?.data_devolucao && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <Ionicons name="arrow-undo" size={16} color={COLORS.error} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabelModal}>Devolvido em: </Text>
                          {new Date(selectedFrete.data_devolucao).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={[styles.valorCardModal, { marginBottom: 30 }]}>
                <Text style={styles.valorLabelModal}>Valor do Frete</Text>
                <Text style={styles.valorTextModal}>
                  R$ {selectedFrete ? Number(selectedFrete.valor_frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Ionicons name={selectedFrete?.pedagogio_incluso ? "checkmark-circle" : "close-circle"} size={14} color={selectedFrete?.pedagogio_incluso ? COLORS.success : COLORS.textSecondary} />
                  <Text style={{ fontSize: 12, marginLeft: 4, color: selectedFrete?.pedagogio_incluso ? COLORS.success : COLORS.textSecondary, fontWeight: '600' }}>
                    {selectedFrete?.pedagogio_incluso ? "Pedágio Incluso" : "Pedágio Não Incluso"}
                  </Text>
                </View>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CancelModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleCancelar}
        title="Cancelar Frete"
        subtitle="Esta ação registrará o cancelamento e o motivo no histórico do sistema."
        reasons={MOTIVOS_CANCELAMENTO}
        loading={cancelling}
      />
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

  // ── Hero Header (motorista) ──
  heroHeader: {
    paddingTop: 20, paddingBottom: 24, paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroGreeting: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },
  heroVehicle: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full,
  },
  heroVehicleText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#fff' },

  // ── Greeting (empresa) ──
  greetingRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, paddingBottom: SPACING.sm },
  greetingTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary },
  greetingSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  novoFreteBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full, gap: 6, ...SHADOWS.md,
  },
  novoBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.white },

  // ── Motorista Stats ──
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md,
    gap: SPACING.sm, marginTop: -12,
  },
  statCard: {
    width: '47.5%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', ...SHADOWS.md,
  },
  statCardStatus: {
    width: '47.5%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  statIconBg: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  statValue: { fontSize: FONT_SIZES.xxl, fontWeight: '800' },
  statLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginTop: 4 },
  statDetail: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: 2, textAlign: 'center' },

  // Warning card
  warningCard: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.lg, backgroundColor: COLORS.warningLight,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  warningTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#92400E' },
  warningText: { fontSize: FONT_SIZES.sm, color: '#92400E', lineHeight: 20 },

  // Actions
  actionsSection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  actionIconBg: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  actionDisabled: { opacity: 0.4 },
  actionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  actionDesc: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },

  // ── Empresa Stats ──
  empresaStatsRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginTop: SPACING.sm },
  empresaStatCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm,
  },
  empresaStatValue: { fontSize: FONT_SIZES.xl, fontWeight: '800' },
  empresaStatLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

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
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm,
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
  
  crownCircleSmall: {
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', ...SHADOWS.md
  },
  actionBtnCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center', alignItems: 'center'
  },
  popoverMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 1000,
  },
  popoverItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  popoverText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContentDetail: { backgroundColor: COLORS.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  detailSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitleModal: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sectionBody: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  detailText: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 4 },
  detailLabelModal: { fontWeight: '600', color: COLORS.textSecondary },
  addressBox: { backgroundColor: COLORS.background, padding: 12, borderRadius: 12 },
  addressType: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  addressText: { fontSize: 14, color: COLORS.textPrimary },
  motoristaNameDetail: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  motoristaContactDetail: { fontSize: 14, color: COLORS.textSecondary },
  valorCardModal: { backgroundColor: COLORS.successLight, padding: 24, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  valorLabelModal: { fontSize: 13, color: COLORS.success, fontWeight: '700' },
  valorTextModal: { fontSize: 28, fontWeight: '900', color: COLORS.success, marginTop: 4 },
});
