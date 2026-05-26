/**
 * Checkout — Tela de pagamento sandbox
 *
 * Métodos: Cartão, PIX, Boleto
 * Painel sandbox para simular cenários de pagamento.
 * Ao aprovar: atualiza Supabase, navega pro dashboard.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { AssinaturasService } from '@/services/assinaturas.service';
import { StripeCheckoutService } from '@/services/stripe-checkout.service';
import { ENV } from '@/config/env';
import * as ExpoLinking from 'expo-linking';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS, FONT_SIZES } from '@/config/theme';
import {
  getPlan,
  type PlanTier,
  type UserGroup,
  type PaymentMethod,
  type PlanDefinition,
  TIER_VISUALS,
} from '@/config/plans';
import { PremiumBadge } from '@/components/PremiumBadge';
import type { SandboxScenario } from '@/services/assinaturas.service';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();
  const params = useLocalSearchParams<{ planId: string; tier: string; group: string; stripeStatus?: string; sessionId?: string }>();

  const tier = (params.tier || 'bronze') as PlanTier;
  const group = (params.group || 'motorista') as UserGroup;
  const plan: PlanDefinition = getPlan(group, tier);
  const tierVisual = TIER_VISUALS[tier];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cartao');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [stripeReturnHandled, setStripeReturnHandled] = useState(false);

  // Stripe verification states
  const [verifyingStripe, setVerifyingStripe] = useState(false);
  const [stripeSuccessText, setStripeSuccessText] = useState('Estamos confirmando o seu pagamento...');
  const [showVerifyManualBtn, setShowVerifyManualBtn] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Cartão form (sandbox — aceita qualquer dado)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');

  const paymentMethods = ENV.PAYMENTS_MODE === 'stripe'
    ? [
        { key: 'cartao' as PaymentMethod, icon: 'card-outline', label: 'Cartão' },
        { key: 'boleto' as PaymentMethod, icon: 'barcode-outline', label: 'Boleto' },
      ]
    : [
        { key: 'cartao' as PaymentMethod, icon: 'card-outline', label: 'Cartão' },
        { key: 'pix' as PaymentMethod, icon: 'qr-code-outline', label: 'PIX' },
        { key: 'boleto' as PaymentMethod, icon: 'barcode-outline', label: 'Boleto' },
      ];

  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (ENV.PAYMENTS_MODE === 'stripe' && paymentMethod === 'pix') {
      setPaymentMethod('cartao');
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (ENV.PAYMENTS_MODE !== 'stripe' || stripeReturnHandled || !params.stripeStatus || !user?.id) {
      return;
    }

    setStripeReturnHandled(true);

    if (params.stripeStatus === 'cancel') {
      Alert.alert('Pagamento cancelado', 'Você voltou sem finalizar a assinatura.');
      return;
    }

    if (params.stripeStatus !== 'success') return;

    (async () => {
      setProcessing(true);
      setVerifyingStripe(true);
      setShowVerifyManualBtn(false);
      setVerificationError(null);
      let activated = false;

      // 10 tentativas com 3 segundos de intervalo = 30 segundos no total
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (!isMounted.current) break;
        setStripeSuccessText(`Confirmando pagamento com a Stripe...\n(Tentativa ${attempt + 1} de 10)`);

        try {
          // 1. Tenta forçar a sincronização/verificação direta com a Stripe via Edge Function
          const checkResult = await StripeCheckoutService.verifySubscription(params.sessionId, tier);
          if (checkResult.activated) {
            activated = true;
            break;
          }

          // 2. Fallback de verificação local do status do banco
          const result = await AssinaturasService.verificarStatus(user.id);

          if (result.data?.status_assinatura === 'ativo' && result.data?.tipo_plano === tier) {
            activated = true;
            break;
          }
        } catch (err) {
          console.error('[Checkout] Erro na tentativa de verificação:', err);
        }

        await sleep(3000);
      }

      if (!isMounted.current) return;

      // Atualiza o estado global de assinatura após verificar
      try {
        await refreshSubscription();
      } catch (err) {
        console.error('[Checkout] Erro ao sincronizar estado da assinatura:', err);
      }

      setProcessing(false);

      if (activated) {
        setVerifyingStripe(false);
        setShowSuccess(true);
        setTimeout(() => {
          if (isMounted.current) {
            setShowSuccess(false);
            router.replace('/(app)/dashboard');
          }
        }, 2500);
      } else {
        setStripeSuccessText('O pagamento foi iniciado na Stripe, mas a confirmação automática está demorando.');
        setShowVerifyManualBtn(true);
      }
    })();
  }, [params.stripeStatus, params.sessionId, refreshSubscription, router, stripeReturnHandled, tier, user?.id]);

  const handleManualVerification = async () => {
    if (!user?.id) return;
    setProcessing(true);
    setVerificationError(null);
    setStripeSuccessText('Forçando verificação com a Stripe...');

    try {
      const checkResult = await StripeCheckoutService.verifySubscription(params.sessionId, tier);
      await refreshSubscription();

      if (checkResult.activated) {
        setVerifyingStripe(false);
        setShowSuccess(true);
        setTimeout(() => {
          if (isMounted.current) {
            setShowSuccess(false);
            router.replace('/(app)/dashboard');
          }
        }, 2500);
      } else {
        setVerificationError(
          checkResult.error || 
          'A assinatura ainda não foi confirmada pela Stripe. Se você já pagou, aguarde alguns instantes e tente novamente.'
        );
        setStripeSuccessText('Não foi possível confirmar a ativação ainda.');
        setShowVerifyManualBtn(true);
      }
    } catch (err) {
      console.error('[Checkout] Erro na verificação manual:', err);
      setVerificationError('Erro ao tentar verificar. Tente novamente em instantes.');
    } finally {
      if (isMounted.current) {
        setProcessing(false);
      }
    }
  };

  const handlePay = async (scenario: SandboxScenario = 'aprovado') => {
    if (!user?.id) return;
    setProcessing(true);

    try {
      if (ENV.PAYMENTS_MODE === 'stripe' && scenario === 'aprovado') {
        if (paymentMethod === 'pix') {
          Alert.alert(
            'PIX indisponivel',
            'A Stripe nao aceita PIX para assinatura mensal recorrente. Escolha cartao ou boleto.'
          );
          setPaymentMethod('cartao');
          return;
        }

        const metodoLabel = paymentMethod === 'boleto' ? 'Boleto' : 'Cartão';
        const successUrl = ExpoLinking.createURL('checkout', {
          queryParams: {
            stripeStatus: 'success',
            sessionId: '{CHECKOUT_SESSION_ID}',
            planId: plan.id,
            tier: tier,
            group: group,
          },
        });
        const cancelUrl = ExpoLinking.createURL('checkout', {
          queryParams: {
            stripeStatus: 'cancel',
            planId: plan.id,
            tier: tier,
            group: group,
          },
        });
        const stripe = await StripeCheckoutService.criarSessaoCheckout(tier, group, {
          successUrl,
          cancelUrl,
          metodoPagamento: paymentMethod,
          amountCents: plan.price,
        });
        if (!stripe.url) {
          Alert.alert('Erro', stripe.error || 'Não foi possível abrir o pagamento Stripe.');
          return;
        }
        await Linking.openURL(stripe.url);
        Alert.alert(
          `Pagamento via ${metodoLabel}`,
          `Você será direcionado à página segura da Stripe para pagar com ${metodoLabel}. ` +
            'Após a confirmação, volte ao app — seu plano será ativado automaticamente.'
        );
        return;
      }

      const result = await AssinaturasService.processarPagamento(
        user.id,
        tier,
        paymentMethod,
        scenario,
        group
      );

      if (result.success) {
        await refreshSubscription();
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          router.replace('/(app)/dashboard');
        }, 2500);
      } else {
        Alert.alert(
          scenario === 'recusado' ? '❌ Pagamento Recusado' :
          scenario === 'falha_pagamento' ? '⚠️ Falha no Pagamento' :
          'Erro',
          result.error || 'Erro ao processar pagamento.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSimulateExpiration = async () => {
    if (!user?.id) return;
    setProcessing(true);
    const result = await AssinaturasService.simularExpiracao(user.id);
    setProcessing(false);
    if (result.success) {
      await refreshSubscription();
      Alert.alert('⏰ Expiração Simulada', 'Assinatura expirada. Redirecionando...');
      setTimeout(() => router.replace('/(auth)/planos'), 1500);
    }
  };

  const handleSimulateRenewal = async () => {
    if (!user?.id) return;
    setProcessing(true);
    const result = await AssinaturasService.renovarAssinatura(user.id);
    setProcessing(false);
    if (result.success) {
      await refreshSubscription();
      Alert.alert('🔄 Renovação Simulada', 'Assinatura renovada por mais 1 mês!');
    } else {
      Alert.alert('Erro', result.error || 'Erro ao renovar.');
    }
  };

  const handleSimulateCancellation = async () => {
    if (!user?.id) return;
    setProcessing(true);
    const result = await AssinaturasService.cancelarAssinatura(user.id);
    setProcessing(false);
    if (result.success) {
      await refreshSubscription();
      Alert.alert('🚫 Cancelamento Simulado', 'Assinatura cancelada. Voltando ao plano gratuito.');
      setTimeout(() => router.replace('/(auth)/planos'), 1500);
    }
  };

  // Formata número do cartão com espaços
  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finalizar Assinatura</Text>
        <TouchableOpacity
          style={styles.sandboxToggle}
          onPress={() => setShowSandbox(!showSandbox)}
        >
          <Ionicons name="flask" size={20} color={showSandbox ? COLORS.primary : COLORS.textTertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Resumo do Plano */}
        <View style={styles.summaryCard}>
          <Text style={styles.welcomeText}>Ótima escolha!</Text>
          <Text style={styles.summaryTitle}>Você selecionou:</Text>
          <View style={styles.planBadgeRow}>
            <PremiumBadge tier={tier} size="lg" showLabel />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.planNameText}>{plan.name}</Text>
              <Text style={styles.planPriceText}>{plan.priceFormatted}</Text>
            </View>
          </View>
          <Text style={styles.billingInfo}>
            Cobrança recorrente mensal. Cancele quando quiser.
          </Text>
        </View>

        {/* Métodos de Pagamento */}
        <Text style={styles.sectionTitle}>Forma de Pagamento</Text>
        <View style={styles.methodsContainer}>
          {paymentMethods.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodCard, paymentMethod === m.key && styles.methodActive]}
              onPress={() => setPaymentMethod(m.key)}
            >
              <Ionicons
                name={m.icon as any}
                size={26}
                color={paymentMethod === m.key ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.methodText, paymentMethod === m.key && styles.methodTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Formulário Cartão (sandbox) ou aviso Stripe */}
        {ENV.PAYMENTS_MODE === 'stripe' && (
          <View style={styles.stripeHintBox}>
            <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
            <Text style={styles.stripeHintText}>
              Com pagamento real, os dados de {paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'boleto' ? 'boleto' : 'cartão'}{' '}
              são preenchidos na página segura da Stripe (não nesta tela).
            </Text>
          </View>
        )}

        {ENV.PAYMENTS_MODE !== 'stripe' && paymentMethod === 'cartao' && (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número do Cartão</Text>
              <TextInput
                style={styles.input}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                maxLength={19}
              />
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Validade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/AA"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                  value={cardExpiry}
                  onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                  secureTextEntry
                  value={cardCVV}
                  onChangeText={(t) => setCardCVV(t.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome impresso no cartão</Text>
              <TextInput
                style={styles.input}
                placeholder="NOME COMPLETO"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="characters"
                value={cardName}
                onChangeText={setCardName}
              />
            </View>
          </View>
        )}

        {/* PIX (sandbox) */}
        {ENV.PAYMENTS_MODE !== 'stripe' && paymentMethod === 'pix' && (
          <View style={styles.pixContainer}>
            <View style={styles.pixQrPlaceholder}>
              <Ionicons name="qr-code" size={80} color={COLORS.textTertiary} style={{ opacity: 0.3 }} />
              <View style={styles.pixOverlay}>
                <Text style={styles.pixLabel}>SANDBOX</Text>
              </View>
            </View>
            <Text style={styles.pixText}>
              O código PIX será gerado automaticamente.{'\n'}
              Use o painel sandbox para simular o pagamento.
            </Text>
          </View>
        )}

        {/* Boleto (sandbox) */}
        {ENV.PAYMENTS_MODE !== 'stripe' && paymentMethod === 'boleto' && (
          <View style={styles.pixContainer}>
            <View style={styles.pixQrPlaceholder}>
              <Ionicons name="barcode" size={80} color={COLORS.textTertiary} style={{ opacity: 0.3 }} />
              <View style={styles.pixOverlay}>
                <Text style={styles.pixLabel}>SANDBOX</Text>
              </View>
            </View>
            <Text style={styles.pixText}>
              O boleto será gerado com vencimento em 3 dias úteis.{'\n'}
              Use o painel sandbox para simular o pagamento.
            </Text>
          </View>
        )}

        {/* Painel Sandbox (somente modo sandbox) */}
        {ENV.PAYMENTS_MODE !== 'stripe' && showSandbox && (
          <View style={styles.sandboxPanel}>
            <View style={styles.sandboxHeader}>
              <Ionicons name="flask" size={18} color="#8B5CF6" />
              <Text style={styles.sandboxTitle}>Painel de Testes (Sandbox)</Text>
            </View>
            <Text style={styles.sandboxDesc}>
              Simule diferentes cenários de pagamento sem usar dinheiro real.
            </Text>
            <View style={styles.sandboxGrid}>
              <TouchableOpacity
                style={[styles.sandboxBtn, { backgroundColor: '#D1FAE5' }]}
                onPress={() => handlePay('aprovado')}
                disabled={processing}
              >
                <Text style={[styles.sandboxBtnText, { color: '#059669' }]}>
                  ✅ Aprovado
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sandboxBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={() => handlePay('recusado')}
                disabled={processing}
              >
                <Text style={[styles.sandboxBtnText, { color: '#DC2626' }]}>
                  ❌ Recusado
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sandboxBtn, { backgroundColor: '#FEF3C7' }]}
                onPress={() => handlePay('falha_pagamento')}
                disabled={processing}
              >
                <Text style={[styles.sandboxBtnText, { color: '#D97706' }]}>
                  ⚠️ Falha
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sandboxBtn, { backgroundColor: '#DBEAFE' }]}
                onPress={handleSimulateRenewal}
                disabled={processing}
              >
                <Text style={[styles.sandboxBtnText, { color: '#2563EB' }]}>
                  🔄 Renovar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sandboxBtn, { backgroundColor: '#F3E8FF' }]}
                onPress={handleSimulateExpiration}
                disabled={processing}
              >
                <Text style={[styles.sandboxBtnText, { color: '#7C3AED' }]}>
                  ⏰ Expirar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sandboxBtn, { backgroundColor: '#F3F4F6' }]}
                onPress={handleSimulateCancellation}
                disabled={processing}
              >
                <Text style={[styles.sandboxBtnText, { color: '#6B7280' }]}>
                  🚫 Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer Fixo */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a pagar hoje:</Text>
          <Text style={styles.totalValue}>{plan.priceFormatted}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, processing && { opacity: 0.6 }]}
          onPress={() => handlePay('aprovado')}
          activeOpacity={0.8}
          disabled={processing}
        >
          <LinearGradient
            colors={[...TIER_VISUALS[tier].badgeColors] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkoutBtnGradient}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.checkoutBtnText}>Confirmar e Assinar</Text>
                <Ionicons name="lock-closed" size={16} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal visible={showSuccess} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <LinearGradient
              colors={[...TIER_VISUALS[tier].badgeColors] as [string, string]}
              style={styles.successIcon}
            >
              <Ionicons name="checkmark" size={48} color="#fff" />
            </LinearGradient>
            <Text style={styles.successTitle}>Assinatura Ativada! 🎉</Text>
            <Text style={styles.successMessage}>
              Bem-vindo ao plano {plan.shortName}!{'\n'}
              Seus recursos premium já estão disponíveis.
            </Text>
            <PremiumBadge tier={tier} size="lg" showLabel />
          </View>
        </View>
      </Modal>

      {/* Stripe Verification Modal */}
      <Modal visible={verifyingStripe} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            {showVerifyManualBtn ? (
              <View style={[styles.warningIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="alert-circle" size={48} color="#D97706" />
              </View>
            ) : (
              <View style={styles.loadingSpinnerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ transform: [{ scale: 1.2 }] }} />
              </View>
            )}

            <Text style={styles.successTitle}>
              {showVerifyManualBtn ? 'Aguardando Confirmação' : 'Confirmando Plano'}
            </Text>

            <Text style={[styles.successMessage, { fontSize: 14, marginVertical: 12 }]}>
              {stripeSuccessText}
            </Text>

            {verificationError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{verificationError}</Text>
              </View>
            )}

            {showVerifyManualBtn ? (
              <View style={styles.modalBtnContainer}>
                <TouchableOpacity
                  style={styles.verifyManualBtn}
                  onPress={handleManualVerification}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.verifyManualBtnText}>Verificar Novamente</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => {
                    setVerifyingStripe(false);
                    router.replace('/(app)/dashboard');
                  }}
                  disabled={processing}
                >
                  <Text style={styles.closeModalBtnText}>Ir para Dashboard</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                <PremiumBadge tier={tier} size="lg" showLabel />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 15, paddingHorizontal: SPACING.lg,
    backgroundColor: '#fff', ...SHADOWS.sm, zIndex: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  sandboxToggle: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end',
  },
  scroll: { padding: SPACING.lg },

  // Summary
  summaryCard: {
    backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg, padding: 24,
    marginBottom: 28, ...SHADOWS.md, borderWidth: 1, borderColor: '#E2E8F0',
  },
  welcomeText: { fontSize: 15, color: COLORS.primary, fontWeight: '700', marginBottom: 4 },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  planBadgeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', padding: 16, borderRadius: BORDER_RADIUS.md,
    marginBottom: 12,
  },
  planNameText: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  planPriceText: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  billingInfo: { fontSize: 13, color: COLORS.textSecondary },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },

  // Payment methods
  methodsContainer: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  methodCard: {
    flex: 1, backgroundColor: '#fff', paddingVertical: 16, borderRadius: BORDER_RADIUS.md,
    alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  methodActive: { borderColor: COLORS.primary, backgroundColor: '#F0F9FF' },
  methodText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 6 },
  methodTextActive: { color: COLORS.primary },

  // Form
  formContainer: {
    backgroundColor: '#fff', padding: 20, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm,
  },
  inputGroup: { marginBottom: 14 },
  inputRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: 16, height: 50,
    fontSize: 15, color: COLORS.textPrimary,
  },

  // PIX / Boleto
  stripeHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
  },
  stripeHintText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  pixContainer: {
    alignItems: 'center', padding: 32, backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm,
  },
  pixQrPlaceholder: {
    width: 160, height: 160, borderRadius: 16, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  pixOverlay: {
    position: 'absolute', backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
  },
  pixLabel: { fontSize: 11, fontWeight: '800', color: '#8B5CF6', letterSpacing: 1 },
  pixText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  // Sandbox panel
  sandboxPanel: {
    marginTop: 24, backgroundColor: '#FAFAFF', borderRadius: BORDER_RADIUS.lg,
    padding: 20, borderWidth: 1.5, borderColor: '#E0DBFF', borderStyle: 'dashed',
  },
  sandboxHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  sandboxTitle: { fontSize: 16, fontWeight: '700', color: '#7C3AED' },
  sandboxDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  sandboxGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  sandboxBtn: {
    width: '31%', paddingVertical: 14, borderRadius: BORDER_RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  sandboxBtnText: { fontSize: 12, fontWeight: '700' },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: SPACING.lg,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', ...SHADOWS.md,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  totalLabel: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary },
  checkoutBtn: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  checkoutBtnGradient: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, height: 56,
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Success modal
  successOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  successCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 40,
    alignItems: 'center', width: '100%', maxWidth: 360, ...SHADOWS.xl,
  },
  successIcon: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  successTitle: {
    fontSize: 24, fontWeight: '800', color: COLORS.textPrimary,
    textAlign: 'center', marginBottom: 12,
  },
  successMessage: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },
  warningIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingSpinnerContainer: {
    width: 88,
    height: 88,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  errorBoxText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBtnContainer: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  verifyManualBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    ...SHADOWS.sm,
  },
  verifyManualBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  closeModalBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  closeModalBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
