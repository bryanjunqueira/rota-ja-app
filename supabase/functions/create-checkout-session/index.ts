/**
 * Cria sessão Stripe Checkout para assinatura mensal.
 * O app chama: supabase.functions.invoke('create-checkout-session', { body: { tier, group } })
 *
 * Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY (validação JWT)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
});

const PRICE_IDS: Record<string, string> = {
  motorista_bronze:
    Deno.env.get('STRIPE_PRICE_MOTORISTA_BRONZE') ?? 'price_1TfjDY4v2T43THsUhrUsvwOn',
  motorista_prata:
    Deno.env.get('STRIPE_PRICE_MOTORISTA_PRATA') ?? 'price_1TfjDo4v2T43THsUimKvH0Wt',
  motorista_ouro:
    Deno.env.get('STRIPE_PRICE_MOTORISTA_OURO') ?? 'price_1TfjEA4v2T43THsUSqGk5gxI',
  empresa_bronze:
    Deno.env.get('STRIPE_PRICE_EMPRESA_BRONZE') ?? 'price_1TfjEQ4v2T43THsUIXOxM29p',
  empresa_prata:
    Deno.env.get('STRIPE_PRICE_EMPRESA_PRATA') ?? 'price_1TfjEi4v2T43THsUUasaaFH0',
  empresa_ouro:
    Deno.env.get('STRIPE_PRICE_EMPRESA_OURO') ?? 'price_1TfjEy4v2T43THsUnnxQ46A7',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tier, group, successUrl, cancelUrl, metodoPagamento, amountCents } = await req.json();
    if (!['bronze', 'prata', 'ouro'].includes(tier) || !['motorista', 'empresa'].includes(group)) {
      return new Response(JSON.stringify({ error: 'Plano invalido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priceKey = `${group}_${tier}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Plano ou preço Stripe inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // App: cartao | pix | boleto → Stripe: card | pix | boleto
    if (metodoPagamento === 'pix') {
      return new Response(JSON.stringify({
        error: 'PIX nao esta disponivel para assinatura mensal recorrente na Stripe. Use cartao ou boleto.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metodoMap: Record<string, 'card' | 'boleto'> = {
      cartao: 'card',
      boleto: 'boleto',
    };
    const stripeMethod = metodoMap[metodoPagamento as string] ?? 'card';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: [stripeMethod],
      locale: 'pt-BR',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? 'rotaja://checkout/success',
      cancel_url: cancelUrl ?? 'rotaja://checkout/cancel',
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      metadata: {
        user_id: user.id,
        plan_tier: tier,
        user_group: group,
        metodo_pagamento: metodoPagamento ?? stripeMethod,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_tier: tier,
          user_group: group,
        },
      },
    };

    if (stripeMethod === 'boleto') {
      sessionParams.payment_method_options = {
        boleto: { expires_after_days: 3 },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro ao criar checkout' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
