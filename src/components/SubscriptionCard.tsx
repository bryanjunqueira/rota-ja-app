/**
 * SubscriptionCard — Card compacto de informação da assinatura
 *
 * Exibe no perfil/dashboard:
 * - Plano atual com badge
 * - Status (trial/ativo/expirado)
 * - Dias restantes com barra de progresso
 * - Botão de upgrade/gerenciar
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumBadge } from './PremiumBadge';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '@/config/theme';
import {
  getSubscriptionStatusLabel,
  getSubscriptionStatusColor,
  TRIAL_DURATION_DAYS,
} from '@/config/plans';

interface SubscriptionCardProps {
  compact?: boolean;
  style?: any;
}

export function SubscriptionCard({ compact = false, style }: SubscriptionCardProps) {
  const router = useRouter();
  const {
    plan,
    tier,
    status,
    isTrialActive,
    isPremium,
    isActive,
    daysRemaining,
    needsUpgrade,
  } = useSubscription();

  if (!plan || !status) return null;

  const statusInfo = getSubscriptionStatusColor(status);
  const statusLabel = getSubscriptionStatusLabel(status);

  // Progresso do trial (7 dias → 0 dias)
  const trialProgress = isTrialActive
    ? Math.max(0, Math.min(1, daysRemaining / TRIAL_DURATION_DAYS))
    : 0;

  const handlePress = () => {
    router.push('/(auth)/planos');
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.compactLeft}>
          <PremiumBadge tier={tier} size="sm" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.compactPlanName}>{plan.shortName}</Text>
            <Text style={[styles.compactStatus, { color: statusInfo.text }]}>
              {statusLabel}
              {daysRemaining > 0 && isActive ? ` · ${daysRemaining}d` : ''}
            </Text>
          </View>
        </View>
        {needsUpgrade || tier === 'gratuito' ? (
          <View style={styles.upgradePill}>
            <Ionicons name="arrow-up-circle" size={14} color={COLORS.primary} />
            <Text style={styles.upgradeText}>Upgrade</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {/* Header do card */}
      <View style={styles.cardHeader}>
        <View style={styles.planInfo}>
          <PremiumBadge tier={tier} size="md" showLabel />
          <Text style={styles.planName}>{plan.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.text }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Trial progress bar */}
      {isTrialActive && (
        <View style={styles.trialSection}>
          <View style={styles.trialHeader}>
            <Text style={styles.trialLabel}>Período de teste</Text>
            <Text style={styles.trialDays}>
              {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'} restantes
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${trialProgress * 100}%`,
                  backgroundColor:
                    trialProgress > 0.5
                      ? COLORS.primary
                      : trialProgress > 0.25
                      ? COLORS.warning
                      : COLORS.error,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Informações adicionais */}
      {isPremium && (
        <View style={styles.premiumInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              Renova em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{plan.priceFormatted}</Text>
          </View>
        </View>
      )}

      {/* Botão de ação */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          needsUpgrade && styles.actionBtnHighlight,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.actionBtnText,
            needsUpgrade && styles.actionBtnTextHighlight,
          ]}
        >
          {needsUpgrade
            ? 'Escolher um Plano'
            : tier === 'ouro'
            ? 'Gerenciar Assinatura'
            : 'Fazer Upgrade'}
        </Text>
        <Ionicons
          name={needsUpgrade ? 'arrow-forward' : 'chevron-forward'}
          size={16}
          color={needsUpgrade ? '#fff' : COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Card completo ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 20,
    ...SHADOWS.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Trial section ──
  trialSection: {
    marginBottom: 16,
  },
  trialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trialLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  trialDays: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Premium info ──
  premiumInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // ── Action button ──
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  actionBtnHighlight: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionBtnTextHighlight: {
    color: '#fff',
  },

  // ── Compact variant ──
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...SHADOWS.sm,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactPlanName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  compactStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  upgradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryFaded,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
