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
        <p style="margin: 0 0 16px 0; font-size: 15px;">Confirmamos a ativação do seu plano através de cupom de desconto de 100%. Todos os recursos e limites do seu novo plano foram ativados na sua conta.</p>
        
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
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #48bb78; font-size: 14px;">Ativo (Cupom 100%)</td>
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

    const { tier, group, successUrl, cancelUrl, metodoPagamento, amountCents, couponCode } = await req.json();
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

    // Validação de Cupom 100% (TESTE100) para ativação direta (bypass Stripe)
    const normalizedCoupon = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : '';
    if (normalizedCoupon === 'TESTE100') {
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: rpcData, error: rpcError } = await supabaseService.rpc('aplicar_plano_stripe', {
        p_user_id: user.id,
        p_novo_plano: tier,
        p_stripe_customer_id: 'coupon_bypass_TESTE100',
        p_stripe_subscription_id: `sub_bypass_100_${Date.now()}`,
        p_acao: 'coupon_100_direct_activation',
        p_tipo_usuario: group,
      });

      if (rpcError) {
        console.error('Erro RPC aplicar_plano_stripe:', rpcError);
        return new Response(JSON.stringify({ error: `Erro ao ativar plano via cupom: ${rpcError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        await enviarEmailConfirmacao(user.email ?? '', tier, group);
      } catch (emailErr) {
        console.error('Erro ao enviar e-mail de confirmação do cupom:', emailErr);
      }

      return new Response(
        JSON.stringify({ directActivation: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      allow_promotion_codes: true, // Permite cupons configurados na Stripe na tela de checkout
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
