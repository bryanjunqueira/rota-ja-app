/**
 * Webhook Stripe → atualiza assinatura no Supabase (service_role + RPC aplicar_plano_stripe)
 *
 * Secrets (supabase secrets set):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/** price_id → tier (lê os mesmos secrets STRIPE_PRICE_* do create-checkout-session) */
function buildPriceToTier(): Record<string, string> {
  const entries: [string, string][] = [
    [Deno.env.get('STRIPE_PRICE_MOTORISTA_BRONZE') ?? 'price_1TaxoePFQwuRFQbNH58ShlMn', 'bronze'],
    [Deno.env.get('STRIPE_PRICE_MOTORISTA_PRATA') ?? 'price_1TaxoyPFQwuRFQbNFm5cyIWf', 'prata'],
    [Deno.env.get('STRIPE_PRICE_MOTORISTA_OURO') ?? 'price_1TaxpIPFQwuRFQbN95waf4Cc', 'ouro'],
    [Deno.env.get('STRIPE_PRICE_EMPRESA_BRONZE') ?? 'price_1TaxpePFQwuRFQbNIoaaNdXw', 'bronze'],
    [Deno.env.get('STRIPE_PRICE_EMPRESA_PRATA') ?? 'price_1TaxqEPFQwuRFQbNbznxFmgG', 'prata'],
    [Deno.env.get('STRIPE_PRICE_EMPRESA_OURO') ?? 'price_1TaxqfPFQwuRFQbND81JoD0H', 'ouro'],
  ];
  const map: Record<string, string> = {};
  for (const [priceId, tier] of entries) {
    if (priceId) map[priceId] = tier;
  }
  return map;
}

function resolveTier(
  metadata: Record<string, string> | null | undefined,
  priceId?: string | null
): string | null {
  if (metadata?.plan_tier) return metadata.plan_tier;
  const priceMap = buildPriceToTier();
  if (priceId && priceMap[priceId]) return priceMap[priceId];
  return null;
}

function resolveGroup(metadata: Record<string, string> | null | undefined): string | null {
  const group = metadata?.user_group;
  return group === 'motorista' || group === 'empresa' ? group : null;
}

function mergeMetadata(...sources: Array<Record<string, string> | null | undefined>): Record<string, string> {
  return Object.assign({}, ...sources.filter(Boolean)) as Record<string, string>;
}

async function resolveFromStoredSubscription(
  supabase: any,
  subscriptionId?: string | null,
  customerId?: string | null
): Promise<{ userId: string | null; tier: string | null; group: string | null }> {
  let query = supabase
    .from('assinaturas')
    .select('user_id, tipo_plano, tipo_usuario')
    .limit(1);

  if (subscriptionId) {
    query = query.eq('stripe_subscription_id', subscriptionId);
  } else if (customerId) {
    query = query.eq('stripe_customer_id', customerId);
  } else {
    return { userId: null, tier: null, group: null };
  }

  const { data } = await query.maybeSingle();
  return {
    userId: data?.user_id ?? null,
    tier: data?.tipo_plano ?? null,
    group: data?.tipo_usuario ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Webhook não configurado', { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe signature error:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'invoice.paid'
    ) {
      const obj = event.data.object as any;
      let metadata = mergeMetadata(obj.metadata as Record<string, string> | undefined);

      let userId: string | null = metadata?.user_id ?? null;
      let tier = resolveTier(metadata);
      let group = resolveGroup(metadata);
      let customerId: string | null = null;
      let subscriptionId: string | null = null;
      let priceId: string | null = null;

      if (event.type === 'checkout.session.completed') {
        const session = obj as Stripe.Checkout.Session;
        userId = userId ?? session.client_reference_id ?? null;
        customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;
      }

      if (event.type === 'invoice.paid') {
        const invoice = obj as any;
        metadata = mergeMetadata(invoice.subscription_details?.metadata, invoice.metadata);
        userId = userId ?? metadata?.user_id ?? null;
        group = group ?? resolveGroup(metadata);
        customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
        subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id ?? null;
        const line = invoice.lines?.data?.[0];
        priceId =
          typeof line?.price === 'string' ? line.price : line?.price?.id ?? null;
        if (!tier) tier = resolveTier(metadata, priceId);
      }

      if (subscriptionId && (!userId || !tier || !group)) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subscriptionMetadata = subscription.metadata as Record<string, string>;
        userId = userId ?? subscriptionMetadata?.user_id ?? null;
        tier = tier ?? resolveTier(subscriptionMetadata, priceId);
        group = group ?? resolveGroup(subscriptionMetadata);
        customerId =
          customerId ??
          (typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null);
      }

      if (!userId && (subscriptionId || customerId)) {
        const stored = await resolveFromStoredSubscription(supabase, subscriptionId, customerId);
        userId = stored.userId;
        tier = tier ?? stored.tier;
        group = group ?? stored.group;
      }

      if (!userId || !tier || !group) {
        console.warn('Evento Stripe sem user_id, plan_tier ou user_group', event.type);
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase.rpc('aplicar_plano_stripe', {
        p_user_id: userId,
        p_novo_plano: tier,
        p_stripe_customer_id: customerId,
        p_stripe_subscription_id: subscriptionId,
        p_acao: event.type,
        p_tipo_usuario: group,
      });

      if (error) {
        console.error('RPC aplicar_plano_stripe:', error);
        return new Response(error.message, { status: 500 });
      }

      console.log('Plano aplicado:', data);
    }

    if (
      event.type === 'customer.subscription.deleted' ||
      event.type === 'invoice.payment_failed'
    ) {
      const obj = event.data.object as any;
      let metadata = mergeMetadata(obj.subscription_details?.metadata, obj.metadata);
      let userId: string | null = metadata?.user_id ?? null;
      let customerId: string | null =
        typeof obj.customer === 'string' ? obj.customer : obj.customer?.id ?? null;
      let subscriptionId: string | null =
        typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id ?? null;

      if (!subscriptionId && event.type === 'customer.subscription.deleted') {
        subscriptionId = obj.id ?? null;
      }

      if (subscriptionId && !userId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        userId = subscription.metadata?.user_id ?? null;
        customerId =
          customerId ??
          (typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null);
      }

      if (!userId && (subscriptionId || customerId)) {
        const stored = await resolveFromStoredSubscription(supabase, subscriptionId, customerId);
        userId = stored.userId;
      }

      if (userId) {
        await supabase
          .from('assinaturas')
          .update({
            tipo_plano: 'gratuito',
            status_assinatura:
              event.type === 'invoice.payment_failed' ? 'inadimplente' : 'expirado',
            status_pagamento: 'recusado',
          })
          .eq('user_id', userId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Internal error', { status: 500 });
  }
});
