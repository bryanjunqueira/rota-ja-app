/**
 * Planos RotaJá — Fonte única de verdade (Single Source of Truth)
 *
 * Toda a definição de planos, preços, limites, permissões e visual
 * está centralizada aqui. NENHUM outro arquivo deve conter valores
 * fixos de planos. Sempre importe deste módulo.
 *
 * Arquitetura:
 *  - PlanTier: nível do plano (gratuito, bronze, prata, ouro)
 *  - UserGroup: grupo do usuário (motorista, empresa)
 *  - PlanPermissions: mapa de permissões booleanas/numéricas
 *  - PlanVisual: configuração visual (badge, cores, gradientes)
 *  - PlanDefinition: definição completa de um plano
 */

// ═══════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════

export type UserGroup = 'motorista' | 'empresa';
export type PlanTier = 'gratuito' | 'bronze' | 'prata' | 'ouro';
export type SubscriptionStatus = 'trial' | 'ativo' | 'expirado' | 'cancelado' | 'inadimplente';
export type PaymentStatus = 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'reembolsado';
export type PaymentMethod = 'cartao' | 'pix' | 'boleto';

/** Permissões derivadas do plano ativo */
export interface PlanPermissions {
  // ── Fretes ──
  canViewFreights: boolean;
  canPublishFreight: boolean;
  maxFreightsAvailable: number;       // Motorista: quantos fretes pode ver
  maxFreightsPerMonth: number;        // Empresa: quantos fretes pode publicar/mês
  hasUnlimitedFreights: boolean;

  // ── Prioridade ──
  canUsePriority: boolean;
  priorityLevel: number;              // 0=sem, 1=bronze, 2=prata, 3=ouro
  canViewExclusiveLoads: boolean;
  hasEarlyNotifications: boolean;

  // ── Perfil & Visibilidade ──
  hasPublicProfile: boolean;
  hasHighlightedProfile: boolean;
  highlightLevel: number;             // 0=sem, 1=básico, 2=médio, 3=máximo

  // ── Chat & Comunicação ──
  canUseChat: boolean;
  canUseChatAdvanced: boolean;

  // ── Relatórios ──
  canAccessBasicReports: boolean;
  canAccessFinancialReports: boolean;
  canAccessAdvancedReports: boolean;

  // ── Dashboard ──
  canAccessBasicDashboard: boolean;
  canAccessAdvancedDashboard: boolean;

  // ── Avaliações ──
  canUseRatings: boolean;
  canUseReputation: boolean;

  // ── Suporte ──
  hasPrioritySupport: boolean;
  hasVIPSupport: boolean;

  // ── Funcionalidades Premium ──
  hasSmartRoutes: boolean;
  hasBenefitsClub: boolean;
  hasRealTimeTracking: boolean;
  hasLogisticsAutomation: boolean;
  hasMultiBranch: boolean;

  // ── Empresa: Usuários ──
  maxUsers: number;

  // ── Histórico ──
  hasFullHistory: boolean;
}

/** Configuração visual do badge premium */
export interface PlanVisual {
  label: string;                       // "Verificado", "Profissional", "Premium"
  iconName: string;                    // Ionicons name
  borderColors: readonly [string, string];  // gradiente da borda
  badgeColors: readonly [string, string];   // gradiente do badge
  glowColor: string;                   // cor do glow (shadow)
  textColor: string;                   // cor do texto do badge
  backgroundColor: string;            // fundo do badge
  borderWidth: number;
  animated: boolean;                   // animação pulse (só Ouro)
  shimmer: boolean;                    // efeito shimmer
}

/** Recurso listado no card do plano */
export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;                 // destaque especial
}

/** Definição completa de um plano */
export interface PlanDefinition {
  id: string;                          // ex: "motorista_bronze"
  tier: PlanTier;
  group: UserGroup;
  name: string;                        // ex: "Motorista Bronze"
  shortName: string;                   // ex: "Bronze"
  price: number;                       // em centavos (6900 = R$ 69,00)
  priceFormatted: string;              // ex: "R$ 69/mês"
  description: string;
  recommended: boolean;
  features: PlanFeature[];
  permissions: PlanPermissions;
  visual: PlanVisual;
}

// ═══════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════

/** Duração do trial em dias */
export const TRIAL_DURATION_DAYS = 7;

/** Empresa — limites de publicação (fonte única, espelha motorista) */
export const EMPRESA_LIMITS = {
  gratuitoTrialTotal: 5,
  bronzeMonthly: 15,
  prataMonthly: 25,
} as const;

/** Ordem dos tiers (para comparação de upgrade/downgrade) */
export const TIER_ORDER: Record<PlanTier, number> = {
  gratuito: 0,
  bronze: 1,
  prata: 2,
  ouro: 3,
} as const;

// ═══════════════════════════════════════════════════
// VISUAL DOS TIERS
// ═══════════════════════════════════════════════════

export const TIER_VISUALS: Record<PlanTier, PlanVisual> = {
  gratuito: {
    label: '',
    iconName: '',
    borderColors: ['transparent', 'transparent'] as const,
    badgeColors: ['transparent', 'transparent'] as const,
    glowColor: 'transparent',
    textColor: '#64748B',
    backgroundColor: 'transparent',
    borderWidth: 0,
    animated: false,
    shimmer: false,
  },
  bronze: {
    label: 'Verificado',
    iconName: 'shield-checkmark',
    borderColors: ['#CD7F32', '#A0522D'] as const,
    badgeColors: ['#CD7F32', '#8B4513'] as const,
    glowColor: 'rgba(205, 127, 50, 0.3)',
    textColor: '#FFFFFF',
    backgroundColor: '#CD7F32',
    borderWidth: 2.5,
    animated: false,
    shimmer: false,
  },
  prata: {
    label: 'Profissional',
    iconName: 'star',
    borderColors: ['#C0C0C0', '#A8A8A8'] as const,
    badgeColors: ['#B8C4D0', '#8E99A4'] as const,
    glowColor: 'rgba(192, 192, 192, 0.35)',
    textColor: '#FFFFFF',
    backgroundColor: '#A8A8A8',
    borderWidth: 2.5,
    animated: false,
    shimmer: true,
  },
  ouro: {
    label: 'Premium',
    iconName: 'trophy',
    borderColors: ['#FFD700', '#FFA500'] as const,
    badgeColors: ['#FFD700', '#FF8C00'] as const,
    glowColor: 'rgba(255, 215, 0, 0.4)',
    textColor: '#FFFFFF',
    backgroundColor: '#FFB300',
    borderWidth: 3,
    animated: true,
    shimmer: true,
  },
} as const;

// ═══════════════════════════════════════════════════
// PERMISSÕES BASE POR TIER (MOTORISTA)
// ═══════════════════════════════════════════════════

const MOTORISTA_GRATUITO_PERMISSIONS: PlanPermissions = {
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

const MOTORISTA_BRONZE_PERMISSIONS: PlanPermissions = {
  ...MOTORISTA_GRATUITO_PERMISSIONS,
  maxFreightsAvailable: 10,
  hasPublicProfile: true,
  canUseChat: true,
  canUseRatings: true,
  canUseReputation: true,
  canAccessBasicReports: true,
  highlightLevel: 0,
};

const MOTORISTA_PRATA_PERMISSIONS: PlanPermissions = {
  ...MOTORISTA_BRONZE_PERMISSIONS,
  maxFreightsAvailable: 20,
  canUsePriority: true,
  priorityLevel: 2,
  hasHighlightedProfile: true,
  highlightLevel: 2,
  hasEarlyNotifications: true,
  canAccessFinancialReports: true,
  hasFullHistory: true,
  hasPrioritySupport: true,
};

const MOTORISTA_OURO_PERMISSIONS: PlanPermissions = {
  ...MOTORISTA_PRATA_PERMISSIONS,
  maxFreightsAvailable: 9999,
  hasUnlimitedFreights: true,
  priorityLevel: 3,
  canViewExclusiveLoads: true,
  highlightLevel: 3,
  canAccessAdvancedReports: true,
  canAccessAdvancedDashboard: true,
  hasVIPSupport: true,
  hasSmartRoutes: true,
  hasBenefitsClub: true,
};

// ═══════════════════════════════════════════════════
// PERMISSÕES BASE POR TIER (EMPRESA)
// ═══════════════════════════════════════════════════

const EMPRESA_GRATUITO_PERMISSIONS: PlanPermissions = {
  canViewFreights: true,
  canPublishFreight: true,
  maxFreightsAvailable: 0,
  /** Trial/gratuito: cap total no período de teste (não é mensal) */
  maxFreightsPerMonth: EMPRESA_LIMITS.gratuitoTrialTotal,
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

const EMPRESA_BRONZE_PERMISSIONS: PlanPermissions = {
  ...EMPRESA_GRATUITO_PERMISSIONS,
  canPublishFreight: true,
  maxFreightsPerMonth: EMPRESA_LIMITS.bronzeMonthly,
  hasPublicProfile: true,
  canUseChat: true,
  canAccessBasicReports: true,
  canAccessBasicDashboard: true,
  maxUsers: 1,
};

const EMPRESA_PRATA_PERMISSIONS: PlanPermissions = {
  ...EMPRESA_BRONZE_PERMISSIONS,
  maxFreightsPerMonth: EMPRESA_LIMITS.prataMonthly,
  canUsePriority: true,
  priorityLevel: 2,
  hasHighlightedProfile: true,
  highlightLevel: 2,
  canAccessFinancialReports: true,
  canAccessAdvancedDashboard: true,
  hasRealTimeTracking: true,
  hasPrioritySupport: true,
  maxUsers: 2,
};

const EMPRESA_OURO_PERMISSIONS: PlanPermissions = {
  ...EMPRESA_PRATA_PERMISSIONS,
  maxFreightsPerMonth: 9999,
  hasUnlimitedFreights: true,
  priorityLevel: 3,
  highlightLevel: 3,
  canAccessAdvancedReports: true,
  hasVIPSupport: true,
  hasLogisticsAutomation: true,
  hasMultiBranch: true,
  hasFullHistory: true,
  maxUsers: 4,
};

// ═══════════════════════════════════════════════════
// DEFINIÇÕES COMPLETAS DOS PLANOS
// ═══════════════════════════════════════════════════

export const PLANS: Record<string, PlanDefinition> = {
  // ────── MOTORISTA ──────

  motorista_gratuito: {
    id: 'motorista_gratuito',
    tier: 'gratuito',
    group: 'motorista',
    name: 'Plano Gratuito',
    shortName: 'Gratuito',
    price: 0,
    priceFormatted: 'Grátis',
    description: 'Explore a plataforma durante o período de teste.',
    recommended: false,
    features: [
      { text: 'Até 5 fretes disponíveis', included: true },
      { text: 'Chat básico', included: true },
      { text: 'Perfil simples', included: true },
      { text: 'Dashboard básico', included: true },
      { text: 'Prioridade nas candidaturas', included: false },
      { text: 'Relatórios financeiros', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
    permissions: MOTORISTA_GRATUITO_PERMISSIONS,
    visual: TIER_VISUALS.gratuito,
  },

  motorista_bronze: {
    id: 'motorista_bronze',
    tier: 'bronze',
    group: 'motorista',
    name: 'Motorista Bronze',
    shortName: 'Bronze',
    price: 6900,
    priceFormatted: 'R$ 69/mês',
    description: 'Para motoristas que querem crescer na plataforma.',
    recommended: false,
    features: [
      { text: 'Até 10 fretes disponíveis', included: true },
      { text: 'Perfil público no app', included: true },
      { text: 'Chat com empresas', included: true },
      { text: 'Sistema de avaliações', included: true },
      { text: 'Reputação', included: true },
      { text: 'Suporte básico', included: true },
      { text: 'Prioridade nas candidaturas', included: false },
      { text: 'Relatórios financeiros', included: false },
    ],
    permissions: MOTORISTA_BRONZE_PERMISSIONS,
    visual: TIER_VISUALS.bronze,
  },

  motorista_prata: {
    id: 'motorista_prata',
    tier: 'prata',
    group: 'motorista',
    name: 'Motorista Prata',
    shortName: 'Prata',
    price: 8900,
    priceFormatted: 'R$ 89/mês',
    description: 'Para motoristas profissionais que buscam destaque.',
    recommended: true,
    features: [
      { text: 'Tudo do Bronze +', included: true, highlight: true },
      { text: 'Até 20 fretes disponíveis', included: true },
      { text: 'Prioridade nas candidaturas', included: true },
      { text: 'Destaque nas buscas das empresas', included: true },
      { text: 'Relatórios financeiros', included: true },
      { text: 'Histórico completo', included: true },
      { text: 'Notificações antecipadas', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    permissions: MOTORISTA_PRATA_PERMISSIONS,
    visual: TIER_VISUALS.prata,
  },

  motorista_ouro: {
    id: 'motorista_ouro',
    tier: 'ouro',
    group: 'motorista',
    name: 'Motorista Ouro',
    shortName: 'Ouro',
    price: 10900,
    priceFormatted: 'R$ 109/mês',
    description: 'O plano definitivo para motoristas de elite.',
    recommended: false,
    features: [
      { text: 'Tudo do Prata +', included: true, highlight: true },
      { text: 'Fretes ilimitados', included: true },
      { text: 'Prioridade máxima', included: true },
      { text: 'Visualização antecipada exclusiva', included: true },
      { text: 'Perfil premium destacado', included: true },
      { text: 'Dashboard avançado', included: true },
      { text: 'Rotas inteligentes', included: true },
      { text: 'Clube de benefícios/parcerias', included: true },
      { text: 'Atendimento VIP', included: true },
    ],
    permissions: MOTORISTA_OURO_PERMISSIONS,
    visual: TIER_VISUALS.ouro,
  },

  // ────── EMPRESA ──────

  empresa_gratuito: {
    id: 'empresa_gratuito',
    tier: 'gratuito',
    group: 'empresa',
    name: 'Plano Gratuito',
    shortName: 'Gratuito',
    price: 0,
    priceFormatted: 'Grátis',
    description: `Período de teste de ${TRIAL_DURATION_DAYS} dias com até 5 publicações de frete.`,
    recommended: false,
    features: [
      { text: `Até ${EMPRESA_LIMITS.gratuitoTrialTotal} publicações no trial (${TRIAL_DURATION_DAYS} dias)`, included: true },
      { text: '1 usuário cadastrado', included: true },
      { text: 'Gestão básica', included: true },
      { text: 'Relatórios básicos', included: false },
      { text: 'Destaque dos fretes', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
    permissions: EMPRESA_GRATUITO_PERMISSIONS,
    visual: TIER_VISUALS.gratuito,
  },

  empresa_bronze: {
    id: 'empresa_bronze',
    tier: 'bronze',
    group: 'empresa',
    name: 'Empresa Bronze',
    shortName: 'Bronze',
    price: 19900,
    priceFormatted: 'R$ 199/mês',
    description: 'Para empresas que estão começando na plataforma.',
    recommended: false,
    features: [
      { text: `Até ${EMPRESA_LIMITS.bronzeMonthly} publicações de frete/mês`, included: true },
      { text: '1 usuário cadastrado', included: true },
      { text: 'Gestão básica', included: true },
      { text: 'Busca de motoristas', included: true },
      { text: 'Chat operacional', included: true },
      { text: 'Relatórios básicos', included: true },
      { text: 'Destaque dos fretes', included: false },
      { text: 'Rastreamento em tempo real', included: false },
    ],
    permissions: EMPRESA_BRONZE_PERMISSIONS,
    visual: TIER_VISUALS.bronze,
  },

  empresa_prata: {
    id: 'empresa_prata',
    tier: 'prata',
    group: 'empresa',
    name: 'Empresa Prata',
    shortName: 'Prata',
    price: 26900,
    priceFormatted: 'R$ 269/mês',
    description: 'Para empresas que buscam eficiência e destaque.',
    recommended: true,
    features: [
      { text: 'Tudo do Bronze +', included: true, highlight: true },
      { text: `Até ${EMPRESA_LIMITS.prataMonthly} publicações de frete/mês`, included: true },
      { text: 'Até 2 usuários', included: true },
      { text: 'Destaque médio dos fretes', included: true },
      { text: 'Prioridade para motoristas Prata', included: true },
      { text: 'Rastreamento em tempo real', included: true },
      { text: 'Relatórios financeiros', included: true },
      { text: 'Dashboard operacional', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    permissions: EMPRESA_PRATA_PERMISSIONS,
    visual: TIER_VISUALS.prata,
  },

  empresa_ouro: {
    id: 'empresa_ouro',
    tier: 'ouro',
    group: 'empresa',
    name: 'Empresa Ouro',
    shortName: 'Ouro',
    price: 35900,
    priceFormatted: 'R$ 359/mês',
    description: 'O plano completo para grandes operações logísticas.',
    recommended: false,
    features: [
      { text: 'Tudo do Prata +', included: true, highlight: true },
      { text: 'Publicação ilimitada', included: true },
      { text: 'Até 4 usuários', included: true },
      { text: 'Destaque máximo dos fretes', included: true },
      { text: 'Fretes entregues primeiro aos motoristas Ouro', included: true },
      { text: 'Gestão avançada', included: true },
      { text: 'Relatórios completos', included: true },
      { text: 'Multi-filiais', included: true },
      { text: 'Automação logística', included: true },
      { text: 'Atendimento VIP dedicado', included: true },
    ],
    permissions: EMPRESA_OURO_PERMISSIONS,
    visual: TIER_VISUALS.ouro,
  },
} as const;

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

/** Retorna os planos de um grupo específico (excluindo gratuito) */
export function getPaidPlans(group: UserGroup): PlanDefinition[] {
  return Object.values(PLANS).filter(
    (p) => p.group === group && p.tier !== 'gratuito'
  );
}

/** Retorna todos os planos de um grupo (incluindo gratuito) */
export function getAllPlans(group: UserGroup): PlanDefinition[] {
  return Object.values(PLANS).filter((p) => p.group === group);
}

/** Retorna a definição de um plano por tier e grupo */
export function getPlan(group: UserGroup, tier: PlanTier): PlanDefinition {
  const key = `${group}_${tier}`;
  return PLANS[key] || PLANS[`${group}_gratuito`];
}

/** Retorna as permissões de um plano */
export function getPermissions(group: UserGroup, tier: PlanTier): PlanPermissions {
  return getPlan(group, tier).permissions;
}

/** Empresa gratuita/trial: limite total no período (como motorista gratuito). Planos pagos: limite mensal. */
export function isEmpresaGratuitoLifetimeLimit(tier: PlanTier): boolean {
  return tier === 'gratuito';
}

/** Retorna o visual de um tier */
export function getTierVisual(tier: PlanTier): PlanVisual {
  return TIER_VISUALS[tier] || TIER_VISUALS.gratuito;
}

/** Verifica se é upgrade (novo tier > atual) */
export function isUpgrade(currentTier: PlanTier, newTier: PlanTier): boolean {
  return TIER_ORDER[newTier] > TIER_ORDER[currentTier];
}

/** Verifica se é downgrade (novo tier < atual) */
export function isDowngrade(currentTier: PlanTier, newTier: PlanTier): boolean {
  return TIER_ORDER[newTier] < TIER_ORDER[currentTier];
}

/** Formata preço de centavos para string */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Grátis';
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

/** Retorna label amigável do status da assinatura */
export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    trial: 'Período de Teste',
    ativo: 'Ativo',
    expirado: 'Expirado',
    cancelado: 'Cancelado',
    inadimplente: 'Inadimplente',
  };
  return labels[status] || status;
}

/** Retorna cor do status */
export function getSubscriptionStatusColor(status: SubscriptionStatus): { text: string; bg: string } {
  const colors: Record<SubscriptionStatus, { text: string; bg: string }> = {
    trial: { text: '#3B82F6', bg: '#DBEAFE' },
    ativo: { text: '#10B981', bg: '#D1FAE5' },
    expirado: { text: '#EF4444', bg: '#FEE2E2' },
    cancelado: { text: '#6B7280', bg: '#F3F4F6' },
    inadimplente: { text: '#F59E0B', bg: '#FEF3C7' },
  };
  return colors[status] || colors.expirado;
}
