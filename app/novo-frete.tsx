/**
 * Novo Frete — Formulário premium de alta fidelidade para empresas
 * 
 * - Design Drástico Premium com Wizard de 3 etapas interativo
 * - Integração inteligente de CEP (ViaCEP API) com auto-fill e foco automático
 * - Rua, Cidade e Estado permanecem 100% editáveis a qualquer momento
 * - Grelha de veículos premium com seleção visual interativa
 * - Visualizadores de rota (timeline Coleta -> Entrega)
 */
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { FretesService, CriarFreteData } from '@/services/fretes.service';
import { TRIAL_DURATION_DAYS } from '@/config/plans';
import { Button, Input, PaywallModal } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

const TIPOS_VEICULOS = [
  { name: 'Carreta', icon: 'trail-sign-outline' },
  { name: 'Truck', icon: 'cube-outline' },
  { name: 'Toco', icon: 'file-tray-full-outline' },
  { name: 'VUC', 'icon': 'bus-outline' },
  { name: 'Bitrem', 'icon': 'grid-outline' },
  { name: 'Fiorino', 'icon': 'car-sport-outline' },
  { name: '3x4', 'icon': 'calculator-outline' },
  { name: 'Bitruck', 'icon': 'layers-outline' },
  { name: 'Carreta LS', 'icon': 'albums-outline' },
  { name: 'Rodotrem', 'icon': 'repeat-outline' },
  { name: 'Vanderleia', 'icon': 'infinite-outline' },
  { name: 'Sider', 'icon': 'browsers-outline' },
];

export default function NovoFreteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { permissions, tier, status, isTrialActive } = useSubscription();
  const insets = useSafeAreaInsets();

  const [publishLimit, setPublishLimit] = useState<{
    usados: number;
    limite: number;
    modo?: string;
  } | null>(null);
  const [limitPaywall, setLimitPaywall] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const loadPublishLimit = useCallback(async () => {
    if (!user?.id) return;
    const check = await FretesService.verificarLimitePublicacaoEmpresa(user.id);
    if (check.limite != null && check.usados != null) {
      setPublishLimit({ usados: check.usados, limite: check.limite, modo: check.modo });
    }
  }, [user?.id]);

  useEffect(() => {
    loadPublishLimit();
  }, [loadPublishLimit, tier, status]);

  const limitLabel = useMemo(() => {
    if (permissions.hasUnlimitedFreights) return 'Plano Ouro: publicacoes ilimitadas.';
    if (!publishLimit) return null;
    const periodo = publishLimit.modo === 'lifetime' ? `no trial de ${TRIAL_DURATION_DAYS} dias` : 'este mes';
    return `Publicacoes: ${publishLimit.usados}/${publishLimit.limite} ${periodo}.`;
  }, [permissions.hasUnlimitedFreights, publishLimit]);
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: endereços/rota, 2: carga, 3: veículo/preço
  const [pedagio, setPedagio] = useState(false);
  
  const [showColetaPicker, setShowColetaPicker] = useState(false);
  const [showPrazoPicker, setShowPrazoPicker] = useState(false);

  // Loadings individuais de busca de CEP
  const [loadingCEPColeta, setLoadingCEPColeta] = useState(false);
  const [loadingCEPEntrega, setLoadingCEPEntrega] = useState(false);

  // Refs para auto-focar Número após buscar CEP
  const numeroRetiradaRef = useRef<TextInput>(null);
  const numeroEntregaRef = useRef<TextInput>(null);

  const [form, setForm] = useState({
    origemCidade: '',
    origemEstado: '',
    destinoCidade: '',
    destinoEstado: '',
    enderecoRetirada: '',
    cepRetirada: '',
    numeroRetirada: '',
    complementoRetirada: '',
    enderecoEntrega: '',
    cepEntrega: '',
    numeroEntrega: '',
    complementoEntrega: '',
    volume: '',
    dimensao: '',
    peso: '',
    dataColeta: '',
    prazoEntrega: '',
    tipoVeiculo: '',
    valorFrete: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [veiculoCategoria, setVeiculoCategoria] = useState<'leves' | 'medios' | 'pesados'>('leves');

  const veiculosFiltrados = useMemo(() => {
    return TIPOS_VEICULOS.filter(v => {
      if (veiculoCategoria === 'leves') {
        return ['3x4', 'Fiorino', 'Toco', 'VUC'].includes(v.name);
      }
      if (veiculoCategoria === 'medios') {
        return ['Bitruck', 'Truck', 'Sider'].includes(v.name);
      }
      if (veiculoCategoria === 'pesados') {
        return ['Bitrem', 'Carreta', 'Carreta LS', 'Rodotrem', 'Vanderleia'].includes(v.name);
      }
      return false;
    });
  }, [veiculoCategoria]);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Máscara e auto-fill de CEP
  const formatCEP = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length > 5) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    }
    return cleaned;
  };

  const handleCEPColetaChange = async (text: string) => {
    const formatted = formatCEP(text);
    update('cepRetirada', formatted);

    const cleaned = formatted.replace('-', '');
    if (cleaned.length === 8) {
      setLoadingCEPColeta(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await response.json();
        if (data && !data.erro) {
          update('enderecoRetirada', data.logradouro || '');
          update('origemCidade', data.localidade || '');
          update('origemEstado', data.uf || '');
          // Foca o número imediatamente
          setTimeout(() => {
            numeroRetiradaRef.current?.focus();
          }, 150);
        } else {
          // Se CEP não encontrado, não bloqueia, deixa digitar manual
          Alert.alert('Aviso', 'CEP de Coleta não localizado. Você pode preencher os campos manualmente.');
        }
      } catch (error) {
        console.warn('Erro ao buscar CEP:', error);
      } finally {
        setLoadingCEPColeta(false);
      }
    }
  };

  const handleCEPEntregaChange = async (text: string) => {
    const formatted = formatCEP(text);
    update('cepEntrega', formatted);

    const cleaned = formatted.replace('-', '');
    if (cleaned.length === 8) {
      setLoadingCEPEntrega(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await response.json();
        if (data && !data.erro) {
          update('enderecoEntrega', data.logradouro || '');
          update('destinoCidade', data.localidade || '');
          update('destinoEstado', data.uf || '');
          // Foca o número imediatamente
          setTimeout(() => {
            numeroEntregaRef.current?.focus();
          }, 150);
        } else {
          Alert.alert('Aviso', 'CEP de Entrega não localizado. Você pode preencher os campos manualmente.');
        }
      } catch (error) {
        console.warn('Erro ao buscar CEP:', error);
      } finally {
        setLoadingCEPEntrega(false);
      }
    }
  };

  // Validações por etapa
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.cepRetirada.trim()) e.cepRetirada = 'CEP é obrigatório';
    if (!form.enderecoRetirada.trim()) e.enderecoRetirada = 'Endereço é obrigatório';
    if (!form.numeroRetirada.trim()) e.numeroRetirada = 'Número é obrigatório';
    if (!form.origemCidade.trim()) e.origemCidade = 'Cidade é obrigatória';
    if (!form.origemEstado.trim()) e.origemEstado = 'UF é obrigatória';

    if (!form.cepEntrega.trim()) e.cepEntrega = 'CEP é obrigatório';
    if (!form.enderecoEntrega.trim()) e.enderecoEntrega = 'Endereço é obrigatório';
    if (!form.numeroEntrega.trim()) e.numeroEntrega = 'Número é obrigatório';
    if (!form.destinoCidade.trim()) e.destinoCidade = 'Cidade é obrigatória';
    if (!form.destinoEstado.trim()) e.destinoEstado = 'UF é obrigatória';

    setErrors(e);
    if (Object.keys(e).length > 0) {
      Alert.alert('Campos Pendentes', 'Por favor, preencha todos os campos obrigatórios da rota.');
    }
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.peso.trim()) e.peso = 'Peso é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!form.dataColeta.trim()) e.dataColeta = 'Selecione a data de coleta';
    if (!form.prazoEntrega.trim()) e.prazoEntrega = 'Selecione o prazo de entrega';
    if (!form.tipoVeiculo) e.tipoVeiculo = 'Selecione o veículo ideal';
    if (!form.valorFrete.trim()) e.valorFrete = 'Insira o valor do frete';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep3() || !user) return;

    if (!permissions.canPublishFreight) {
      Alert.alert(
        'Plano necessário',
        'Seu plano atual não permite publicar fretes. Escolha um plano para empresas.'
      );
      return;
    }

    if (!permissions.hasUnlimitedFreights) {
      const limiteCheck = await FretesService.verificarLimitePublicacaoEmpresa(user.id);
      if (!limiteCheck.allowed) {
        setLimitPaywall({
          visible: true,
          message: limiteCheck.error || 'Voce atingiu o limite de publicacoes do seu plano. Assine ou faca upgrade para publicar mais fretes.',
        });
        return;
      }
    }

    setLoading(true);

    const dados: CriarFreteData = {
      empresaId: '', // Buscado no service pelo userId
      userId: user.id,
      origemCidade: form.origemCidade.trim(),
      origemEstado: form.origemEstado.trim().toUpperCase(),
      destinoCidade: form.destinoCidade.trim(),
      destinoEstado: form.destinoEstado.trim().toUpperCase(),
      enderecoRetirada: form.enderecoRetirada.trim(),
      cepRetirada: form.cepRetirada.trim(),
      numeroRetirada: form.numeroRetirada.trim(),
      complementoRetirada: form.complementoRetirada.trim() || undefined,
      enderecoEntrega: form.enderecoEntrega.trim(),
      cepEntrega: form.cepEntrega.trim(),
      numeroEntrega: form.numeroEntrega.trim(),
      complementoEntrega: form.complementoEntrega.trim() || undefined,
      volume: form.volume.trim() || undefined,
      dimensao: form.dimensao.trim() || undefined,
      peso: parseFloat(form.peso),
      dataColeta: form.dataColeta.trim(),
      prazoEntrega: form.prazoEntrega.trim(),
      tipoVeiculo: form.tipoVeiculo,
      valorFrete: parseFloat(form.valorFrete),
      pedagogioIncluso: pedagio,
    };

    const result = await FretesService.criarFrete(user.id, dados);
    setLoading(false);

    if (result.success) {
      await loadPublishLimit();
      Alert.alert('🎉 Sucesso!', 'Seu frete foi cadastrado e já está visível para motoristas na plataforma!', [
        { text: 'Ótimo', onPress: () => router.back() }
      ]);
    } else {
      const errorMessage = result.error || 'Nao foi possivel cadastrar o frete.';
      const lowerError = errorMessage.toLowerCase();
      if (lowerError.includes('limite') || lowerError.includes('plano') || lowerError.includes('publica')) {
        setLimitPaywall({
          visible: true,
          message: errorMessage,
        });
      } else {
        Alert.alert('Erro', errorMessage);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header Visual Premium */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => step > 1 ? setStep(step - 1) : router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Novo Frete</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>Crie e publique cargas para motoristas autônomos</Text>
          {limitLabel ? (
            <View style={styles.limitBanner}>
              <Ionicons name="information-circle" size={18} color={COLORS.primary} />
              <Text style={styles.limitBannerText}>{limitLabel}</Text>
            </View>
          ) : null}
          {isTrialActive ? (
            <Text style={styles.trialHint}>
              Período de teste: até {TRIAL_DURATION_DAYS} dias e limite de publicações do plano gratuito.
            </Text>
          ) : null}

          {/* Indicador de Progresso Premium com Linha Conectora */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLine} />
            <View style={[
              styles.progressLineActive,
              { width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }
            ]} />
            
            {[1, 2, 3].map(s => (
              <TouchableOpacity
                key={s}
                style={styles.progressStep}
                disabled={s > step}
                onPress={() => setStep(s)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.stepDot,
                  s < step && styles.stepDotCompleted,
                  s === step && styles.stepDotActive
                ]}>
                  {s < step ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text style={[
                      styles.stepNum,
                      s === step && styles.stepNumActive
                    ]}>{s}</Text>
                  )}
                </View>
                <Text style={[
                  styles.stepLabel,
                  s === step && styles.stepLabelActive
                ]}>
                  {s === 1 ? 'Endereços' : s === 2 ? 'Carga' : 'Preço & Veículo'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Formulário */}
        <View style={styles.card}>
          {/* ETAPA 1: ENDEREÇOS E ROTA */}
          {step === 1 && (
            <View style={styles.stepFade}>
              {/* Timeline da Rota */}
              <View style={styles.timelineContainer}>
                {/* Linha vertical que liga coleta à entrega */}
                <View style={styles.routeVerticalLine} />

                {/* Card de Coleta (Origem) */}
                <View style={styles.routeCard}>
                  <View style={styles.routeBadgeRow}>
                    <View style={[styles.routeBadge, { backgroundColor: '#E2FBE9' }]}>
                      <Ionicons name="location" size={18} color="#10B981" />
                    </View>
                    <Text style={styles.routeCardTitle}>1. Ponto de Coleta (Origem)</Text>
                  </View>

                  <View style={styles.routeCardBody}>
                    <Input
                      label="CEP de Coleta"
                      placeholder="00000-000"
                      value={form.cepRetirada}
                      onChangeText={handleCEPColetaChange}
                      error={errors.cepRetirada}
                      keyboardType="numeric"
                      maxLength={9}
                      required
                      icon={loadingCEPColeta ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="search-outline" size={18} color={COLORS.textTertiary} />}
                    />

                    <Input
                      label="Endereço de Coleta"
                      placeholder="Av. Paulista, Rua das Flores..."
                      value={form.enderecoRetirada}
                      onChangeText={v => update('enderecoRetirada', v)}
                      error={errors.enderecoRetirada}
                      required
                    />

                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Input
                          ref={numeroRetiradaRef}
                          label="Número"
                          placeholder="Ex: 123"
                          value={form.numeroRetirada}
                          onChangeText={v => update('numeroRetirada', v)}
                          error={errors.numeroRetirada}
                          keyboardType="numeric"
                          required
                        />
                      </View>
                      <View style={{ flex: 1.5, marginLeft: SPACING.md }}>
                        <Input
                          label="Complemento"
                          placeholder="Ex: Sala 4 (opcional)"
                          value={form.complementoRetirada}
                          onChangeText={v => update('complementoRetirada', v)}
                        />
                      </View>
                    </View>

                    <Input
                      label="Cidade de Coleta"
                      placeholder="Ex: São Paulo"
                      value={form.origemCidade}
                      onChangeText={v => update('origemCidade', v)}
                      error={errors.origemCidade}
                      required
                    />

                    <Input
                      label="Estado (UF) de Coleta"
                      placeholder="Ex: SP"
                      value={form.origemEstado}
                      onChangeText={v => update('origemEstado', v.toUpperCase())}
                      error={errors.origemEstado}
                      autoCapitalize="characters"
                      maxLength={2}
                      required
                    />
                  </View>
                </View>

                {/* Card de Entrega (Destino) */}
                <View style={[styles.routeCard, { marginTop: 24 }]}>
                  <View style={styles.routeBadgeRow}>
                    <View style={[styles.routeBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="flag" size={18} color="#EF4444" />
                    </View>
                    <Text style={styles.routeCardTitle}>2. Ponto de Entrega (Destino)</Text>
                  </View>

                  <View style={styles.routeCardBody}>
                    <Input
                      label="CEP de Entrega"
                      placeholder="00000-000"
                      value={form.cepEntrega}
                      onChangeText={handleCEPEntregaChange}
                      error={errors.cepEntrega}
                      keyboardType="numeric"
                      maxLength={9}
                      required
                      icon={loadingCEPEntrega ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="search-outline" size={18} color={COLORS.textTertiary} />}
                    />

                    <Input
                      label="Endereço de Entrega"
                      placeholder="Rua da Consolação, Rodovia..."
                      value={form.enderecoEntrega}
                      onChangeText={v => update('enderecoEntrega', v)}
                      error={errors.enderecoEntrega}
                      required
                    />

                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Input
                          ref={numeroEntregaRef}
                          label="Número"
                          placeholder="Ex: 456"
                          value={form.numeroEntrega}
                          onChangeText={v => update('numeroEntrega', v)}
                          error={errors.numeroEntrega}
                          keyboardType="numeric"
                          required
                        />
                      </View>
                      <View style={{ flex: 1.5, marginLeft: SPACING.md }}>
                        <Input
                          label="Complemento"
                          placeholder="Ex: Galpão 3 (opcional)"
                          value={form.complementoEntrega}
                          onChangeText={v => update('complementoEntrega', v)}
                        />
                      </View>
                    </View>

                    <Input
                      label="Cidade de Entrega"
                      placeholder="Ex: Rio de Janeiro"
                      value={form.destinoCidade}
                      onChangeText={v => update('destinoCidade', v)}
                      error={errors.destinoCidade}
                      required
                    />

                    <Input
                      label="Estado (UF) de Entrega"
                      placeholder="Ex: RJ"
                      value={form.destinoEstado}
                      onChangeText={v => update('destinoEstado', v.toUpperCase())}
                      error={errors.destinoEstado}
                      autoCapitalize="characters"
                      maxLength={2}
                      required
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ETAPA 2: DETALHES DA CARGA */}
          {step === 2 && (
            <View style={styles.stepFade}>
              <View style={styles.floatingCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="cube-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Detalhes da Carga</Text>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Peso Total (kg)"
                      placeholder="Ex: 1500"
                      value={form.peso}
                      onChangeText={v => update('peso', v)}
                      error={errors.peso}
                      keyboardType="numeric"
                      required
                      icon={<Ionicons name="speedometer-outline" size={18} color={COLORS.textSecondary} />}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Input
                      label="Volume total"
                      placeholder="Ex: 12 m³"
                      value={form.volume}
                      onChangeText={v => update('volume', v)}
                      icon={<Ionicons name="resize-outline" size={18} color={COLORS.textSecondary} />}
                    />
                  </View>
                </View>

                <Input
                  label="Dimensões (Comprimento x Largura x Altura)"
                  placeholder="Ex: 4.5 x 2.2 x 2.0 metros (opcional)"
                  value={form.dimensao}
                  onChangeText={v => update('dimensao', v)}
                  icon={<Ionicons name="apps-outline" size={18} color={COLORS.textSecondary} />}
                />

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color={COLORS.info} />
                  <Text style={styles.infoBoxText}>
                    Fornecer o peso e volume corretos ajuda a atrair o tipo de caminhão ideal para o transporte, otimizando o frete.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ETAPA 3: VEÍCULO E VALOR */}
          {step === 3 && (
            <View style={styles.stepFade}>
              {/* Calendários Premium em Card Flutuante */}
              <View style={styles.floatingCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Agendamento da Viagem</Text>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerLabel}>Data de Coleta *</Text>
                    <TouchableOpacity
                      style={[styles.dateSelector, errors.dataColeta ? styles.dateSelectorError : undefined]}
                      onPress={() => setShowColetaPicker(true)}
                    >
                      <Ionicons name="calendar" size={18} color={COLORS.primary} />
                      <Text style={styles.dateSelectorText}>
                        {form.dataColeta
                          ? new Date(form.dataColeta + 'T12:00:00Z').toLocaleDateString('pt-BR')
                          : 'Selecionar...'}
                      </Text>
                    </TouchableOpacity>

                    {showColetaPicker && (
                      <DateTimePicker
                        value={form.dataColeta ? new Date(form.dataColeta + 'T12:00:00Z') : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowColetaPicker(false);
                          if (selectedDate) {
                            update('dataColeta', selectedDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Text style={styles.pickerLabel}>Prazo de Entrega *</Text>
                    <TouchableOpacity
                      style={[styles.dateSelector, errors.prazoEntrega ? styles.dateSelectorError : undefined]}
                      onPress={() => setShowPrazoPicker(true)}
                    >
                      <Ionicons name="time" size={18} color={COLORS.accent} />
                      <Text style={styles.dateSelectorText}>
                        {form.prazoEntrega
                          ? new Date(form.prazoEntrega + 'T12:00:00Z').toLocaleDateString('pt-BR')
                          : 'Selecionar...'}
                      </Text>
                    </TouchableOpacity>

                    {showPrazoPicker && (
                      <DateTimePicker
                        value={form.prazoEntrega ? new Date(form.prazoEntrega + 'T12:00:00Z') : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowPrazoPicker(false);
                          if (selectedDate) {
                            update('prazoEntrega', selectedDate.toISOString().split('T')[0]);
                          }
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Seletor Visual de Veículos (Fora de card flutuante para ganhar largura máxima) */}
              <View style={[styles.sectionHeaderRow, { marginTop: 12, paddingHorizontal: SPACING.xs }]}>
                <Ionicons name="car-sport-outline" size={22} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Selecione o Tipo de Veículo *</Text>
              </View>

              {/* Tabs de Categoria dos Veículos */}
              <View style={styles.veiculoTabs}>
                <TouchableOpacity
                  style={[styles.veiculoTab, veiculoCategoria === 'leves' && styles.veiculoTabActive]}
                  onPress={() => setVeiculoCategoria('leves')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="car-outline" size={16} color={veiculoCategoria === 'leves' ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[styles.veiculoTabText, veiculoCategoria === 'leves' && styles.veiculoTabTextActive]}>Leves</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.veiculoTab, veiculoCategoria === 'medios' && styles.veiculoTabActive]}
                  onPress={() => setVeiculoCategoria('medios')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cube-outline" size={16} color={veiculoCategoria === 'medios' ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[styles.veiculoTabText, veiculoCategoria === 'medios' && styles.veiculoTabTextActive]}>Médios</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.veiculoTab, veiculoCategoria === 'pesados' && styles.veiculoTabActive]}
                  onPress={() => setVeiculoCategoria('pesados')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trail-sign-outline" size={16} color={veiculoCategoria === 'pesados' ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[styles.veiculoTabText, veiculoCategoria === 'pesados' && styles.veiculoTabTextActive]}>Pesados</Text>
                </TouchableOpacity>
              </View>

              {form.tipoVeiculo ? (
                <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, marginHorizontal: SPACING.xs, fontWeight: '600' }}>
                  Veículo Selecionado: <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{form.tipoVeiculo}</Text>
                </Text>
              ) : null}

              <View style={styles.gridContainer}>
                {veiculosFiltrados.map(v => {
                  const isActive = form.tipoVeiculo === v.name;
                  return (
                    <TouchableOpacity
                      key={v.name}
                      style={[styles.gridCard, isActive && styles.gridCardActive]}
                      onPress={() => update('tipoVeiculo', v.name)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.gridIconCircle, isActive && styles.gridIconCircleActive]}>
                        <Ionicons
                          name={v.icon as any}
                          size={24}
                          color={isActive ? '#fff' : COLORS.textSecondary}
                        />
                      </View>
                      <Text style={[styles.gridText, isActive && styles.gridTextActive]}>
                        {v.name}
                      </Text>
                      {isActive && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.tipoVeiculo && <Text style={styles.gridErrorText}>{errors.tipoVeiculo}</Text>}

              {/* Precificação e Pagamento em Card Flutuante */}
              <View style={[styles.floatingCard, { marginTop: 28 }]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="cash-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Precificação e Pagamento</Text>
                </View>

                <View style={styles.priceHighlightBox}>
                  <Text style={styles.priceLabel}>Valor Líquido do Frete</Text>
                  <View style={styles.priceInputRow}>
                    <Text style={styles.priceSymbol}>R$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0,00"
                      placeholderTextColor={COLORS.textTertiary}
                      keyboardType="decimal-pad"
                      value={form.valorFrete}
                      onChangeText={v => update('valorFrete', v)}
                    />
                  </View>
                  {errors.valorFrete && <Text style={styles.priceError}>{errors.valorFrete}</Text>}

                  {/* Pedágio Switch */}
                  <View style={styles.switchContainer}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>Pedágio Incluso</Text>
                      <Text style={styles.switchDesc}>Indica se o pedágio já está somado no valor ofertado</Text>
                    </View>
                    <Switch
                      value={pedagio}
                      onValueChange={setPedagio}
                      trackColor={{ false: '#CBD5E1', true: COLORS.primaryLight }}
                      thumbColor={pedagio ? COLORS.primary : '#F1F5F9'}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Botões de Navegação e Envio */}
          <View style={styles.buttonRow}>
            {step < 3 ? (
              <Button
                title="Próximo Passo"
                onPress={handleNext}
                size="lg"
                variant="secondary"
              />
            ) : (
              <Button
                title={loading ? 'Publicando...' : 'Publicar Frete'}
                onPress={handleSubmit}
                loading={loading}
                size="lg"
                variant="secondary"
              />
            )}
          </View>
        </View>
      </ScrollView>
      <PaywallModal
        visible={limitPaywall.visible}
        onClose={() => setLimitPaywall(prev => ({ ...prev, visible: false }))}
        title="Limite atingido"
        message={limitPaywall.message}
        benefits={[
          'Mais publicacoes de frete',
          'Limites maiores por mes',
          'Gestao avancada da operacao',
          'Suporte prioritario',
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 60 },

  // Header Section
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  limitBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  trialHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
  },

  // Indicador de Progresso Premium
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    position: 'relative',
    height: 60,
  },
  progressLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    zIndex: 1,
  },
  progressLineActive: {
    position: 'absolute',
    left: 20,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    zIndex: 2,
  },
  progressStep: {
    alignItems: 'center',
    zIndex: 3,
    width: 80,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...SHADOWS.sm,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryFaded,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.successLight,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  stepNumActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Main Card container (acts as layout boundary now)
  card: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    backgroundColor: 'transparent',
  },

  // Premium Floating Card for generic steps
  floatingCard: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
    marginBottom: SPACING.lg,
  },

  // Fade animations placeholders
  stepFade: {},

  // Rota Timeline visual
  timelineContainer: {
    position: 'relative',
  },
  routeVerticalLine: {
    position: 'absolute',
    left: 38, // Alinhado perfeitamente ao centro dos badges (padding 20 + raio 18 = 38)
    top: 60,
    bottom: 60,
    width: 2,
    backgroundColor: COLORS.border,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: 20, // Aumentado para dar mais espaço e conforto visual
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
    zIndex: 2,
  },
  routeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    ...SHADOWS.sm,
  },
  routeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  routeCardBody: {
    paddingLeft: 4,
  },

  // General Form Styles
  row: {
    flexDirection: 'row',
  },

  // Carga Section Info
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginLeft: SPACING.sm,
  },

  // Agendamento Section
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.input,
    borderRadius: BORDER_RADIUS.sm,
    height: 48,
    paddingHorizontal: SPACING.md,
  },
  dateSelectorError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  dateSelectorText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },

  // Seletor Grid de Veículos Premium
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  gridCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F9FF',
  },
  veiculoTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    marginBottom: 16,
    marginHorizontal: SPACING.xs,
  },
  veiculoTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
  },
  veiculoTabActive: {
    backgroundColor: '#fff',
    ...SHADOWS.sm,
  },
  veiculoTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  veiculoTabTextActive: {
    color: COLORS.primary,
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  gridIconCircleActive: {
    backgroundColor: COLORS.primary,
  },
  gridText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  gridTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  gridErrorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: SPACING.xs,
  },

  // Precificação Highlight Box
  priceHighlightBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  priceInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  priceSymbol: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  priceInput: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    width: 200,
    textAlign: 'center',
  },
  priceError: {
    color: COLORS.error,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  // Switch Container
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  switchDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Buttons Layout
  buttonRow: {
    marginTop: SPACING.xl,
  },
});
