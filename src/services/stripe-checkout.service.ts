/**
 * Integração Stripe Checkout via Supabase Edge Function.
 * Ative com EXPO_PUBLIC_PAYMENTS_MODE=stripe no .env
 */
import { supabase } from '@/lib/supabase';
import type { PlanTier, UserGroup, PaymentMethod } from '@/config/plans';

export const StripeCheckoutService = {
  async criarSessaoCheckout(
    tier: PlanTier,
    group: UserGroup,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
      metodoPagamento?: PaymentMethod;
      amountCents?: number;
    }
  ): Promise<{ url: string | null; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          tier,
          group,
          successUrl: options?.successUrl,
          cancelUrl: options?.cancelUrl,
          metodoPagamento: options?.metodoPagamento ?? 'cartao',
          amountCents: options?.amountCents,
        },
      });

      if (error) {
        return { url: null, error: error.message };
      }

      const payload = data as { url?: string; error?: string };
      if (payload?.error) {
        return { url: null, error: payload.error };
      }

      return { url: payload?.url ?? null };
    } catch (e) {
      console.error('[StripeCheckout]', e);
      return { url: null, error: 'Não foi possível iniciar o pagamento.' };
    }
  },
};
