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

  /**
   * Verifica diretamente na Stripe se há assinatura ativa e força
   * a ativação do plano no banco via service_role.
   * Usado como fallback quando o webhook demora ou falha.
   */
  async verifySubscription(sessionId?: string, targetTier?: PlanTier): Promise<{
    activated: boolean;
    plan?: string;
    source?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-subscription', {
        body: { sessionId, targetTier },
      });

      if (error) {
        return { activated: false, error: error.message };
      }

      const payload = data as {
        activated?: boolean;
        plan?: string;
        source?: string;
        error?: string;
        message?: string;
      };

      if (payload?.error) {
        return { activated: false, error: payload.error };
      }

      return {
        activated: payload?.activated ?? false,
        plan: payload?.plan,
        source: payload?.source,
      };
    } catch (e) {
      console.error('[StripeCheckout] verifySubscription:', e);
      return { activated: false, error: 'Erro ao verificar assinatura.' };
    }
  },
};
