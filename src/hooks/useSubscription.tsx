/**
 * Hook de Assinatura — gerencia estado da assinatura e permissões.
 * Provê contexto global de subscription para todo o app.
 *
 * Responsabilidades:
 * - Carregar assinatura do usuário
 * - Verificar status (trial expirado, assinatura vencida)
 * - Fornecer permissões derivadas do plano
 * - Fornecer helpers (isPremium, isTrialActive, daysRemaining, etc)
 * - Expor ações (refresh, upgrade)
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AssinaturasService } from '@/services/assinaturas.service';
import type { AssinaturaData } from '@/services/assinaturas.service';
import {
  type PlanTier,
  type UserGroup,
  type PlanPermissions,
  type PlanDefinition,
  type SubscriptionStatus,
  getPlan,
  getPermissions,
  getTierVisual,
  type PlanVisual,
  TIER_ORDER,
} from '@/config/plans';

// ═══════════════════════════════════════════════════
// TIPOS DO CONTEXTO
// ═══════════════════════════════════════════════════

interface SubscriptionContextType {
  // ── Estado ──
  subscription: AssinaturaData | null;
  plan: PlanDefinition | null;
  loading: boolean;
  initialized: boolean;

  // ── Status helpers ──
  tier: PlanTier;
  status: SubscriptionStatus | null;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPremium: boolean;
  isActive: boolean;
  needsUpgrade: boolean;
  daysRemaining: number;

  // ── Permissões ──
  permissions: PlanPermissions;
  can: (permission: keyof PlanPermissions) => boolean;
  getLimit: (permission: keyof PlanPermissions) => number;

  // ── Visual ──
  visual: PlanVisual;

  // ── Ações ──
  refreshSubscription: () => Promise<void>;
}

// Permissões padrão (gratuito) para fallback
const DEFAULT_PERMISSIONS: PlanPermissions = {
  canViewFreights: true,
  canPublishFreight: false,
  maxFreightsAvailable: 5,
  maxFreightsPerMonth: 0,
  hasUnlimitedFreights: false,
  canUsePriority: false,
  priorityLevel: 0,
  canViewExclusiveLoads: false,
  hasEarlyNotifications: false,
  hasPublicProfile: false,
  hasHighlightedProfile: false,
  highlightLevel: 0,
  canUseChat: true,
  canUseChatAdvanced: false,
  canAccessBasicReports: false,
  canAccessFinancialReports: false,
  canAccessAdvancedReports: false,
  canAccessBasicDashboard: true,
  canAccessAdvancedDashboard: false,
  canUseRatings: false,
  canUseReputation: false,
  hasPrioritySupport: false,
  hasVIPSupport: false,
  hasSmartRoutes: false,
  hasBenefitsClub: false,
  hasRealTimeTracking: false,
  hasLogisticsAutomation: false,
  hasMultiBranch: false,
  maxUsers: 1,
  hasFullHistory: false,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════

interface SubscriptionProviderProps {
  children: React.ReactNode;
  userId: string | null;
  userGroup: UserGroup | null;
}

export function SubscriptionProvider({ children, userId, userGroup }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<AssinaturaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [needsUpgradeState, setNeedsUpgradeState] = useState(false);

  // ── Carregar assinatura ──
  const loadSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const result = await AssinaturasService.verificarStatus(userId);
      if (!result.data && userGroup) {
        // Criar trial automático em background para contas existentes que não o possuem
        const trialResult = await AssinaturasService.criarTrialAutomatico(userId, userGroup);
        if (trialResult.success && trialResult.data) {
          setSubscription(trialResult.data);
          setNeedsUpgradeState(false);
        } else {
          setSubscription(null);
          setNeedsUpgradeState(false);
        }
      } else {
        setSubscription(result.data);
        setNeedsUpgradeState(result.needsUpgrade);
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [userId]);

  // Refresh público
  const refreshSubscription = useCallback(async () => {
    setLoading(true);
    await loadSubscription();
  }, [loadSubscription]);

  // Carregar no mount e quando userId mudar
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // ── Derivar valores do estado ──
  const tier: PlanTier = (subscription?.tipo_plano as PlanTier) || 'gratuito';
  const status: SubscriptionStatus | null = (subscription?.status_assinatura as SubscriptionStatus) || null;
  const group: UserGroup = userGroup || (subscription?.tipo_usuario as UserGroup) || 'motorista';

  const plan = useMemo(() => {
    return getPlan(group, tier);
  }, [group, tier]);

  const permissions = useMemo(() => {
    // Se assinatura ativa ou trial, usar permissões do plano
    if (status === 'ativo' || status === 'trial') {
      return getPermissions(group, tier);
    }
    // Se expirado/cancelado/inadimplente, permissões gratuitas
    return getPermissions(group, 'gratuito');
  }, [group, tier, status]);

  const visual = useMemo(() => {
    if (status === 'ativo' || status === 'trial') {
      return getTierVisual(tier);
    }
    return getTierVisual('gratuito');
  }, [tier, status]);

  const isTrialActive = status === 'trial' && !!subscription?.trial_fim && new Date() < new Date(subscription.trial_fim);
  const isTrialExpired = status === 'trial' && !!subscription?.trial_fim && new Date() >= new Date(subscription.trial_fim);
  const isPremium = status === 'ativo' && tier !== 'gratuito';
  const isActive = status === 'ativo' || isTrialActive;

  const daysRemaining = useMemo(() => {
    if (!subscription) return 0;
    return AssinaturasService.calcularDiasRestantes(subscription);
  }, [subscription]);

  // ── Checkers de permissão ──
  const can = useCallback(
    (permission: keyof PlanPermissions): boolean => {
      const val = permissions[permission];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
      return false;
    },
    [permissions]
  );

  const getLimit = useCallback(
    (permission: keyof PlanPermissions): number => {
      const val = permissions[permission];
      if (typeof val === 'number') return val;
      return 0;
    },
    [permissions]
  );

  const value: SubscriptionContextType = {
    subscription,
    plan,
    loading,
    initialized,
    tier,
    status,
    isTrialActive,
    isTrialExpired,
    isPremium,
    isActive,
    needsUpgrade: needsUpgradeState,
    daysRemaining,
    permissions,
    can,
    getLimit,
    visual,
    refreshSubscription,
  };

  return React.createElement(SubscriptionContext.Provider, { value, children });
}

// ═══════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription deve ser usado dentro de SubscriptionProvider');
  return ctx;
}
