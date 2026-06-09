/**
 * Tela de Verificação de E-mail (OTP) — Redesenho Premium
 * 
 * Layout focado e de alta qualidade:
 * - Esconde o input editável de e-mail e mostra apenas texto informativo.
 * - Caixa de 6 dígitos individuais com efeito de foco e animação sutil.
 * - Design alinhado ao shadcn/ui com cantos arredondados, sombras e paleta azul RotaJá.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthService } from '@/services';
import { Button } from '@/components';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '@/config/theme';

export default function VerificarEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email] = useState(params.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef<TextInput>(null);

  // Auto-focus no campo de código ao entrar na tela
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
  }, []);

  const handleVerify = async () => {
    const cleanEmail = email.trim();
    const cleanCode = code.replace(/\D/g, '');

    if (!cleanEmail || cleanCode.length < 6) {
      setError('Por favor, insira o código de 6 dígitos enviado.');
      return;
    }

    setError('');
    setLoading(true);

    const result = await AuthService.verifySignupOtp(cleanEmail, cleanCode);
    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Não foi possível confirmar o código.');
      return;
    }

    const approval = await AuthService.solicitarAprovacaoCadastro();
    await AuthService.logout();
    setLoading(false);

    if (!approval.success) {
      Alert.alert(
        'E-mail confirmado',
        'Seu e-mail foi confirmado, mas não foi possível avisar o administrador automaticamente. Por favor, entre em contato com o suporte.'
      );
    } else {
      Alert.alert(
        'E-mail confirmado',
        'Seu cadastro foi enviado para análise com sucesso! Assim que for aprovado pela nossa equipe, você receberá um e-mail de notificação e poderá fazer login.'
      );
    }

    router.replace('/(auth)/landing');
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('E-mail não identificado para reenvio.');
      return;
    }

    setResending(true);
    setError('');
    const result = await AuthService.resendConfirmation(email.trim());
    setResending(false);

    if (!result.success) {
      setError(result.error || 'Não foi possível reenviar o código.');
      return;
    }

    Alert.alert('Código reenviado', 'Confira sua caixa de entrada e pasta de spam no seu e-mail.');
  };

  const handlePressOtp = () => {
    inputRef.current?.focus();
  };

  const codeLength = 6;
  const codeArr = code.split('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Botão de voltar */}
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={async () => {
            await AuthService.logout();
            router.replace('/(auth)/landing');
          }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Ícone de Email com Círculo Animado */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={38} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>Confirme seu e-mail</Text>
        
        {/* Banner Informativo do Email */}
        <View style={styles.emailBadge}>
          <Text style={styles.emailText}>
            Enviamos um código de verificação para:
          </Text>
          <Text style={styles.emailAddress}>{email || 'seu e-mail cadastrado'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.otpLabel}>Insira o código de 6 dígitos</Text>

          {/* OTP Box Display */}
          <TouchableOpacity 
            style={styles.otpContainer} 
            activeOpacity={1} 
            onPress={handlePressOtp}
          >
            {Array(codeLength).fill(0).map((_, idx) => {
              const char = codeArr[idx];
              const isFocused = idx === code.length;
              return (
                <View 
                  key={idx} 
                  style={[
                    styles.otpBox, 
                    char !== undefined && styles.otpBoxFilled,
                    isFocused && styles.otpBoxFocused
                  ]}
                >
                  <Text style={styles.otpBoxText}>
                    {char || ''}
                  </Text>
                  {isFocused && <View style={styles.cursor} />}
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Input oculto */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            caretHidden
          />

          {error ? (
            <View style={styles.alertError}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            title={loading ? 'Confirmando...' : 'Confirmar E-mail'}
            onPress={handleVerify}
            loading={loading}
            size="lg"
            disabled={code.length < 6}
          />

          {/* Reenviar código */}
          <TouchableOpacity 
            style={styles.resendBtn} 
            onPress={handleResend} 
            disabled={resending}
            activeOpacity={0.7}
          >
            {resending ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
                <Text style={styles.resendText}>Reenviar código por e-mail</Text>
              </>
            )}
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  emailBadge: {
    backgroundColor: 'rgba(32, 148, 243, 0.06)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'center',
    alignItems: 'center',
    width: '90%',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(32, 148, 243, 0.12)',
  },
  emailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  emailAddress: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.xl,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: SPACING.lg,
  },
  otpBox: {
    width: 42,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
  },
  otpBoxFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#fff',
    ...SHADOWS.md,
  },
  otpBoxText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cursor: {
    position: 'absolute',
    bottom: 8,
    width: 12,
    height: 2,
    backgroundColor: COLORS.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
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
