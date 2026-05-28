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

async function enviarEmailConfirmacao(email: string, planName: string, userGroup: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('APPROVAL_FROM_EMAIL') ?? 'RotaJa <onboarding@resend.dev>';

  if (!resendKey) {
    console.warn('RESEND_API_KEY não configurado. Ignorando envio de e-mail.');
    return;
  }

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #2094f3; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Rota Já</h1>
        <p style="color: #718096; margin: 4px 0 0 0; font-size: 14px;">Logística rápida e inteligente</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #2094f3 0%, #1e40af 100%); color: #ffffff; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
        <span style="background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Confirmado</span>
        <h2 style="margin: 12px 0 4px 0; font-size: 22px; font-weight: 700;">Assinatura Ativada!</h2>
        <p style="margin: 0; opacity: 0.9; font-size: 15px;">Seu plano <strong style="text-transform: capitalize;">${planName}</strong> já está ativo.</p>
      </div>

      <div style="margin-bottom: 24px; color: #2d3748; line-height: 1.6;">
        <p style="margin: 0 0 12px 0; font-size: 16px;">Olá,</p>
        <p style="margin: 0 0 16px 0; font-size: 15px;">Confirmamos o recebimento do seu pagamento via Stripe. Todos os recursos e limites do seu novo plano foram ativados na sua conta.</p>
        
        <div style="background-color: #f7fafc; padding: 16px; border-radius: 8px; border: 1px solid #edf2f7; margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #4a5568; letter-spacing: 0.5px;">Detalhes do Plano</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #718096; font-size: 14px;">Plano:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #2d3748; font-size: 14px; text-transform: capitalize;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096; font-size: 14px;">Tipo de Usuário:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #2d3748; font-size: 14px; text-transform: capitalize;">${userGroup === 'motorista' ? 'Motorista' : 'Empresa'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096; font-size: 14px;">Status da Assinatura:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #48bb78; font-size: 14px;">Ativo</td>
            </tr>
          </table>
        </div>

        <p style="margin: 0 0 24px 0; font-size: 15px; text-align: center;">Abra o aplicativo RotaJá para começar a aproveitar os recursos agora mesmo!</p>
      </div>

      <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 24px 0;" />
      
      <div style="text-align: center; color: #a0aec0; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;">© 2026 RotaJá. Todos os direitos reservados.</p>
        <p style="margin: 0;">Você está recebendo este e-mail porque realizou uma assinatura no app RotaJá.</p>
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `RotaJá: Seu plano ${planName.toUpperCase()} está ativo! 🎉`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Erro ao enviar e-mail via Resend para ${email}:`, errText);

      // Se falhar (por exemplo, erro 403 de restrição de sandbox do Resend),
      // tentamos enviar para o e-mail do proprietário da conta cadastrada nos secrets
      const ownerEmail = Deno.env.get('APP_OWNER_EMAIL');
      if (ownerEmail && ownerEmail !== email) {
        console.log(`Tentando enviar cópia sandbox para o e-mail do proprietário: ${ownerEmail}`);
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [ownerEmail],
            subject: `[Sandbox Copy] RotaJá: Plano ${planName.toUpperCase()} ativo para ${email}! 🎉`,
            html,
          }),
        });
      }
    } else {
      console.log(`E-mail de confirmação enviado com sucesso para: ${email}`);
    }
  } catch (err) {
    console.error('Exceção ao chamar API Resend:', err);
  }
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

      // Busca a assinatura atual do banco para verificar se mudou
      let oldSubscriptionId: string | null = null;
      try {
        const { data: currentAssinatura } = await supabase
          .from('assinaturas')
          .select('stripe_subscription_id')
          .eq('user_id', userId)
          .maybeSingle();
        oldSubscriptionId = currentAssinatura?.stripe_subscription_id ?? null;
      } catch (err) {
        console.error('Erro ao buscar assinatura atual para verificar upgrade:', err);
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

      const rpcPayload = data as { success?: boolean; new_activation?: boolean };

      // Se a assinatura mudou (ex: upgrade), cancela a antiga na Stripe para evitar cobrança dupla
      if (
        rpcPayload?.success &&
        oldSubscriptionId &&
        subscriptionId &&
        oldSubscriptionId !== subscriptionId
      ) {
        try {
          console.log(`Cancelando assinatura antiga ${oldSubscriptionId} na Stripe devido a upgrade/mudança...`);
          await stripe.subscriptions.cancel(oldSubscriptionId);
        } catch (err) {
          console.error(`Erro ao cancelar assinatura antiga ${oldSubscriptionId}:`, err);
        }
      }

      if (rpcPayload?.success && rpcPayload?.new_activation) {
        // Busca o email do usuário via Auth Admin API para enviar o email de confirmação
        supabase.auth.admin.getUserById(userId).then(({ data: { user: authUser }, error: getUserError }) => {
          if (!getUserError && authUser?.email) {
            enviarEmailConfirmacao(authUser.email, tier, group).catch(console.error);
          } else {
            console.error('Erro ao obter email do usuario para webhook:', getUserError);
          }
        }).catch(console.error);
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
