/**
 * Tela Esqueci Senha — com ícone Ionicons
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthService } from '@/services';
import { Button, Input } from '@/components';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';

export default function EsqueciSenhaScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Digite seu e-mail.'); return; }
    setError('');
    setLoading(true);
    const result = await AuthService.resetPassword(email.trim());
    setLoading(false);
    if (result.success) setSent(true);
    else setError(result.error || 'Erro ao enviar email.');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="key-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Recuperar Senha</Text>
          <Text style={styles.subtitle}>
            {sent ? 'Email enviado com sucesso!' : 'Informe seu email para receber o link de recuperação'}
          </Text>
        </View>

        <View style={styles.card}>
          {sent ? (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Ionicons name="mail-outline" size={40} color={COLORS.success} />
              </View>
              <Text style={styles.successTitle}>Verifique seu email</Text>
              <Text style={styles.successText}>
                Enviamos um link de recuperação para {email}. Verifique sua caixa de entrada e spam.
              </Text>
              <Button title="Voltar ao Login" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: SPACING.lg }} />
            </View>
          ) : (
            <>
              <Input label="E-mail" placeholder="seu@email.com" value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }} keyboardType="email-address" />
              {error ? (
                <View style={styles.alertError}>
                  <Text style={styles.alertErrorText}>{error}</Text>
                </View>
              ) : null}
              <Button title={loading ? 'Enviando...' : 'Enviar link de recuperação'} onPress={handleSubmit} loading={loading} size="lg" />
            </>
          )}

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
            <Text style={styles.backText}> Voltar ao login</Text>
          </TouchableOpacity>
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
    width: 56, height: 56, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
  },
  title: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, ...SHADOWS.xl },
  alertError: {
    backgroundColor: COLORS.errorLight, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md,
    marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.error,
  },
  alertErrorText: { color: COLORS.error, fontSize: FONT_SIZES.sm },
  successBox: { alignItems: 'center', paddingVertical: SPACING.lg },
  successIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.successLight,
    justifyContent: 'center', alignItems: 'center',
  },
  successTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginTop: SPACING.md },
  successText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 22 },
  backBtn: { marginTop: SPACING.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  backText: { color: COLORS.primary, fontSize: FONT_SIZES.sm, fontWeight: '500' },
});
