import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthService } from '@/services';
import { Button, Input } from '@/components';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '@/config/theme';

export default function VerificarEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    const cleanEmail = email.trim();
    const cleanCode = code.replace(/\D/g, '');

    if (!cleanEmail || cleanCode.length < 6) {
      setError('Informe o email e o codigo de 6 digitos.');
      return;
    }

    setError('');
    setLoading(true);

    const result = await AuthService.verifySignupOtp(cleanEmail, cleanCode);
    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Nao foi possivel confirmar o codigo.');
      return;
    }

    const approval = await AuthService.solicitarAprovacaoCadastro();
    await AuthService.logout();
    setLoading(false);

    if (!approval.success) {
      Alert.alert(
        'Email confirmado',
        'Seu email foi confirmado, mas nao foi possivel avisar o administrador automaticamente. Entre em contato com o suporte.'
      );
    } else {
      Alert.alert(
        'Email confirmado',
        'Seu cadastro foi enviado para analise. Assim que for aprovado, voce podera fazer login.'
      );
    }

    router.replace('/(auth)/landing');
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Digite seu email para reenviar o codigo.');
      return;
    }

    setResending(true);
    setError('');
    const result = await AuthService.resendConfirmation(email.trim());
    setResending(false);

    if (!result.success) {
      setError(result.error || 'Nao foi possivel reenviar o codigo.');
      return;
    }

    Alert.alert('Codigo reenviado', 'Confira sua caixa de entrada e spam.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/landing')}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Ionicons name="mail-unread-outline" size={34} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Confirme seu email</Text>
        <Text style={styles.subtitle}>
          Digite o codigo de 6 digitos enviado para seu email. Depois disso, seu cadastro vai para analise.
        </Text>

        <View style={styles.card}>
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError('');
            }}
            keyboardType="email-address"
          />
          <Input
            label="Codigo de verificacao"
            placeholder="000000"
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            keyboardType="number-pad"
          />

          {error ? (
            <View style={styles.alertError}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            title={loading ? 'Confirmando...' : 'Confirmar email'}
            onPress={handleVerify}
            loading={loading}
            size="lg"
          />

          <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={resending}>
            <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
            <Text style={styles.resendText}>
              {resending ? 'Reenviando...' : 'Reenviar codigo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 54,
    left: SPACING.lg,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.xl,
  },
  alertError: {
    backgroundColor: COLORS.errorLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertErrorText: { color: COLORS.error, fontSize: FONT_SIZES.sm, flex: 1 },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: SPACING.md,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
