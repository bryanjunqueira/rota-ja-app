/**
 * Tela de Cargas — busca inteligente com filtros
 * Motorista: Origem, Destino, Distância Máxima (veículo detectado automaticamente do cadastro)
 * Empresa: Buscar Fretes + Novo Frete + lista de fretes próprios
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { FretesService } from '@/services';
import { LoadingSpinner, CidadeEstadoSelect, Button } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS, getStatusColor, getStatusLabel } from '@/config/theme';



export default function CargasScreen() {
  const { role, user, motorista } = useAuth();

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

// ── CARGAS MOTORISTA (com 4 filtros iguais ao web) ──

function CargasMotorista() {
  const { motorista } = useAuth();
  const [allCargas, setAllCargas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros (iguais ao web CargasDisponiveisMotorista)
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [filtroDestino, setFiltroDestino] = useState('');
  const [distanciaMaxima, setDistanciaMaxima] = useState(1000);
  const [selectedFrete, setSelectedFrete] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'disponiveis' | 'minhas'>('disponiveis');
  const [minhasCargas, setMinhasCargas] = useState<any[]>([]);

  const loadCargas = useCallback(async () => {
    if (!motorista) return;
    setLoading(true);
    if (viewMode === 'disponiveis') {
      const result = await FretesService.buscarTodosFretes();
      setAllCargas(result.data);
    } else {
      const result = await FretesService.buscarHistoricoMotorista(motorista.id);
      setMinhasCargas(result.data);
    }
    setLoading(false);
  }, [motorista, viewMode]);

  useEffect(() => { loadCargas(); }, [loadCargas]);
  const onRefresh = async () => { setRefreshing(true); await loadCargas(); setRefreshing(false); };

  const handleAceitar = async (freteId: string) => {
    if (!motorista) return;
    Alert.alert('Coletar Frete', 'Deseja aceitar e coletar esta carga?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Coletar', onPress: async () => {
        const result = await FretesService.aceitarCarga(freteId, motorista.id);
        if (result.success) { 
          Alert.alert('Frete coletado!', 'O frete foi aceito e está agora em suas cargas.'); 
          setDetailsVisible(false);
          loadCargas(); 
        }
        else Alert.alert('Erro', result.error || 'Não foi possível aceitar.');
      }},
    ]);
  };

  const handleOpenDetails = (frete: any) => {
    setSelectedFrete(frete);
    setDetailsVisible(true);
  };

  const handleUpdateStatus = async (freteId: string, status: 'em_transporte' | 'entregue') => {
    const action = status === 'em_transporte' ? 'iniciar o transporte' : 'finalizar a entrega';
    Alert.alert('Confirmar', `Deseja ${action} desta carga?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        const result = await FretesService.atualizarStatusCarga(freteId, status);
        if (result.success) {
          Alert.alert('Sucesso!', `O status da carga foi atualizado para ${status === 'em_transporte' ? 'em transporte' : 'entregue'}.`);
          loadCargas();
        } else {
          Alert.alert('Erro', result.error || 'Erro ao atualizar.');
        }
      }},
    ]);
  };

  // Filtro local com compatibilidade automática de veículo
  const cargasFiltradas = useMemo(() => {
    return allCargas.filter(frete => {
      // Filtrar por origem (busca parcial)
      const origemStr = `${frete.origem_cidade}, ${frete.origem_estado}`;
      const matchOrigem = !filtroOrigem || origemStr === filtroOrigem ||
        frete.origem_cidade.toLowerCase().includes(filtroOrigem.toLowerCase());

      // Filtrar por destino (busca parcial)
      const destinoStr = `${frete.destino_cidade}, ${frete.destino_estado}`;
      const matchDestino = !filtroDestino || destinoStr === filtroDestino ||
        frete.destino_cidade.toLowerCase().includes(filtroDestino.toLowerCase());

      // Compatibilidade automática baseada no veículo cadastrado
      const hierarquia: Record<string, string[]> = {
        'Carreta': ['Fiorino', 'Van', 'Caminhonete', 'Toco', 'Truck', 'Bitruck', 'Carreta'],
        'Bitruck': ['Fiorino', 'Van', 'Caminhonete', 'Toco', 'Truck', 'Bitruck'],
        'Truck': ['Fiorino', 'Van', 'Caminhonete', 'Toco', 'Truck'],
        'Toco': ['Fiorino', 'Van', 'Caminhonete', 'Toco'],
        'Caminhonete': ['Fiorino', 'Van', 'Caminhonete'],
        'Van': ['Fiorino', 'Van'],
        'Fiorino': ['Fiorino'],
      };
      const veiculosCompativeis = motorista ? (hierarquia[motorista.tipo_veiculo] || [motorista.tipo_veiculo]) : [];
      const isCompatible = motorista ? veiculosCompativeis.includes(frete.tipo_veiculo) : true;

      return matchOrigem && matchDestino && isCompatible;
    });
  }, [allCargas, filtroOrigem, filtroDestino, motorista]);

  if (motorista?.status !== 'aprovado') {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedIcon}><Text style={styles.blockedIconText}>!</Text></View>
        <Text style={styles.blockedTitle}>Acesso restrito</Text>
        <Text style={styles.blockedText}>Você poderá buscar cargas assim que seu cadastro for aprovado.</Text>
      </View>
    );
  }

  if (loading) return <LoadingSpinner message="Carregando cargas..." />;

  return (
    <View style={styles.container}>
      {/* Toggle View Mode */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'disponiveis' && styles.toggleBtnActive]}
          onPress={() => setViewMode('disponiveis')}
        >
          <Text style={[styles.toggleText, viewMode === 'disponiveis' && styles.toggleTextActive]}>Disponíveis</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'minhas' && styles.toggleBtnActive]}
          onPress={() => setViewMode('minhas')}
        >
          <Text style={[styles.toggleText, viewMode === 'minhas' && styles.toggleTextActive]}>Minhas Cargas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={viewMode === 'disponiveis' ? cargasFiltradas : minhasCargas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          viewMode === 'disponiveis' ? (
            <View style={styles.filterCard}>
              {/* Titulo */}
              <View style={styles.filterTitleRow}>
                <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
                <Text style={styles.filterTitle}>Cargas compatíveis com {motorista?.tipo_veiculo}</Text>
              </View>

              {/* Filtro: Origem */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Filtrar por Origem</Text>
                <CidadeEstadoSelect
                  value={filtroOrigem}
                  onChange={setFiltroOrigem}
                  placeholder="Selecione cidade de origem"
                />
              </View>

              {/* Filtro: Destino */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Filtrar por Destino</Text>
                <CidadeEstadoSelect
                  value={filtroDestino}
                  onChange={setFiltroDestino}
                  placeholder="Selecione cidade de destino"
                />
              </View>

              {/* Filtro: Distância Máxima */}
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>Distância Máxima</Text>
                <View style={styles.sliderRow}>
                  <Slider
                    style={{ flex: 1, height: 40 }}
                    minimumValue={50}
                    maximumValue={5000}
                    step={50}
                    value={distanciaMaxima}
                    onValueChange={setDistanciaMaxima}
                    minimumTrackTintColor={COLORS.primary}
                    maximumTrackTintColor={COLORS.border}
                    thumbTintColor={COLORS.primary}
                  />
                  <Text style={styles.sliderValue}>{distanciaMaxima} km</Text>
                </View>
              </View>

              {/* Botão Limpar Filtros */}
              {(filtroOrigem || filtroDestino || distanciaMaxima !== 1000) && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => {
                    setFiltroOrigem('');
                    setFiltroDestino('');
                    setDistanciaMaxima(1000);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                  <Text style={styles.clearBtnText}>Limpar Filtros</Text>
                </TouchableOpacity>
              )}

              {/* Resultado */}
              <View style={styles.resultRow}>
                <Ionicons name="cube" size={16} color={COLORS.primary} />
                <Text style={styles.resultCount}>
                  {cargasFiltradas.length} carga{cargasFiltradas.length !== 1 ? 's' : ''} encontrada{cargasFiltradas.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.minhasHeader}>
              <Ionicons name="briefcase" size={20} color={COLORS.primary} />
              <Text style={styles.minhasTitle}>Minhas Cargas Aceitas</Text>
            </View>
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>Nenhuma carga encontrada</Text>
            <Text style={styles.emptyText}>
              {allCargas.length === 0
                ? `Nenhuma carga disponível para ${motorista?.tipo_veiculo} no momento.`
                : 'Nenhuma carga encontrada com os filtros aplicados.'
              }
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Empresa + Badge veículo */}
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.empresaName} numberOfLines={1}>
                  {item.empresas?.nome_empresa || 'Empresa'}
                </Text>
                {viewMode === 'minhas' && (
                   <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status).bg, marginTop: 4, alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusPillText, { color: getStatusColor(item.status).text }]}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.vehicleBadge}>
                <Text style={styles.vehicleBadgeText}>{item.tipo_veiculo}</Text>
              </View>
            </View>

            {/* Rota */}
            <View style={styles.route}>
              <View style={styles.routePoint}>
                <Ionicons name="location" size={14} color={COLORS.primary} />
                <Text style={styles.routeText}>
                  <Text style={styles.routeBold}>Origem: </Text>{item.origem_cidade} - {item.origem_estado}
                </Text>
              </View>
              <View style={styles.routePoint}>
                <Ionicons name="location" size={14} color={COLORS.accent} />
                <Text style={styles.routeText}>
                  <Text style={styles.routeBold}>Destino: </Text>{item.destino_cidade} - {item.destino_estado}
                </Text>
              </View>
            </View>

            {/* Detalhes em 2 colunas */}
            <View style={styles.detailsRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Carga:</Text>
                <Text style={styles.detailValue}>{item.volume || 'N/I'}</Text>
                <Text style={styles.detailSub}>{item.peso}kg</Text>
              </View>
              <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.detailLabel}>Coleta:</Text>
                <Text style={styles.detailValue}>{new Date(item.data_coleta).toLocaleDateString('pt-BR')}</Text>
              </View>
            </View>

            {/* Valor */}
            <View style={styles.valorRow}>
              <Text style={styles.valorText}>
                R$ {Number(item.valor_frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.valorLabel}>Valor do frete</Text>
            </View>

            {/* Botões */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() => handleOpenDetails(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                <Text style={styles.detailsBtnText}>Detalhes</Text>
              </TouchableOpacity>

              {viewMode === 'disponiveis' ? (
                <TouchableOpacity
                  style={styles.coletarBtn}
                  onPress={() => handleAceitar(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                  <Text style={styles.coletarText}>Coletar</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {item.status === 'aceito' && (
                    <TouchableOpacity
                      style={[styles.coletarBtn, { backgroundColor: COLORS.info }]}
                      onPress={() => handleUpdateStatus(item.id, 'em_transporte')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={16} color={COLORS.white} />
                      <Text style={styles.coletarText}>Iniciar</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'em_transporte' && (
                    <TouchableOpacity
                      style={[styles.coletarBtn, { backgroundColor: COLORS.success }]}
                      onPress={() => handleUpdateStatus(item.id, 'entregue')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={16} color={COLORS.white} />
                      <Text style={styles.coletarText}>Entregar</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
      />

      {/* Modal de Detalhes da Carga */}
      <Modal visible={detailsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cube" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Detalhes da Carga</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {/* Informações da Empresa */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="business" size={18} color={COLORS.primary} />
                  <Text style={styles.sectionTitleModal}>Empresa</Text>
                </View>
                <View style={styles.sectionBody}>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabelModal}>Nome: </Text>
                    {selectedFrete?.empresas?.nome_empresa}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabelModal}>Responsável: </Text>
                    {selectedFrete?.empresas?.nome_responsavel || 'Não informado'}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabelModal}>Telefone: </Text>
                    {selectedFrete?.empresas?.telefone}
                  </Text>
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabelModal}>Email: </Text>
                    {selectedFrete?.empresas?.email || 'Não informado'}
                  </Text>
                </View>
              </View>

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
              {(selectedFrete?.data_aceite || selectedFrete?.data_inicio_transporte || selectedFrete?.data_entrega) && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time" size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitleModal}>Linha do Tempo</Text>
                  </View>
                  <View style={styles.sectionBody}>
                    {selectedFrete?.data_aceite && (
                      <View style={styles.timelineItem}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabelModal}>Aceito em: </Text>
                          {new Date(selectedFrete.data_aceite).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                    )}
                    {selectedFrete?.data_inicio_transporte && (
                      <View style={[styles.timelineItem, { marginTop: 8 }]}>
                        <Ionicons name="play-circle" size={16} color={COLORS.info} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabelModal}>Transporte iniciado: </Text>
                          {new Date(selectedFrete.data_inicio_transporte).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                    )}
                    {selectedFrete?.data_entrega && (
                      <View style={[styles.timelineItem, { marginTop: 8 }]}>
                        <Ionicons name="flag" size={16} color={COLORS.success} />
                        <Text style={styles.detailText}>
                          <Text style={styles.detailLabelModal}>Finalizado em: </Text>
                          {new Date(selectedFrete.data_entrega).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Valor */}
              <View style={styles.valorCardModal}>
                <Text style={styles.valorLabelModal}>Valor total do frete</Text>
                <Text style={styles.valorTextModal}>
                  R$ {selectedFrete ? Number(selectedFrete.valor_frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </Text>
              </View>

              {selectedFrete?.status === 'disponivel' && (
                <Button 
                  title="Coletar este Frete" 
                  onPress={() => handleAceitar(selectedFrete?.id)}
                  style={{ marginTop: 10 }}
                />
              )}
              <Button 
                title="Fechar" 
                variant="outline" 
                onPress={() => setDetailsVisible(false)}
                style={{ marginTop: 10, marginBottom: 40 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── CARGAS EMPRESA ──

// ── CARGAS EMPRESA ──


function CargasEmpresa({ userId }: { userId: string }) {
  const router = useRouter();
  const [fretes, setFretes] = useState<any[]>([]);
  const [allPublicFretes, setAllPublicFretes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await FretesService.buscarFretesEmpresa(userId);
    setFretes(data);
    setLoading(false);
  }, [userId]);

  const loadPublicFretes = async () => {
    const { data } = await FretesService.buscarTodosFretes();
    setAllPublicFretes(data);
    setShowSearchModal(true);
  };

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filteredPublic = useMemo(() => {
    if (!searchTerm) return allPublicFretes;
    const s = searchTerm.toLowerCase();
    return allPublicFretes.filter(f => 
      f.origem_cidade.toLowerCase().includes(s) ||
      f.destino_cidade.toLowerCase().includes(s) ||
      f.tipo_veiculo.toLowerCase().includes(s) ||
      (f.empresas?.nome_empresa || '').toLowerCase().includes(s)
    );
  }, [allPublicFretes, searchTerm]);

  if (loading) return <LoadingSpinner message="Carregando fretes..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={fretes}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: SPACING.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
            <TouchableOpacity 
              style={[styles.publishBtn, { flex: 1, backgroundColor: COLORS.accent, marginBottom: 0 }]} 
              onPress={loadPublicFretes} 
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={20} color={COLORS.textPrimary} />
              <Text style={styles.publishText}>Buscar Fretes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.publishBtn, { flex: 1, backgroundColor: COLORS.primary, marginBottom: 0 }]} 
              onPress={() => router.push('/novo-frete')} 
              activeOpacity={0.8}
            >
              <Ionicons name="add-outline" size={22} color={COLORS.white} />
              <Text style={[styles.publishText, { color: COLORS.white }]}>Novo Frete</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={40} color={COLORS.textTertiary} />
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
                <Ionicons name="location" size={14} color={COLORS.primary} />
                <Text style={styles.routeText}>{item.origem_cidade}/{item.origem_estado}</Text>
              </View>
              <View style={styles.routePoint}>
                <Ionicons name="location" size={14} color={COLORS.accent} />
                <Text style={styles.routeText}>{item.destino_cidade}/{item.destino_estado}</Text>
              </View>
            </View>
            <View style={styles.detailsRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Valor</Text>
                <Text style={[styles.detailValue, { color: COLORS.primary, fontWeight: '700' }]}>
                  R$ {Number(item.valor_frete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Peso</Text>
                <Text style={styles.detailValue}>{item.peso}kg</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Veículo</Text>
                <Text style={styles.detailValue}>{item.tipo_veiculo}</Text>
              </View>
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
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
      />

      {/* Modal de Busca Global (Igual ao Web) */}
      <Modal visible={showSearchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buscar Fretes</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarWrap}>
              <Ionicons name="search" size={20} color={COLORS.textTertiary} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Pesquisar por origem, destino, veículo..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <FlatList
              data={filteredPublic}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: SPACING.md }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: COLORS.textTertiary, marginTop: 40 }}>
                  Nenhum frete encontrado.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={[styles.card, { marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight }]}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.empresaName, { color: COLORS.primary }]}>{item.empresas?.nome_empresa}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{getStatusLabel(item.status)}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: COLORS.textTertiary, marginBottom: 4 }}>ID: #{item.id?.slice(0, 8)}</Text>
                  <View style={styles.route}>
                    <Text style={styles.routeText}><Text style={{ fontWeight: '700' }}>De:</Text> {item.origem_cidade}, {item.origem_estado}</Text>
                    <Text style={styles.routeText}><Text style={{ fontWeight: '700' }}>Para:</Text> {item.destino_cidade}, {item.destino_estado}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>🚗 {item.tipo_veiculo} | 📦 {item.peso}kg</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.primary }}>R$ {Number(item.valor_frete).toLocaleString('pt-BR')}</Text>
                  </View>
                </View>
              )}
            />

            <Button title="Fechar" onPress={() => setShowSearchModal(false)} variant="outline" style={{ margin: SPACING.md }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  blockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  blockedIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.warningLight, justifyContent: 'center', alignItems: 'center' },
  blockedIconText: { fontSize: 28, fontWeight: '900', color: COLORS.warning },
  blockedTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  blockedText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },

  empty: { justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl, marginTop: 20 },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },

  // ── Filter card ──
  filterCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  filterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  filterTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  filterField: { marginBottom: SPACING.sm },
  filterLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },

  // Chips (tipo veículo)
  chipScroll: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.background,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },

  // Slider
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  sliderValue: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, width: 70, textAlign: 'right' },

  // Clear / Result
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.error, borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 10, marginTop: SPACING.sm,
  },
  clearBtnText: { color: COLORS.error, fontWeight: '600', fontSize: FONT_SIZES.sm },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  resultCount: { fontSize: FONT_SIZES.sm, color: COLORS.primary, fontWeight: '600' },

  // ── Cards ──
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: BORDER_RADIUS.lg, 
    padding: 20,
    marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  cardTopRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  empresaName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary, flex: 1, marginRight: SPACING.sm },
  vehicleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  vehicleBadgeText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textSecondary },
  freteId: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  statusPillText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },

  // Route
  route: { marginBottom: SPACING.sm, gap: 4 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  routeBold: { fontWeight: '600', color: COLORS.textPrimary },

  // Details
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  detailCol: {},
  detailLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  detailValue: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '500' },
  detailSub: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },

  // Valor
  valorRow: { alignItems: 'center', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight, marginBottom: SPACING.sm },
  valorText: { fontSize: 22, fontWeight: '800', color: '#16a34a' },
  valorLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },

  // Actions
  cardActions: { flexDirection: 'row', gap: SPACING.sm },
  coletarBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#16a34a', borderRadius: BORDER_RADIUS.sm, paddingVertical: 12,
  },
  coletarText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.md },
  detailsBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.sm, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  detailsBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZES.md },

  // Empresa publish
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14, marginBottom: SPACING.md, ...SHADOWS.sm, gap: 6,
  },
  publishText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },

  // Motorista info
  motoristaRow: { flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  motoristaAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryFaded, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  motoristaInit: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.primary },
  motoristaName: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  motoristaPhone: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  searchBarWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, margin: 16, paddingHorizontal: 12, borderRadius: 12, height: 48, ...SHADOWS.sm },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: COLORS.textPrimary },

  // Detail Modal Specific
  detailSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitleModal: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sectionBody: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderLight },
  detailText: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 4 },
  detailLabelModal: { fontWeight: '600', color: COLORS.textSecondary },
  addressBox: { backgroundColor: COLORS.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderLight },
  addressType: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  addressText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  valorCardModal: { backgroundColor: COLORS.successLight, padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  valorLabelModal: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  valorTextModal: { fontSize: 26, fontWeight: '800', color: COLORS.success, marginTop: 4 },

  // Toggle
  viewToggle: {
    flexDirection: 'row', backgroundColor: COLORS.surfaceVariant,
    margin: SPACING.md, borderRadius: 12, padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: COLORS.white, ...SHADOWS.sm },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.primary },

  minhasHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12 },
  minhasTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
