/**
 * Tela de Login — fluxo corrigido
 * 
 * Correções:
 * - "Reenviar confirmação" só aparece quando o login falha por email não confirmado
 * - Visual limpo e premium com gradiente no header
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
  const [showResend, setShowResend] = useState(false); // ← só mostra quando necessário
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setShowResend(false);
    setLoading(true);

    const result = await login(email.trim(), password);

    if (!result.success) {
      setError(result.error || 'Erro ao fazer login.');
      // Mostra botão de reenviar APENAS se o erro for de email não confirmado
      if (result.isEmailNotConfirmed) {
        setShowResend(true);
      }
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
      setShowResend(false);
    } else {
      setError(result.error || 'Erro ao reenviar email.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header com gradiente */}
        <LinearGradient
          colors={['#1976D2', '#2094F3', '#4DA9F5']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>RJ</Text>
          </View>
          <Text style={styles.title}>Bem-vindo de volta</Text>
          <Text style={styles.subtitle}>Faça login para continuar</Text>
        </LinearGradient>

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
                <Ionicons
                  name="car-sport-outline"
                  size={16}
                  color={userType === 'motorista' ? COLORS.white : COLORS.textTertiary}
                />
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
                <Ionicons
                  name="business-outline"
                  size={16}
                  color={userType === 'empresa' ? COLORS.white : COLORS.textTertiary}
                />
              </View>
              <Text style={[styles.userTypeText, userType === 'empresa' && { color: COLORS.accent, fontWeight: '600' }]}>
                Empresa
              </Text>
            </TouchableOpacity>
          </View>

          <Input label="E-mail" placeholder={userType === 'motorista' ? 'seu@email.com' : 'contato@empresa.com'}
            value={email} onChangeText={(t) => { setEmail(t); setError(''); setShowResend(false); }} keyboardType="email-address" />
          <Input label="Senha" placeholder="Digite sua senha"
            value={password} onChangeText={(t) => { setPassword(t); setError(''); }} isPassword />

          {error ? (
            <View style={styles.alertError}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          ) : null}
          {successMsg ? (
            <View style={styles.alertSuccess}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.alertSuccessText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Reenviar confirmação — SÓ aparece quando login falha por email não confirmado */}
          {showResend && (
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleResendConfirmation}
              disabled={resendLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={16} color={COLORS.accent} />
              <Text style={styles.resendText}>
                {resendLoading ? 'Reenviando...' : 'Reenviar email de confirmação'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.push('/(auth)/esqueci-senha')} style={styles.forgotBtn}>
            <Text style={styles.linkPrimary}>Esqueci minha senha</Text>
          </TouchableOpacity>

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
  scroll: { flexGrow: 1 },

  // Header
  header: {
    paddingTop: 56, paddingBottom: 36, paddingHorizontal: SPACING.lg,
    alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  backBtn: {
    position: 'absolute', top: 50, left: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoBadge: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.sm, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoText: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Card
  card: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginHorizontal: SPACING.lg, marginTop: -16,
    ...SHADOWS.xl,
  },

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
  userTypeText: { fontSize: FONT_SIZES.sm, fontWeight: '500', color: COLORS.textSecondary },
  userTypeTextActive: { color: COLORS.primary, fontWeight: '600' },

  alertError: {
    backgroundColor: COLORS.errorLight, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.error,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  alertErrorText: { color: COLORS.error, fontSize: FONT_SIZES.sm, flex: 1 },
  alertSuccess: {
    backgroundColor: COLORS.successLight, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.success,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  alertSuccessText: { color: COLORS.success, fontSize: FONT_SIZES.sm, flex: 1 },

  // Reenviar — aparência de banner contextual
  resendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.accentFaded, borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.accent + '40',
    marginBottom: SPACING.md, gap: 8,
  },
  resendText: { color: COLORS.accentDark, fontSize: FONT_SIZES.sm, fontWeight: '600' },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: SPACING.lg },
  linkPrimary: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: '500' },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.lg },
  registerText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm },
  registerLink: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: '600' },
});
