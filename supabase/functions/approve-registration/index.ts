import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function html(title: string, message: string, status = 200) {
  return new Response(
    `<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="font-family:Arial,sans-serif;background:#f8fafc;color:#111827;padding:32px">
        <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
          <h1 style="margin-top:0">${title}</h1>
          <p style="font-size:16px;line-height:1.5">${message}</p>
        </div>
      </body>
    </html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const role = url.searchParams.get('role');
  const profileId = url.searchParams.get('profileId');
  const decision = url.searchParams.get('decision');

  const approvalSecret = Deno.env.get('APPROVAL_SECRET') ?? '';
  if (!approvalSecret || token !== approvalSecret) {
    return html('Link invalido', 'Este link de aprovacao nao e valido.', 401);
  }

  if ((role !== 'motorista' && role !== 'empresa') || !profileId) {
    return html('Dados invalidos', 'Nao foi possivel identificar o cadastro.', 400);
  }

  if (decision !== 'approve' && decision !== 'reject') {
    return html('Decisao invalida', 'Escolha aprovar ou recusar o cadastro.', 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const table = role === 'empresa' ? 'empresas' : 'motoristas';
  const rejectedStatus = role === 'empresa' ? 'rejeitada' : 'rejeitado';
  const newStatus = decision === 'approve' ? 'aprovado' : rejectedStatus;

  const { data: profile, error: selectError } = await supabase
    .from(table)
    .select('user_id')
    .eq('id', profileId)
    .maybeSingle();

  if (selectError || !profile?.user_id) {
    return html('Cadastro nao encontrado', 'Nao encontramos esse cadastro para atualizar.', 404);
  }

  const { error: updateError } = await supabase
    .from(table)
    .update({ status: newStatus })
    .eq('id', profileId);

  if (updateError) {
    console.error('Erro ao atualizar status:', updateError);
    return html('Erro', 'Nao foi possivel atualizar o status do cadastro.', 500);
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(profile.user_id, {
    ban_duration: decision === 'reject' ? '876000h' : 'none',
  });

  if (authError) {
    console.error('Erro ao atualizar usuario auth:', authError);
  }

  if (decision === 'approve') {
    return html('Cadastro aprovado', 'O usuario foi aprovado e ja pode fazer login no app.');
  }

  return html('Cadastro recusado', 'O cadastro foi recusado e esse email nao podera acessar o app.');
});
