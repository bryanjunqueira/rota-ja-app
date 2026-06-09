/**
 * Tela de Planos — Redesign completo com Bronze/Prata/Ouro
 *
 * Visual premium com cards metálicos, gradientes por tier,
 * lista de recursos, indicador de plano atual, e navegação
 * para checkout.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { COLORS, FONT_SIZES, SPACING, BORDER_RADIUS, SHADOWS } from '@/config/theme';
import {
  getPaidPlans,
  type PlanDefinition,
  type UserGroup,
  type PlanTier,
  TIER_ORDER,
  isUpgrade,
  getSubscriptionStatusLabel,
  TRIAL_DURATION_DAYS,
} from '@/config/plans';
import { PremiumBadge } from '@/components/PremiumBadge';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════════════
// CORES DOS TIERS PARA OS CARDS
// ═══════════════════════════════════════════════════
const TIER_CARD_COLORS: Record<PlanTier, {
  gradient: readonly [string, string];
  border: string;
  bg: string;
  accent: string;
}> = {
  gratuito: { gradient: ['#F1F5F9', '#E2E8F0'], border: '#E2E8F0', bg: '#F8FAFC', accent: '#64748B' },
  bronze: { gradient: ['#CD7F32', '#A0522D'], border: '#CD7F32', bg: '#FFF8F0', accent: '#8B4513' },
  prata: { gradient: ['#C0C0C0', '#8E99A4'], border: '#B8C4D0', bg: '#F8F9FC', accent: '#6B7B8D' },
  ouro: { gradient: ['#FFD700', '#FFA500'], border: '#FFD700', bg: '#FFFDF5', accent: '#D4920B' },
};

export default function PlanosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, role, logout } = useAuth();
  const { tier: currentTier, status, isTrialActive, daysRemaining, needsUpgrade } = useSubscription();
  const [tab, setTab] = useState<UserGroup>(role === 'empresa' ? 'empresa' : 'motorista');
  const activeTab = session && (role === 'motorista' || role === 'empresa') ? role : tab;

  // Animação de entrada dos cards
  const fadeAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Reset e rodar animações ao trocar tab
  useEffect(() => {
    fadeAnims.forEach((a) => a.setValue(0));
    const animations = fadeAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: i * 120,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, animations).start();
  }, [activeTab]);

  const plans = getPaidPlans(activeTab);

  const handleSelectPlan = (plan: PlanDefinition) => {
    if (session) {
      router.push(`/(auth)/checkout?planId=${plan.id}&tier=${plan.tier}&group=${plan.group}`);
    } else {
      if (plan.group === 'motorista') {
        router.push(`/(auth)/cadastro-motorista?plano=${plan.id}`);
      } else {
        router.push(`/(auth)/cadastro-empresa?plano=${plan.id}`);
      }
    }
  };

  const getButtonLabel = (plan: PlanDefinition): string => {
    if (!session) return `Começar com ${plan.shortName}`;
    if (plan.tier === currentTier) return 'Plano Atual';
    if (isUpgrade(currentTier, plan.tier)) return `Upgrade para ${plan.shortName}`;
    return `Mudar para ${plan.shortName}`;
  };

  const isCurrentPlan = (plan: PlanDefinition): boolean => {
    return plan.tier === currentTier && status === 'ativo';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {needsUpgrade ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutBtnText}>Sair</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Planos RotaJá</Text>
        <View style={{ width: needsUpgrade ? 60 : 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Lockout Banner */}
        {needsUpgrade && (
          <View style={styles.lockoutBanner}>
            <View style={styles.lockoutHeader}>
              <Ionicons name="lock-closed" size={24} color="#991B1B" />
              <Text style={styles.lockoutTitle}>Acesso Bloqueado</Text>
            </View>
            <Text style={styles.lockoutText}>
              Seu período de teste gratuito de 7 dias expirou. Para continuar utilizando o RotaJá e ter acesso a todas as cargas, publicação de fretes e recursos premium, escolha um de nossos planos abaixo.
            </Text>
          </View>
        )}

        {/* Hero */}
        <Text style={styles.mainTitle}>Escolha seu plano ideal</Text>
        <Text style={styles.subtitle}>
          Desbloqueie recursos premium e acelere seus resultados na estrada.
        </Text>

        {/* Trial Banner */}
        {isTrialActive && (
          <View style={styles.trialBanner}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={styles.trialText}>
              <Text style={{ fontWeight: '800' }}>{daysRemaining} dias</Text> restantes do período de teste
            </Text>
          </View>
        )}

        {/* Tabs Motorista / Empresa */}
        {!session && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, tab === 'motorista' && styles.tabActive]}
              onPress={() => setTab('motorista')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="car-sport"
                size={16}
                color={tab === 'motorista' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, tab === 'motorista' && styles.tabTextActive]}>
                Motoristas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'empresa' && styles.tabActive]}
              onPress={() => setTab('empresa')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="business"
                size={16}
                color={tab === 'empresa' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, tab === 'empresa' && styles.tabTextActive]}>
                Empresas
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plan Cards */}
        <View style={styles.cardsWrapper}>
          {plans.map((plan, index) => {
            const tierColors = TIER_CARD_COLORS[plan.tier];
            const isCurrent = isCurrentPlan(plan);
            const animStyle = {
              opacity: fadeAnims[index] || 1,
              transform: [
                {
                  translateY: (fadeAnims[index] || new Animated.Value(1)).interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            };

            return (
              <Animated.View key={plan.id} style={animStyle}>
                <View
                  style={[
                    styles.card,
                    {
                      borderColor: tierColors.border,
                      borderWidth: plan.recommended ? 2.5 : 1,
                    },
                    plan.recommended && styles.cardRecommended,
                    isCurrent && styles.cardCurrent,
                  ]}
                >
                  {/* Recommended Badge */}
                  {plan.recommended && (
                    <LinearGradient
                      colors={[...tierColors.gradient] as [string, string]}
                      style={styles.recommendedBadge}
                    >
                      <Ionicons name="star" size={11} color="#fff" />
                      <Text style={styles.recommendedText}>Mais Popular</Text>
                    </LinearGradient>
                  )}

                  {/* Current Plan Badge */}
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Ionicons name="checkmark-circle" size={11} color={COLORS.success} />
                      <Text style={styles.currentText}>Plano Atual</Text>
                    </View>
                  )}

                  {/* Plan Header */}
                  <View style={styles.planHeader}>
                    <View style={styles.planNameRow}>
                      <PremiumBadge tier={plan.tier} size="md" />
                      <Text style={styles.planName}>{plan.shortName}</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={[styles.planPrice, { color: tierColors.accent }]}>
                        {plan.price === 0
                          ? 'Grátis'
                          : `R$ ${(plan.price / 100).toFixed(0)}`}
                      </Text>
                      {plan.price > 0 && (
                        <Text style={styles.pricePeriod}>/mês</Text>
                      )}
                    </View>
                    <Text style={styles.planDesc}>{plan.description}</Text>
                  </View>

                  {/* Divider */}
                  <View style={styles.divider} />

                  {/* Features List */}
                  <View style={styles.featuresList}>
                    {plan.features.map((feature, i) => (
                      <View
                        key={i}
                        style={[
                          styles.featureRow,
                          feature.highlight && styles.featureHighlight,
                        ]}
                      >
                        <Ionicons
                          name={feature.included ? 'checkmark-circle' : 'close-circle'}
                          size={18}
                          color={
                            feature.included
                              ? feature.highlight
                                ? tierColors.accent
                                : COLORS.success
                              : COLORS.textTertiary
                          }
                        />
                        <Text
                          style={[
                            styles.featureText,
                            !feature.included && styles.featureTextDisabled,
                            feature.highlight && {
                              fontWeight: '700',
                              color: tierColors.accent,
                            },
                          ]}
                        >
                          {feature.text}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA Button */}
                  <TouchableOpacity
                    style={[
                      styles.selectBtn,
                      isCurrent && styles.selectBtnDisabled,
                    ]}
                    activeOpacity={isCurrent ? 1 : 0.8}
                    onPress={() => !isCurrent && handleSelectPlan(plan)}
                    disabled={isCurrent}
                  >
                    {isCurrent ? (
                      <View style={styles.selectBtnInner}>
                        <Ionicons name="checkmark" size={18} color={COLORS.success} />
                        <Text style={[styles.selectBtnText, { color: COLORS.success }]}>
                          {getButtonLabel(plan)}
                        </Text>
                      </View>
                    ) : (
                      <LinearGradient
                        colors={[...tierColors.gradient] as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.selectBtnGradient}
                      >
                        <Text style={styles.selectBtnTextWhite}>
                          {getButtonLabel(plan)}
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Footer info */}
        <View style={styles.footerInfo}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.textTertiary} />
          <Text style={styles.footerText}>
            Pagamento seguro · Cancele quando quiser · Sem fidelidade
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 15, paddingHorizontal: SPACING.lg,
    backgroundColor: '#fff', ...SHADOWS.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },

  mainTitle: {
    fontSize: 26, fontWeight: '800', color: COLORS.textPrimary,
    textAlign: 'center', marginTop: 10,
  },
  subtitle: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center',
    marginTop: 10, marginBottom: 20, paddingHorizontal: 10, lineHeight: 22,
  },

  // Trial banner
  trialBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primaryFaded, paddingVertical: 12,
    paddingHorizontal: 16, borderRadius: BORDER_RADIUS.lg, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(32, 148, 243, 0.2)',
  },
  trialText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  // Tabs
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#E2E8F0',
    borderRadius: BORDER_RADIUS.lg, padding: 4, marginBottom: 24,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: BORDER_RADIUS.md,
  },
  tabActive: { backgroundColor: '#fff', ...SHADOWS.sm },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },

  // Cards
  cardsWrapper: { gap: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    position: 'relative', ...SHADOWS.md,
  },
  cardRecommended: {
    ...SHADOWS.lg,
  },
  cardCurrent: {
    borderColor: COLORS.success,
    borderWidth: 2,
  },

  // Badges
  recommendedBadge: {
    position: 'absolute', top: -13, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  recommendedText: {
    color: '#fff', fontSize: 11, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  currentBadge: {
    position: 'absolute', top: -13, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.successLight, borderWidth: 1, borderColor: COLORS.success,
  },
  currentText: {
    color: COLORS.success, fontSize: 11, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Plan header
  planHeader: { marginBottom: 4 },
  planNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  planName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  planPrice: { fontSize: 36, fontWeight: '900' },
  pricePeriod: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginLeft: 2 },
  planDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

  // Divider
  divider: {
    height: 1, backgroundColor: COLORS.borderLight, marginVertical: 18,
  },

  // Features
  featuresList: { gap: 11, marginBottom: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureHighlight: {
    backgroundColor: 'rgba(32, 148, 243, 0.04)',
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 8, marginHorizontal: -8,
  },
  featureText: { fontSize: 14, color: COLORS.textPrimary, flex: 1, fontWeight: '500' },
  featureTextDisabled: { color: COLORS.textTertiary, textDecorationLine: 'line-through' },

  // CTA Button
  selectBtn: {
    borderRadius: BORDER_RADIUS.lg, overflow: 'hidden',
  },
  selectBtnDisabled: {
    backgroundColor: COLORS.successLight,
    borderRadius: BORDER_RADIUS.lg,
  },
  selectBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  selectBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  selectBtnText: { fontSize: 16, fontWeight: '700' },
  selectBtnTextWhite: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Footer
  footerInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 28, paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.error,
  },
  lockoutBanner: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 24,
    ...SHADOWS.sm,
  },
  lockoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  lockoutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
  },
  lockoutText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
});
