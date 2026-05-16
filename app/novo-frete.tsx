/**
 * Novo Frete — formulário completo para empresa criar fretes
 * Campos replicam o CadastroFreteForm do web
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/hooks/useAuth';
import { FretesService, CriarFreteData } from '@/services/fretes.service';
import { Button, Input } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

const TIPOS_VEICULOS = ['Carreta', 'Truck', 'Toco', 'VUC', 'Bitrem', 'Fiorino', '3x4', 'Bitruck', 'Carreta LS', 'Rodotrem', 'Vanderleia', 'Sider'];

export default function NovoFreteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: rota, 2: endereços, 3: carga+valor
  const [pedagogio, setPedagogio] = useState(false);
  const [showColetaPicker, setShowColetaPicker] = useState(false);
  const [showPrazoPicker, setShowPrazoPicker] = useState(false);

  const [form, setForm] = useState({
    origemCidade: '', origemEstado: '', destinoCidade: '', destinoEstado: '',
    enderecoRetirada: '', cepRetirada: '', numeroRetirada: '', complementoRetirada: '',
    enderecoEntrega: '', cepEntrega: '', numeroEntrega: '', complementoEntrega: '',
    volume: '', dimensao: '', peso: '',
    dataColeta: '', prazoEntrega: '',
    tipoVeiculo: '', valorFrete: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.origemCidade.trim()) e.origemCidade = 'Cidade de origem é obrigatória';
    if (!form.origemEstado.trim()) e.origemEstado = 'Estado é obrigatório';
    if (!form.destinoCidade.trim()) e.destinoCidade = 'Cidade de destino é obrigatória';
    if (!form.destinoEstado.trim()) e.destinoEstado = 'Estado é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.enderecoRetirada.trim()) e.enderecoRetirada = 'Endereço é obrigatório';
    if (!form.cepRetirada.trim()) e.cepRetirada = 'CEP é obrigatório';
    if (!form.numeroRetirada.trim()) e.numeroRetirada = 'Número é obrigatório';
    if (!form.enderecoEntrega.trim()) e.enderecoEntrega = 'Endereço é obrigatório';
    if (!form.cepEntrega.trim()) e.cepEntrega = 'CEP é obrigatório';
    if (!form.numeroEntrega.trim()) e.numeroEntrega = 'Número é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!form.peso.trim()) e.peso = 'Peso é obrigatório';
    if (!form.dataColeta.trim()) e.dataColeta = 'Data de coleta é obrigatória';
    if (!form.prazoEntrega.trim()) e.prazoEntrega = 'Prazo é obrigatório';
    if (!form.tipoVeiculo) e.tipoVeiculo = 'Selecione o tipo de veículo';
    if (!form.valorFrete.trim()) e.valorFrete = 'Valor é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep3() || !user) return;
    setLoading(true);

    const dados: CriarFreteData = {
      empresaId: '', // será buscado no service
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
      pedagogioIncluso: pedagogio,
    };

    const result = await FretesService.criarFrete(user.id, dados);
    setLoading(false);

    if (result.success) {
      Alert.alert('Frete cadastrado!', 'Seu frete já está disponível para os motoristas.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Erro', result.error || 'Não foi possível cadastrar o frete.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
            <Text style={styles.backText}>← {step > 1 ? 'Voltar' : 'Cancelar'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Novo Frete</Text>
          <Text style={styles.subtitle}>Preencha os dados do frete para publicar</Text>

          <View style={styles.progressRow}>
            {[1, 2, 3].map(s => (
              <View key={s} style={styles.progressItem}>
                <View style={[styles.progressDot, s <= step && styles.progressDotActive]}>
                  <Text style={[styles.progressNum, s <= step && styles.progressNumActive]}>{s}</Text>
                </View>
                <Text style={[styles.progressLabel, s === step && { color: COLORS.accent, fontWeight: '600' }]}>
                  {s === 1 ? 'Rota' : s === 2 ? 'Endereços' : 'Carga'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {step === 1 && (
            <>
              <Text style={styles.sectionHeader}>Origem</Text>
              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Input label="Cidade" placeholder="São Paulo" value={form.origemCidade} onChangeText={v => update('origemCidade', v)} error={errors.origemCidade} required />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Input label="UF" placeholder="SP" value={form.origemEstado} onChangeText={v => update('origemEstado', v)} error={errors.origemEstado} autoCapitalize="characters" required />
                </View>
              </View>

              <Text style={styles.sectionHeader}>Destino</Text>
              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Input label="Cidade" placeholder="Rio de Janeiro" value={form.destinoCidade} onChangeText={v => update('destinoCidade', v)} error={errors.destinoCidade} required />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Input label="UF" placeholder="RJ" value={form.destinoEstado} onChangeText={v => update('destinoEstado', v)} error={errors.destinoEstado} autoCapitalize="characters" required />
                </View>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.sectionHeader}>Endereço de Retirada</Text>
              <Input label="Endereço" placeholder="Rua, Avenida..." value={form.enderecoRetirada} onChangeText={v => update('enderecoRetirada', v)} error={errors.enderecoRetirada} required />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="CEP" placeholder="00000-000" value={form.cepRetirada} onChangeText={v => update('cepRetirada', v)} error={errors.cepRetirada} keyboardType="numeric" required />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Input label="Número" placeholder="123" value={form.numeroRetirada} onChangeText={v => update('numeroRetirada', v)} error={errors.numeroRetirada} required />
                </View>
              </View>
              <Input label="Complemento" placeholder="Apt, Bloco (opcional)" value={form.complementoRetirada} onChangeText={v => update('complementoRetirada', v)} />

              <Text style={styles.sectionHeader}>Endereço de Entrega</Text>
              <Input label="Endereço" placeholder="Rua, Avenida..." value={form.enderecoEntrega} onChangeText={v => update('enderecoEntrega', v)} error={errors.enderecoEntrega} required />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="CEP" placeholder="00000-000" value={form.cepEntrega} onChangeText={v => update('cepEntrega', v)} error={errors.cepEntrega} keyboardType="numeric" required />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Input label="Número" placeholder="456" value={form.numeroEntrega} onChangeText={v => update('numeroEntrega', v)} error={errors.numeroEntrega} required />
                </View>
              </View>
              <Input label="Complemento" placeholder="Apt, Bloco (opcional)" value={form.complementoEntrega} onChangeText={v => update('complementoEntrega', v)} />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.sectionHeader}>Dados da Carga</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Peso (kg)" placeholder="1500" value={form.peso} onChangeText={v => update('peso', v)} error={errors.peso} keyboardType="numeric" required />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Input label="Volume" placeholder="10 m³ (opcional)" value={form.volume} onChangeText={v => update('volume', v)} />
                </View>
              </View>
              <Input label="Dimensões (CxLxA)" placeholder="2x2x1 metros (opcional)" value={form.dimensao} onChangeText={v => update('dimensao', v)} />

              <Text style={styles.sectionHeader}>Datas</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setShowColetaPicker(true)}>
                    <View pointerEvents="none">
                      <Input label="Data de Coleta" placeholder="Selecione..." value={form.dataColeta ? new Date(form.dataColeta + 'T12:00:00Z').toLocaleDateString('pt-BR') : ''} error={errors.dataColeta} required editable={false} />
                    </View>
                  </TouchableOpacity>
                  {showColetaPicker && (
                    <DateTimePicker
                      value={form.dataColeta ? new Date(form.dataColeta + 'T12:00:00Z') : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowColetaPicker(false);
                        if (selectedDate) update('dataColeta', selectedDate.toISOString().split('T')[0]);
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <TouchableOpacity onPress={() => setShowPrazoPicker(true)}>
                    <View pointerEvents="none">
                      <Input label="Prazo de Entrega" placeholder="Selecione..." value={form.prazoEntrega ? new Date(form.prazoEntrega + 'T12:00:00Z').toLocaleDateString('pt-BR') : ''} error={errors.prazoEntrega} required editable={false} />
                    </View>
                  </TouchableOpacity>
                  {showPrazoPicker && (
                    <DateTimePicker
                      value={form.prazoEntrega ? new Date(form.prazoEntrega + 'T12:00:00Z') : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowPrazoPicker(false);
                        if (selectedDate) update('prazoEntrega', selectedDate.toISOString().split('T')[0]);
                      }}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.sectionHeader}>Veículo e Valor</Text>
              <Text style={styles.fieldLabel}>Tipo de Veículo <Text style={{ color: COLORS.error }}>*</Text></Text>
              <View style={styles.optionsGrid}>
                {TIPOS_VEICULOS.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, form.tipoVeiculo === t && styles.chipActive]} onPress={() => update('tipoVeiculo', t)}>
                    <Text style={[styles.chipText, form.tipoVeiculo === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.tipoVeiculo ? <Text style={styles.fieldError}>{errors.tipoVeiculo}</Text> : null}

              <Input label="Valor do Frete (R$)" placeholder="2500.00" value={form.valorFrete} onChangeText={v => update('valorFrete', v)} error={errors.valorFrete} keyboardType="decimal-pad" required />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Pedágio incluso no valor</Text>
                <Switch
                  value={pedagogio}
                  onValueChange={setPedagogio}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryFaded }}
                  thumbColor={pedagogio ? COLORS.primary : COLORS.surfaceVariant}
                />
              </View>
            </>
          )}

          {/* Botões */}
          {step < 3 ? (
            <Button title="Próximo" onPress={handleNext} size="lg" variant="secondary" />
          ) : (
            <Button title={loading ? 'Publicando...' : 'Publicar Frete'} onPress={handleSubmit} loading={loading} size="lg" variant="secondary" />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },

  header: { padding: SPACING.lg, alignItems: 'center' },
  backText: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: '500', alignSelf: 'flex-start', marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },

  progressRow: { flexDirection: 'row', marginTop: SPACING.lg, gap: SPACING.xl },
  progressItem: { alignItems: 'center' },
  progressDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  progressDotActive: { backgroundColor: COLORS.accent },
  progressNum: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textTertiary },
  progressNumActive: { color: COLORS.textPrimary },
  progressLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: 4 },

  formCard: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, ...SHADOWS.md,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.textPrimary,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  row: { flexDirection: 'row' },

  fieldLabel: { fontSize: FONT_SIZES.sm, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 6, marginTop: SPACING.sm },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentFaded },
  chipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.accent, fontWeight: '600' },
  fieldError: { color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: 2, marginBottom: SPACING.sm },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.md, marginBottom: SPACING.md,
  },
  switchLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: '500' },
});
