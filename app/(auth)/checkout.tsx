import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '@/config/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const { plan, category } = useLocalSearchParams();
  const [paymentMethod, setPaymentMethod] = useState<'cartao' | 'pix' | 'boleto'>('cartao');

  // Nomes de planos mockados para exibição
  const planNames: Record<string, string> = {
    'mot_basico': 'Básico Motorista',
    'mot_pro': 'Pro Motorista',
    'emp_standard': 'Standard Empresa',
    'emp_enterprise': 'Enterprise Empresa',
  };

  const planPrices: Record<string, string> = {
    'mot_basico': 'R$ 0,00',
    'mot_pro': 'R$ 29,90/mês',
    'emp_standard': 'R$ 99,90/mês',
    'emp_enterprise': 'R$ 299,90/mês',
  };

  const selectedPlanName = planNames[plan as string] || 'Plano Selecionado';
  const selectedPlanPrice = planPrices[plan as string] || 'R$ --,--';

  const handleFinish = () => {
    // Apenas simulação de fluxo
    alert('Assinatura confirmada! Bem-vindo ao RotaJá.');
    router.replace('/(app)/dashboard');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finalizar Assinatura</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Resumo do Pedido */}
        <View style={styles.summaryCard}>
          <Text style={styles.welcomeText}>Ótima escolha!</Text>
          <Text style={styles.summaryTitle}>Você selecionou o plano:</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planName}>{selectedPlanName}</Text>
            <Text style={styles.planPrice}>{selectedPlanPrice}</Text>
          </View>
          <Text style={styles.billingInfo}>Cobrança recorrente mensal. Cancele quando quiser.</Text>
        </View>

        <Text style={styles.sectionTitle}>Forma de Pagamento</Text>

        {/* Métodos de Pagamento */}
        <View style={styles.methodsContainer}>
          <TouchableOpacity 
            style={[styles.methodCard, paymentMethod === 'cartao' && styles.methodActive]}
            onPress={() => setPaymentMethod('cartao')}
          >
            <Ionicons name="card-outline" size={28} color={paymentMethod === 'cartao' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.methodText, paymentMethod === 'cartao' && styles.methodTextActive]}>Cartão</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.methodCard, paymentMethod === 'pix' && styles.methodActive]}
            onPress={() => setPaymentMethod('pix')}
          >
            <Ionicons name="qr-code-outline" size={28} color={paymentMethod === 'pix' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.methodText, paymentMethod === 'pix' && styles.methodTextActive]}>PIX</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.methodCard, paymentMethod === 'boleto' && styles.methodActive]}
            onPress={() => setPaymentMethod('boleto')}
          >
            <Ionicons name="barcode-outline" size={28} color={paymentMethod === 'boleto' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.methodText, paymentMethod === 'boleto' && styles.methodTextActive]}>Boleto</Text>
          </TouchableOpacity>
        </View>

        {/* Formulário Simulado */}
        {paymentMethod === 'cartao' && (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número do Cartão</Text>
              <TextInput style={styles.input} placeholder="0000 0000 0000 0000" keyboardType="numeric" />
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Validade</Text>
                <TextInput style={styles.input} placeholder="MM/AA" keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput style={styles.input} placeholder="123" keyboardType="numeric" secureTextEntry />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome impresso no cartão</Text>
              <TextInput style={styles.input} placeholder="NOME COMPLETO" autoCapitalize="characters" />
            </View>
          </View>
        )}

        {paymentMethod === 'pix' && (
          <View style={styles.pixContainer}>
            <Ionicons name="qr-code" size={100} color={COLORS.textSecondary} style={{ opacity: 0.2 }} />
            <Text style={styles.pixText}>O código PIX será gerado na próxima etapa.</Text>
          </View>
        )}

      </ScrollView>

      {/* Footer Fixo */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a pagar hoje:</Text>
          <Text style={styles.totalValue}>{selectedPlanPrice}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleFinish} activeOpacity={0.8}>
          <Text style={styles.checkoutBtnText}>Confirmar e Assinar</Text>
          <Ionicons name="lock-closed" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: SPACING.lg,
    backgroundColor: '#fff', ...SHADOWS.sm, zIndex: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.lg, paddingBottom: 100 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg, padding: 24,
    marginBottom: 30, ...SHADOWS.sm, borderWidth: 1, borderColor: '#E2E8F0',
  },
  welcomeText: { fontSize: 16, color: COLORS.primary, fontWeight: '700', marginBottom: 4 },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  planBadge: {
    backgroundColor: '#F1F5F9', padding: 16, borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  planName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  planPrice: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  billingInfo: { fontSize: 13, color: COLORS.textSecondary },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  methodsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  methodCard: {
    flex: 1, backgroundColor: '#fff', paddingVertical: 16, borderRadius: BORDER_RADIUS.md,
    alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  methodActive: { borderColor: COLORS.primary, backgroundColor: '#F0F9FF' },
  methodText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  methodTextActive: { color: COLORS.primary },

  formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm },
  inputGroup: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: 16, height: 50,
    fontSize: 15, color: COLORS.textPrimary,
  },

  pixContainer: { alignItems: 'center', padding: 40, backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm },
  pixText: { marginTop: 16, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: SPACING.lg, paddingBottom: 30,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', ...SHADOWS.md,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary },
  checkoutBtn: {
    backgroundColor: COLORS.primary, height: 56, borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
