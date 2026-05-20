/**
 * Checkout — Tela de pagamento sandbox
 *
 * Métodos: Cartão, PIX, Boleto
 * Painel sandbox para simular cenários de pagamento.
 * Ao aprovar: atualiza Supabase, navega pro dashboard.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { AssinaturasService } from '@/services/assinaturas.service';
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

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();
  const params = useLocalSearchParams<{ planId: string; tier: string; group: string }>();

  const tier = (params.tier || 'bronze') as PlanTier;
  const group = (params.group || 'motorista') as UserGroup;
  const plan: PlanDefinition = getPlan(group, tier);
  const tierVisual = TIER_VISUALS[tier];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cartao');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  // Cartão form (sandbox — aceita qualquer dado)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');

  const handlePay = async (scenario: SandboxScenario = 'aprovado') => {
    if (!user?.id) return;
    setProcessing(true);

    const result = await AssinaturasService.processarPagamento(
      user.id,
      tier,
      paymentMethod,
      scenario,
      group
    );

    setProcessing(false);

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
      setTimeout(() => router.replace('/(app)/dashboard'), 1500);
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
          {([
            { key: 'cartao' as PaymentMethod, icon: 'card-outline', label: 'Cartão' },
            { key: 'pix' as PaymentMethod, icon: 'qr-code-outline', label: 'PIX' },
            { key: 'boleto' as PaymentMethod, icon: 'barcode-outline', label: 'Boleto' },
          ]).map((m) => (
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

        {/* Formulário Cartão */}
        {paymentMethod === 'cartao' && (
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

        {/* PIX */}
        {paymentMethod === 'pix' && (
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

        {/* Boleto */}
        {paymentMethod === 'boleto' && (
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

        {/* Painel Sandbox */}
        {showSandbox && (
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
});
