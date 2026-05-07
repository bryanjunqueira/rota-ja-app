/**
 * Tela de Login — sem emojis genéricos, visual limpo
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AuthService } from '@/services';
import { Button, Input } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

type UserType = 'motorista' | 'empresa';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<UserType>('motorista');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const result = await login(email.trim(), password);

    if (!result.success) {
      setError(result.error || 'Erro ao fazer login.');
      setLoading(false);
      return;
    }

    if (userType === 'empresa' && result.userId) {
      const statusResult = await AuthService.verificarStatusEmpresa(result.userId);
      if (statusResult.status && statusResult.status !== 'aprovado') {
        const msgs: Record<string, string> = {
          pendente: 'Sua conta está pendente de aprovação. Aguarde a análise da nossa equipe.',
          rejeitada: 'Sua conta foi rejeitada. Entre em contato com nosso suporte.',
          bloqueada: 'Sua conta foi bloqueada. Entre em contato com nosso suporte.',
        };
        setError(msgs[statusResult.status] || 'Sua conta não está aprovada no momento.');
        await AuthService.logout();
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError('Digite seu email primeiro para reenviar a confirmação.');
      return;
    }
    setResendLoading(true);
    setError('');
    const result = await AuthService.resendConfirmation(email.trim());
    setResendLoading(false);
    if (result.success) {
      setSuccessMsg('Email de confirmação reenviado! Verifique sua caixa de entrada.');
    } else {
      setError(result.error || 'Erro ao reenviar email.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>RJ</Text>
          </View>
          <Text style={styles.title}>ROTA JÁ</Text>
          <Text style={styles.subtitle}>Faça seu login</Text>
        </View>

        {/* Card de login */}
        <View style={styles.card}>
          {/* Seletor de tipo de usuário */}
          <Text style={styles.sectionLabel}>Tipo de usuário</Text>
          <View style={styles.userTypeRow}>
            <TouchableOpacity
              style={[styles.userTypeBtn, userType === 'motorista' && styles.userTypeBtnActive]}
              onPress={() => setUserType('motorista')}
              activeOpacity={0.8}
            >
              <View style={[styles.userTypeIndicator, userType === 'motorista' && styles.userTypeIndicatorActive]}>
                <Text style={[styles.userTypeInitial, userType === 'motorista' && { color: COLORS.white }]}>M</Text>
              </View>
              <Text style={[styles.userTypeText, userType === 'motorista' && styles.userTypeTextActive]}>
                Motorista
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.userTypeBtn, userType === 'empresa' && styles.userTypeBtnActiveEmpresa]}
              onPress={() => setUserType('empresa')}
              activeOpacity={0.8}
            >
              <View style={[styles.userTypeIndicator, userType === 'empresa' && { backgroundColor: COLORS.accent }]}>
                <Text style={[styles.userTypeInitial, userType === 'empresa' && { color: COLORS.white }]}>E</Text>
              </View>
              <Text style={[styles.userTypeText, userType === 'empresa' && { color: COLORS.accent, fontWeight: '600' }]}>
                Empresa
              </Text>
            </TouchableOpacity>
          </View>

          <Input label="E-mail" placeholder={userType === 'motorista' ? 'seu@email.com' : 'contato@empresa.com'}
            value={email} onChangeText={(t) => { setEmail(t); setError(''); }} keyboardType="email-address" />
          <Input label="Senha" placeholder="Digite sua senha"
            value={password} onChangeText={(t) => { setPassword(t); setError(''); }} isPassword />

          {error ? (
            <View style={styles.alertError}>
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          ) : null}
          {successMsg ? (
            <View style={styles.alertSuccess}>
              <Text style={styles.alertSuccessText}>{successMsg}</Text>
            </View>
          ) : null}

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => router.push('/(auth)/esqueci-senha')}>
              <Text style={styles.linkPrimary}>Esqueci minha senha</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleResendConfirmation} disabled={resendLoading}>
              <Text style={styles.linkAccent}>
                {resendLoading ? 'Reenviando...' : 'Reenviar confirmação'}
              </Text>
            </TouchableOpacity>
          </View>

          <Button title={loading ? 'Entrando...' : 'Entrar'} onPress={handleLogin} loading={loading} size="lg" />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Não tem conta? </Text>
            <TouchableOpacity onPress={() => {
              if (userType === 'motorista') router.push('/(auth)/cadastro-motorista');
              else router.push('/(auth)/cadastro-empresa');
            }}>
              <Text style={styles.registerLink}>Cadastre-se aqui</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },

  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logoContainer: {
    width: 56, height: 56, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm, ...SHADOWS.md,
  },
  logoText: { fontSize: 22, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
  title: { fontSize: FONT_SIZES.title, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, ...SHADOWS.xl },

  sectionLabel: { fontSize: FONT_SIZES.sm, fontWeight: '500', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  userTypeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  userTypeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.sm + 2, borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1.5, borderColor: COLORS.border, gap: SPACING.sm,
  },
  userTypeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFaded },
  userTypeBtnActiveEmpresa: { borderColor: COLORS.accent, backgroundColor: COLORS.accentFaded },
  userTypeIndicator: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  userTypeIndicatorActive: { backgroundColor: COLORS.primary },
  userTypeInitial: { fontSize: FONT_SIZES.sm, fontWeight: '800', color: COLORS.textTertiary },
  userTypeText: { fontSize: FONT_SIZES.sm, fontWeight: '500', color: COLORS.textSecondary },
  userTypeTextActive: { color: COLORS.primary, fontWeight: '600' },

  alertError: {
    backgroundColor: COLORS.errorLight, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.error,
  },
  alertErrorText: { color: COLORS.error, fontSize: FONT_SIZES.sm },
  alertSuccess: {
    backgroundColor: COLORS.successLight, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.success,
  },
  alertSuccessText: { color: COLORS.success, fontSize: FONT_SIZES.sm },

  linksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  linkPrimary: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: '500' },
  linkAccent: { color: COLORS.accent, fontSize: FONT_SIZES.sm, fontWeight: '500' },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.lg },
  registerText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  registerLink: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: '600' },
});
