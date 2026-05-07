/**
 * Cadastro de Empresa — todas as seções do web
 * Seções: Dados da Empresa, Endereço, Contato, Acesso, Responsável
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { EmpresasService } from '@/services';
import { Button, Input } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function CadastroEmpresaScreen() {
  const router = useRouter();
  const { signUp, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: empresa, 2: contato+acesso

  const [form, setForm] = useState({
    nomeEmpresa: '', cnpj: '', endereco: '', cep: '',
    cidade: '', estado: '', email: '', telefone: '',
    nomeResponsavel: '', cargo: '', senha: '', confirmarSenha: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.nomeEmpresa.trim()) e.nomeEmpresa = 'Nome da empresa é obrigatório';
    if (!form.cnpj.trim()) e.cnpj = 'CNPJ é obrigatório';
    if (!form.endereco.trim()) e.endereco = 'Endereço é obrigatório';
    if (!form.cep.trim()) e.cep = 'CEP é obrigatório';
    if (!form.cidade.trim()) e.cidade = 'Cidade é obrigatória';
    if (!form.estado.trim()) e.estado = 'Estado é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = 'E-mail é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido';
    if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório';
    if (!form.nomeResponsavel.trim()) e.nomeResponsavel = 'Nome do responsável é obrigatório';
    if (!form.cargo.trim()) e.cargo = 'Cargo é obrigatório';
    if (!form.senha) e.senha = 'Senha é obrigatória';
    else if (form.senha.length < 6) e.senha = 'Mínimo 6 caracteres';
    if (form.senha !== form.confirmarSenha) e.confirmarSenha = 'Senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);

    const authResult = await signUp(form.email.trim(), form.senha);
    if (!authResult.success || !authResult.userId) {
      Alert.alert('Erro', authResult.error || 'Não foi possível criar a conta.');
      setLoading(false);
      return;
    }

    const empResult = await EmpresasService.cadastrar({
      userId: authResult.userId,
      nomeEmpresa: form.nomeEmpresa.trim(),
      cnpj: form.cnpj.trim(),
      endereco: form.endereco.trim(),
      cep: form.cep.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim().toUpperCase(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      nomeResponsavel: form.nomeResponsavel.trim(),
      cargo: form.cargo.trim(),
    });

    setLoading(false);

    if (empResult.success) {
      Alert.alert('Cadastro realizado!', 'Verifique seu email para confirmar a conta. Sua empresa será analisada pela equipe.', [
        { text: 'OK', onPress: () => { refreshProfile(); router.replace('/(auth)/login'); } }
      ]);
    } else {
      Alert.alert('Conta criada', 'Sua conta foi criada, mas houve um problema ao salvar os dados da empresa. Complete o cadastro após o login.');
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
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>E</Text>
          </View>
          <Text style={styles.title}>Cadastro de Empresa</Text>
          <Text style={styles.subtitle}>Cadastre sua empresa e comece a encontrar motoristas</Text>

          <View style={styles.progressRow}>
            {[1, 2].map(s => (
              <View key={s} style={[styles.progressDot, s <= step && styles.progressDotActive]}>
                <Text style={[styles.progressNum, s <= step && styles.progressNumActive]}>{s}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.stepLabel}>
            {step === 1 ? 'Dados da Empresa' : 'Contato e Acesso'}
          </Text>
        </View>

        {/* Formulário */}
        <View style={styles.formCard}>
          {step === 1 && (
            <>
              <Text style={styles.sectionHeader}>Dados da Empresa</Text>
              <Input label="Nome da Empresa" placeholder="Razão social" value={form.nomeEmpresa} onChangeText={v => update('nomeEmpresa', v)} error={errors.nomeEmpresa} required />
              <Input label="CNPJ" placeholder="00.000.000/0000-00" value={form.cnpj} onChangeText={v => update('cnpj', v)} error={errors.cnpj} keyboardType="numeric" required />

              <Text style={styles.sectionHeader}>Endereço</Text>
              <Input label="Endereço" placeholder="Rua, número, bairro" value={form.endereco} onChangeText={v => update('endereco', v)} error={errors.endereco} required />
              <Input label="CEP" placeholder="00000-000" value={form.cep} onChangeText={v => update('cep', v)} error={errors.cep} keyboardType="numeric" required />
              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Input label="Cidade" placeholder="Cidade" value={form.cidade} onChangeText={v => update('cidade', v)} error={errors.cidade} required />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Input label="UF" placeholder="SP" value={form.estado} onChangeText={v => update('estado', v)} error={errors.estado} autoCapitalize="characters" required />
                </View>
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.sectionHeader}>Dados de Contato</Text>
              <Input label="E-mail" placeholder="contato@empresa.com" value={form.email} onChangeText={v => update('email', v)} error={errors.email} keyboardType="email-address" required />
              <Input label="Telefone" placeholder="(11) 99999-9999" value={form.telefone} onChangeText={v => update('telefone', v)} error={errors.telefone} keyboardType="phone-pad" required />

              <Text style={styles.sectionHeader}>Dados de Acesso</Text>
              <Input label="Senha" placeholder="Mínimo 6 caracteres" value={form.senha} onChangeText={v => update('senha', v)} error={errors.senha} isPassword required />
              <Input label="Confirmar Senha" placeholder="Repita a senha" value={form.confirmarSenha} onChangeText={v => update('confirmarSenha', v)} error={errors.confirmarSenha} isPassword required />

              <Text style={styles.sectionHeader}>Responsável pelo Cadastro</Text>
              <Input label="Nome Completo" placeholder="Nome do responsável" value={form.nomeResponsavel} onChangeText={v => update('nomeResponsavel', v)} error={errors.nomeResponsavel} required />
              <Input label="Cargo" placeholder="Cargo na empresa" value={form.cargo} onChangeText={v => update('cargo', v)} error={errors.cargo} required />
            </>
          )}

          {step < 2 ? (
            <Button title="Próximo" onPress={handleNext} size="lg" variant="secondary" />
          ) : (
            <Button title={loading ? 'Cadastrando...' : 'Cadastrar Empresa'} onPress={handleSubmit} loading={loading} size="lg" variant="secondary" />
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
  headerIcon: {
    width: 48, height: 48, borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.accentFaded, justifyContent: 'center', alignItems: 'center',
  },
  headerIconText: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.accent },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary, marginTop: SPACING.sm },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },

  progressRow: { flexDirection: 'row', marginTop: SPACING.lg, gap: SPACING.md },
  progressDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  progressDotActive: { backgroundColor: COLORS.accent },
  progressNum: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textTertiary },
  progressNumActive: { color: COLORS.textPrimary },
  stepLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.sm },

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
});
