/**
 * Mapeamento plano RotaJá ↔ Stripe Price IDs
 * Crie os produtos/preços no Stripe Dashboard e preencha os IDs nos secrets do Supabase.
 */
import type { PlanTier, UserGroup } from './plans';

export type StripePlanKey = `${UserGroup}_${PlanTier}`;

/** IDs dos Prices no Stripe (mode: subscription, recurring monthly) */
export const STRIPE_PRICE_IDS: Partial<Record<StripePlanKey, string>> = {
  motorista_bronze: 'price_1TfjDY4v2T43THsUhrUsvwOn',
  motorista_prata: 'price_1TfjDo4v2T43THsUimKvH0Wt',
  motorista_ouro: 'price_1TfjEA4v2T43THsUSqGk5gxI',
  empresa_bronze: 'price_1TfjEQ4v2T43THsUIXOxM29p',
  empresa_prata: 'price_1TfjEi4v2T43THsUUasaaFH0',
  empresa_ouro: 'price_1TfjEy4v2T43THsUnnxQ46A7',
};

/** Metadata enviada ao Stripe Checkout — usada no webhook */
export function getStripePlanMetadata(userId: string, group: UserGroup, tier: PlanTier) {
  return {
    user_id: userId,
    plan_tier: tier,
    user_group: group,
  };
}

export function getStripePriceId(group: UserGroup, tier: PlanTier): string | null {
  if (tier === 'gratuito') return null;
  const key = `${group}_${tier}` as StripePlanKey;
  return STRIPE_PRICE_IDS[key] ?? null;
}

/** Resolve tier a partir do price_id (webhook) */
export function tierFromStripePriceId(priceId: string): { group: UserGroup; tier: PlanTier } | null {
  for (const [key, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id === priceId) {
      const [group, tier] = key.split('_') as [UserGroup, PlanTier];
      return { group, tier };
    }
  }
  return null;
}
