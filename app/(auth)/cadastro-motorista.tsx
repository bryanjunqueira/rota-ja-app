/**
 * Cadastro de Motorista — todos os campos do web
 * Campos: nome, endereço, CEP, email, senha, confirmar senha,
 *         celular, CNH, placa, tipo veículo, tipo carroceria
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { MotoristasService } from '@/services';
import { Button, Input } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

const TIPOS_VEICULOS = {
  pesados: ['Bitrem', 'Carreta', 'Carreta LS', 'Rodotrem', 'Vanderleia'],
  medios: ['Bitruck', 'Truck'],
  leves: ['3x4', 'Fiorino', 'Toco'],
};

const TIPOS_CARROCERIA = {
  fechadas: ['Baú', 'Baú Frigorífico', 'Baú Refrigerado', 'Sider'],
  abertas: ['Caçamba Grade Baixa', 'Graneleiro', 'Plataforma', 'Prancha'],
};

export default function CadastroMotoristaScreen() {
  const router = useRouter();
  const { signUp, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: dados pessoais, 2: veículo, 3: acesso

  // Form state
  const [form, setForm] = useState({
    nomeCompleto: '', endereco: '', cep: '', celular: '', cnh: '',
    placaVeiculo: '', tipoVeiculo: '', tipoCarroceria: '',
    email: '', senha: '', confirmarSenha: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.nomeCompleto.trim()) e.nomeCompleto = 'Nome completo é obrigatório';
    if (!form.endereco.trim()) e.endereco = 'Endereço é obrigatório';
    if (!form.cep.trim()) e.cep = 'CEP é obrigatório';
    if (!form.celular.trim()) e.celular = 'Celular é obrigatório';
    if (!form.cnh.trim()) e.cnh = 'CNH é obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.placaVeiculo.trim()) e.placaVeiculo = 'Placa é obrigatória';
    if (!form.tipoVeiculo) e.tipoVeiculo = 'Selecione o tipo de veículo';
    if (!form.tipoCarroceria) e.tipoCarroceria = 'Selecione o tipo de carroceria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido';
    if (!form.senha) e.senha = 'Senha é obrigatória';
    else if (form.senha.length < 6) e.senha = 'Mínimo 6 caracteres';
    if (form.senha !== form.confirmarSenha) e.confirmarSenha = 'Senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setLoading(true);

    // 1. Criar conta
    const authResult = await signUp(form.email.trim(), form.senha);
    if (!authResult.success || !authResult.userId) {
      Alert.alert('Erro', authResult.error || 'Não foi possível criar a conta.');
      setLoading(false);
      return;
    }

    // 2. Salvar perfil do motorista
    const motResult = await MotoristasService.cadastrar({
      userId: authResult.userId,
      nomeCompleto: form.nomeCompleto.trim(),
      endereco: form.endereco.trim(),
      cep: form.cep.trim(),
      email: form.email.trim(),
      celular: form.celular.trim(),
      cnh: form.cnh.trim(),
      placaVeiculo: form.placaVeiculo.trim().toUpperCase(),
      tipoVeiculo: form.tipoVeiculo,
      tipoCarroceria: form.tipoCarroceria,
    });

    setLoading(false);

    if (motResult.success) {
      Alert.alert('Cadastro realizado!', 'Verifique seu email para confirmar a conta.', [
        { text: 'OK', onPress: () => { refreshProfile(); router.replace('/(auth)/login'); } }
      ]);
    } else {
      Alert.alert('Conta criada', 'Sua conta foi criada, mas houve um problema ao salvar o perfil. Tente completar o cadastro após fazer login.');
      router.replace('/(auth)/login');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {step > 1 ? 'Voltar' : 'Login'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Cadastro de Motorista</Text>
          <Text style={styles.subtitle}>Preencha seus dados para criar sua conta no Rota Já</Text>

          {/* Progress */}
          <View style={styles.progressRow}>
            {[1, 2, 3].map(s => (
              <View key={s} style={[styles.progressDot, s <= step && styles.progressDotActive]}>
                <Text style={[styles.progressText, s <= step && styles.progressTextActive]}>{s}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.stepLabel}>
            {step === 1 ? 'Dados Pessoais' : step === 2 ? 'Dados do Veículo' : 'Dados de Acesso'}
          </Text>
        </View>

        {/* Formulário */}
        <View style={styles.formCard}>
          {step === 1 && (
            <>
              <Input label="Nome Completo" placeholder="Seu nome completo" value={form.nomeCompleto} onChangeText={v => update('nomeCompleto', v)} error={errors.nomeCompleto} required />
              <Input label="Endereço" placeholder="Rua, número, bairro" value={form.endereco} onChangeText={v => update('endereco', v)} error={errors.endereco} required />
              <Input label="CEP" placeholder="00000-000" value={form.cep} onChangeText={v => update('cep', v)} error={errors.cep} keyboardType="numeric" required />
              <Input label="Celular" placeholder="(11) 99999-9999" value={form.celular} onChangeText={v => update('celular', v)} error={errors.celular} keyboardType="phone-pad" required />
              <Input label="CNH" placeholder="Número da CNH" value={form.cnh} onChangeText={v => update('cnh', v)} error={errors.cnh} keyboardType="numeric" required />
            </>
          )}

          {step === 2 && (
            <>
              <Input label="Placa do Veículo" placeholder="ABC-1234 ou ABC1D23" value={form.placaVeiculo} onChangeText={v => update('placaVeiculo', v)} error={errors.placaVeiculo} autoCapitalize="characters" required />

              {/* Tipo de veículo */}
              <Text style={styles.fieldLabel}>Tipo do Veículo <Text style={{ color: COLORS.error }}>*</Text></Text>
              {Object.entries(TIPOS_VEICULOS).map(([cat, tipos]) => (
                <View key={cat}>
                  <Text style={styles.categoryLabel}>{cat === 'pesados' ? 'Pesados' : cat === 'medios' ? 'Médios' : 'Leves'}</Text>
                  <View style={styles.optionsGrid}>
                    {tipos.map(t => (
                      <TouchableOpacity key={t} style={[styles.optionChip, form.tipoVeiculo === t && styles.optionChipActive]} onPress={() => update('tipoVeiculo', t)}>
                        <Text style={[styles.optionText, form.tipoVeiculo === t && styles.optionTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {errors.tipoVeiculo ? <Text style={styles.fieldError}>{errors.tipoVeiculo}</Text> : null}

              {/* Tipo de carroceria */}
              <Text style={[styles.fieldLabel, { marginTop: SPACING.lg }]}>Tipo de Carroceria <Text style={{ color: COLORS.error }}>*</Text></Text>
              {Object.entries(TIPOS_CARROCERIA).map(([cat, tipos]) => (
                <View key={cat}>
                  <Text style={styles.categoryLabel}>{cat === 'fechadas' ? 'Fechadas' : 'Abertas'}</Text>
                  <View style={styles.optionsGrid}>
                    {tipos.map(t => (
                      <TouchableOpacity key={t} style={[styles.optionChip, form.tipoCarroceria === t && styles.optionChipActive]} onPress={() => update('tipoCarroceria', t)}>
                        <Text style={[styles.optionText, form.tipoCarroceria === t && styles.optionTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {errors.tipoCarroceria ? <Text style={styles.fieldError}>{errors.tipoCarroceria}</Text> : null}
            </>
          )}

          {step === 3 && (
            <>
              <Input label="E-mail" placeholder="seu@email.com" value={form.email} onChangeText={v => update('email', v)} error={errors.email} keyboardType="email-address" required />
              <Input label="Senha" placeholder="Mínimo 6 caracteres" value={form.senha} onChangeText={v => update('senha', v)} error={errors.senha} isPassword required />
              <Input label="Confirmar Senha" placeholder="Repita a senha" value={form.confirmarSenha} onChangeText={v => update('confirmarSenha', v)} error={errors.confirmarSenha} isPassword required />
            </>
          )}

          {/* Botões */}
          {step < 3 ? (
            <Button title="Próximo" onPress={handleNext} size="lg" />
          ) : (
            <Button title={loading ? 'Cadastrando...' : 'Criar Conta'} onPress={handleSubmit} loading={loading} size="lg" />
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
  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.md },
  backText: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: '500' },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },

  progressRow: { flexDirection: 'row', marginTop: SPACING.lg, gap: SPACING.md },
  progressDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textTertiary },
  progressTextActive: { color: COLORS.white },
  stepLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.sm },

  formCard: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, ...SHADOWS.md,
  },

  fieldLabel: { fontSize: FONT_SIZES.sm, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 6 },
  categoryLabel: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: COLORS.textTertiary, marginTop: SPACING.sm, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  optionChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  optionText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  optionTextActive: { color: COLORS.primary, fontWeight: '600' },
  fieldError: { color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: 4 },
});
