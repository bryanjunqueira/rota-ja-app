/**
 * verify-subscription — Verificação direta na Stripe após retorno do Checkout.
 * Chamado pelo app quando o webhook não confirma o plano a tempo.
 *
 * Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Mapas price_id → tier e price_id → group */
function buildPriceMaps(): {
  tierMap: Record<string, string>;
  groupMap: Record<string, string>;
} {
  const entries: [string, string, string][] = [
    [Deno.env.get('STRIPE_PRICE_MOTORISTA_BRONZE') ?? 'price_1TaxoePFQwuRFQbNH58ShlMn', 'bronze', 'motorista'],
    [Deno.env.get('STRIPE_PRICE_MOTORISTA_PRATA') ?? 'price_1TaxoyPFQwuRFQbNFm5cyIWf', 'prata', 'motorista'],
    [Deno.env.get('STRIPE_PRICE_MOTORISTA_OURO') ?? 'price_1TaxpIPFQwuRFQbN95waf4Cc', 'ouro', 'motorista'],
    [Deno.env.get('STRIPE_PRICE_EMPRESA_BRONZE') ?? 'price_1TaxpePFQwuRFQbNIoaaNdXw', 'bronze', 'empresa'],
    [Deno.env.get('STRIPE_PRICE_EMPRESA_PRATA') ?? 'price_1TaxqEPFQwuRFQbNbznxFmgG', 'prata', 'empresa'],
    [Deno.env.get('STRIPE_PRICE_EMPRESA_OURO') ?? 'price_1TaxqfPFQwuRFQbND81JoD0H', 'ouro', 'empresa'],
  ];
  const tierMap: Record<string, string> = {};
  const groupMap: Record<string, string> = {};
  for (const [priceId, tier, group] of entries) {
    tierMap[priceId] = tier;
    groupMap[priceId] = group;
  }
  return { tierMap, groupMap };
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

    // Valida o usuário pelo JWT do app
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com service_role para operações no banco
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let sessionId: string | null = null;
    let targetTier: string | null = null;
    try {
      const body = await req.json();
      sessionId = body.sessionId ?? null;
      targetTier = body.targetTier ?? null;
    } catch (_) { /* sem corpo na requisição */ }

    // Busca assinatura atual
    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('stripe_customer_id, stripe_subscription_id, tipo_plano, status_assinatura, tipo_usuario')
      .eq('user_id', user.id)
      .maybeSingle();

    // Já está ativo com o plano desejado — retorna ok sem precisar chamar Stripe
    // Se o plano desejado for diferente do plano ativo atual (upgrade/downgrade),
    // ou se foi enviado um sessionId, NÃO retorna precocemente para permitir a verificação na Stripe.
    if (
      !sessionId &&
      assinatura?.status_assinatura === 'ativo' &&
      assinatura?.tipo_plano &&
      (targetTier ? assinatura.tipo_plano === targetTier : assinatura.tipo_plano !== 'gratuito')
    ) {
      return new Response(
        JSON.stringify({ activated: true, plan: assinatura.tipo_plano, source: 'db' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tierMap, groupMap } = buildPriceMaps();
    let tier: string | null = null;
    let group: string | null = assinatura?.tipo_usuario ?? null;
    let customerId: string | null = assinatura?.stripe_customer_id ?? null;
    let subscriptionId: string | null = null;

    // 0️⃣ Se temos sessionId enviado pelo app, busca a Checkout Session
    if (sessionId) {
      try {
        console.log(`Buscando checkout session ${sessionId}...`);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        // Verifica se a sessão pertence a este usuário por segurança
        const sessionUserId = session.client_reference_id ?? session.metadata?.user_id;
        if (sessionUserId === user.id && (session.payment_status === 'paid' || session.status === 'complete')) {
          const sessionCustId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id ?? null;
          const sessionSubId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id ?? null;
          
          if (sessionCustId) customerId = sessionCustId;
          if (sessionSubId) subscriptionId = sessionSubId;
          
          tier = (session.metadata?.plan_tier as string | undefined) ?? null;
          group = (session.metadata?.user_group as string | undefined) ?? group;
          
          console.log(`Checkout Session válida encontrada! Customer: ${customerId}, Sub: ${subscriptionId}, Tier: ${tier}`);
        } else {
          console.warn(`Checkout Session ${sessionId} não bate com o usuário ou status:`, {
            sessionUserId,
            userId: user.id,
            paymentStatus: session.payment_status,
            status: session.status
          });
        }
      } catch (err) {
        console.error(`Erro ao recuperar checkout session ${sessionId}:`, err);
      }
    }

    // 1️⃣ Se já determinamos uma subscriptionId da Checkout Session, verifica ela diretamente na Stripe
    if (subscriptionId) {
      try {
        console.log(`Verificando assinatura da session na Stripe: ${subscriptionId}`);
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.status === 'active' || sub.status === 'trialing') {
          const priceId = sub.items.data[0]?.price?.id ?? null;
          tier = tier ?? (sub.metadata?.plan_tier as string | undefined) ?? (priceId ? tierMap[priceId] : null);
          group = group ?? (sub.metadata?.user_group as string | undefined) ?? (priceId ? groupMap[priceId] : null);
        } else {
          console.warn(`Assinatura ${subscriptionId} da session não está ativa: ${sub.status}`);
          subscriptionId = null;
          tier = null;
        }
      } catch (err) {
        console.error(`Erro ao recuperar sub da session ${subscriptionId}:`, err);
        subscriptionId = null;
        tier = null;
      }
    }

    // 2️⃣ Se ainda não temos a assinatura resolvida, listamos as assinaturas ativas do cliente
    if (!subscriptionId && customerId) {
      try {
        console.log(`Buscando assinaturas ativas na Stripe para o customer: ${customerId}`);
        const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10, status: 'active' });
        
        let chosenSub = null;
        if (targetTier) {
          chosenSub = subs.data.find(sub => {
            const priceId = sub.items.data[0]?.price?.id ?? null;
            const subTier = (sub.metadata?.plan_tier as string | undefined) ?? (priceId ? tierMap[priceId] : null);
            return subTier === targetTier;
          });
        }
        
        if (!chosenSub && subs.data.length > 0) {
          chosenSub = subs.data[0];
        }

        if (chosenSub) {
          subscriptionId = chosenSub.id;
          const priceId = chosenSub.items.data[0]?.price?.id ?? null;
          tier = (chosenSub.metadata?.plan_tier as string | undefined) ?? (priceId ? tierMap[priceId] : null);
          group = group ?? (chosenSub.metadata?.user_group as string | undefined) ?? (priceId ? groupMap[priceId] : null);
          console.log(`Assinatura ativa selecionada do customer: ${subscriptionId}, Tier: ${tier}`);
        }
      } catch (err) {
        console.error(`Erro ao listar subs do customer ${customerId}:`, err);
      }
    }

    // 3️⃣ Se ainda não temos assinatura e temos o email, tenta achar o customer e listar suas assinaturas
    if (!subscriptionId && user.email) {
      try {
        console.log(`Buscando customer por e-mail: ${user.email}`);
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        const cust = customers.data[0];
        if (cust) {
          customerId = cust.id;
          console.log(`Customer localizado por e-mail: ${customerId}`);
          const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10, status: 'active' });
          
          let chosenSub = null;
          if (targetTier) {
            chosenSub = subs.data.find(sub => {
              const priceId = sub.items.data[0]?.price?.id ?? null;
              const subTier = (sub.metadata?.plan_tier as string | undefined) ?? (priceId ? tierMap[priceId] : null);
              return subTier === targetTier;
            });
          }
          
          if (!chosenSub && subs.data.length > 0) {
            chosenSub = subs.data[0];
          }

          if (chosenSub) {
            subscriptionId = chosenSub.id;
            const priceId = chosenSub.items.data[0]?.price?.id ?? null;
            tier = (chosenSub.metadata?.plan_tier as string | undefined) ?? (priceId ? tierMap[priceId] : null);
            group = group ?? (chosenSub.metadata?.user_group as string | undefined) ?? (priceId ? groupMap[priceId] : null);
            console.log(`Assinatura ativa selecionada por email: ${subscriptionId}, Tier: ${tier}`);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar customer por email:', err);
      }
    }

    // 4️⃣ Fallback: Se ainda não temos nada, mas a assinatura do banco tem uma subscriptionId, verifica ela diretamente
    const dbSubId = assinatura?.stripe_subscription_id;
    if (!subscriptionId && dbSubId) {
      try {
        console.log(`Fallback: verificando assinatura existente do banco: ${dbSubId}`);
        const sub = await stripe.subscriptions.retrieve(dbSubId);
        if (sub.status === 'active' || sub.status === 'trialing') {
          subscriptionId = sub.id;
          const priceId = sub.items.data[0]?.price?.id ?? null;
          tier = (sub.metadata?.plan_tier as string | undefined) ?? (priceId ? tierMap[priceId] : null);
          group = group ?? (sub.metadata?.user_group as string | undefined) ?? (priceId ? groupMap[priceId] : null);
          customerId = customerId ?? (typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id ?? null);
          console.log(`Fallback bem sucedido! Assinatura ativa: ${subscriptionId}, Tier: ${tier}`);
        }
      } catch (_) { /* subscription pode não existir */ }
    }

    if (!tier || !group) {
      return new Response(
        JSON.stringify({ activated: false, message: 'Nenhuma assinatura ativa encontrada na Stripe.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aplica o plano via RPC com service_role
    const { data: rpcData, error: rpcError } = await supabase.rpc('aplicar_plano_stripe', {
      p_user_id: user.id,
      p_novo_plano: tier,
      p_stripe_customer_id: customerId,
      p_stripe_subscription_id: subscriptionId,
      p_acao: 'verify_subscription_manual',
      p_tipo_usuario: group,
    });

    if (rpcError) {
      console.error('RPC aplicar_plano_stripe error:', rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rpcPayload = rpcData as { success?: boolean; new_activation?: boolean };

    // Se ativou com sucesso, e a assinatura mudou (ex: upgrade/downgrade), cancela a antiga na Stripe para evitar cobrança dupla
    const oldSubscriptionId = assinatura?.stripe_subscription_id;
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

    if (rpcPayload?.success && rpcPayload?.new_activation && user.email) {
      // Dispara o e-mail de confirmação em segundo plano (sem bloquear a resposta HTTP do app)
      enviarEmailConfirmacao(user.email, tier, group).catch(console.error);
    }

    console.log('Plano ativado via verify-subscription:', { userId: user.id, tier, group });
    return new Response(
      JSON.stringify({ activated: true, plan: tier, group, source: 'stripe', rpc: rpcData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('verify-subscription error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno ao verificar assinatura.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
