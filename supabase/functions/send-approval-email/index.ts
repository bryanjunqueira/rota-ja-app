import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Perfil = {
  id: string;
  user_id: string;
  email: string;
  status: string | null;
  nome_completo?: string;
  nome_empresa?: string;
  cnpj?: string;
  celular?: string;
  telefone?: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Nao autenticado' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const ownerEmail = Deno.env.get('APP_OWNER_EMAIL') ?? '';
  const approvalSecret = Deno.env.get('APPROVAL_SECRET') ?? '';
  const fromEmail = Deno.env.get('APPROVAL_FROM_EMAIL') ?? 'RotaJa <onboarding@resend.dev>';

  if (!serviceRoleKey || !resendKey || !ownerEmail || !approvalSecret) {
    return json({
      error: 'Configure SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, APP_OWNER_EMAIL e APPROVAL_SECRET nos secrets do Supabase.',
    }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ error: 'Sessao invalida' }, 401);

  let role: 'motorista' | 'empresa' | null = null;
  let perfil: Perfil | null = null;

  const { data: motorista } = await adminClient
    .from('motoristas')
    .select('id, user_id, email, status, nome_completo, celular')
    .eq('user_id', user.id)
    .maybeSingle();

  if (motorista) {
    role = 'motorista';
    perfil = motorista as Perfil;
  } else {
    const { data: empresa } = await adminClient
      .from('empresas')
      .select('id, user_id, email, status, nome_empresa, cnpj, telefone')
      .eq('user_id', user.id)
      .maybeSingle();

    if (empresa) {
      role = 'empresa';
      perfil = empresa as Perfil;
    }
  }

  if (!role || !perfil) return json({ error: 'Perfil nao encontrado' }, 404);

  const baseUrl = `${supabaseUrl}/functions/v1/approve-registration`;
  const approveUrl =
    `${baseUrl}?token=${encodeURIComponent(approvalSecret)}` +
    `&role=${encodeURIComponent(role)}` +
    `&profileId=${encodeURIComponent(perfil.id)}` +
    '&decision=approve';
  const rejectUrl =
    `${baseUrl}?token=${encodeURIComponent(approvalSecret)}` +
    `&role=${encodeURIComponent(role)}` +
    `&profileId=${encodeURIComponent(perfil.id)}` +
    '&decision=reject';

  const displayName = role === 'empresa' ? perfil.nome_empresa : perfil.nome_completo;
  const documentLine = role === 'empresa'
    ? `<p><strong>CNPJ:</strong> ${escapeHtml(perfil.cnpj)}</p>`
    : `<p><strong>Telefone:</strong> ${escapeHtml(perfil.celular)}</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2>Novo cadastro aguardando aprovacao</h2>
      <p><strong>Tipo:</strong> ${role === 'empresa' ? 'Empresa' : 'Motorista'}</p>
      <p><strong>Nome:</strong> ${escapeHtml(displayName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(perfil.email || user.email)}</p>
      ${documentLine}
      <p><strong>Status atual:</strong> ${escapeHtml(perfil.status || 'pendente')}</p>
      <p style="margin-top:24px">
        <a href="${approveUrl}" style="background:#16a34a;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;margin-right:8px">Aprovar</a>
        <a href="${rejectUrl}" style="background:#dc2626;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Recusar</a>
      </p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [ownerEmail],
      subject: `RotaJa: novo cadastro de ${role === 'empresa' ? 'empresa' : 'motorista'}`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Resend error:', text);
    return json({ error: 'Nao foi possivel enviar email de aprovacao.' }, 500);
  }

  return json({ success: true });
});
