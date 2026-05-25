-- ═══════════════════════════════════════════════════════════
-- MIGRAÇÃO: Segurança de planos, RPCs e limites no servidor
-- Execute no Supabase Dashboard > SQL Editor (após migration_assinaturas.sql)
-- ═══════════════════════════════════════════════════════════

-- ── 1. Flag de sessão para updates autorizados (RPC / service_role) ──
CREATE OR REPLACE FUNCTION public.assinatura_set_authoritative()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.assinatura_authoritative', 'true', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.assinatura_clear_authoritative()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.assinatura_authoritative', '', true);
END;
$$;

-- ── 2. Bloqueia alteração de campos sensíveis pelo cliente direto ──
CREATE OR REPLACE FUNCTION public.protect_assinatura_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.assinatura_authoritative', true), '') = 'true' THEN
    RETURN NEW;
  END IF;

  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo_plano IS DISTINCT FROM OLD.tipo_plano
     OR NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura
     OR NEW.status_pagamento IS DISTINCT FROM OLD.status_pagamento
     OR NEW.assinatura_inicio IS DISTINCT FROM OLD.assinatura_inicio
     OR NEW.assinatura_fim IS DISTINCT FROM OLD.assinatura_fim
     OR NEW.trial_inicio IS DISTINCT FROM OLD.trial_inicio
     OR NEW.trial_fim IS DISTINCT FROM OLD.trial_fim
     OR NEW.ultimo_pagamento IS DISTINCT FROM OLD.ultimo_pagamento
     OR NEW.proximo_pagamento IS DISTINCT FROM OLD.proximo_pagamento
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.historico_planos IS DISTINCT FROM OLD.historico_planos
     OR NEW.metodo_pagamento IS DISTINCT FROM OLD.metodo_pagamento
  THEN
    RAISE EXCEPTION 'Alteração de plano ou assinatura não permitida pelo cliente. Use o fluxo de pagamento oficial.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_assinatura_fields ON public.assinaturas;
CREATE TRIGGER trigger_protect_assinatura_fields
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_assinatura_sensitive_fields();

-- ── 3. Limite de fretes do motorista (aceitar carga) ──
CREATE OR REPLACE FUNCTION public.check_motorista_freight_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tipo_plano TEXT;
  v_status_assinatura TEXT;
  v_limite INTEGER;
  v_total_fretes INTEGER;
BEGIN
  IF NEW.motorista_id IS NOT NULL
     AND (OLD.motorista_id IS NULL OR OLD.status IS DISTINCT FROM 'aceito')
     AND NEW.status = 'aceito'
  THEN
    SELECT user_id INTO v_user_id FROM motoristas WHERE id = NEW.motorista_id;

    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Motorista não encontrado.';
    END IF;

    SELECT tipo_plano, status_assinatura
    INTO v_tipo_plano, v_status_assinatura
    FROM assinaturas
    WHERE user_id = v_user_id;

    IF v_tipo_plano IS NULL OR v_status_assinatura NOT IN ('trial', 'ativo') THEN
      v_tipo_plano := 'gratuito';
    END IF;

    IF v_tipo_plano = 'gratuito' THEN
      SELECT COUNT(*) INTO v_total_fretes
      FROM fretes
      WHERE motorista_id = NEW.motorista_id;

      v_limite := 5;

      IF v_total_fretes >= v_limite THEN
        RAISE EXCEPTION 'Limite de fretes excedido para o plano Gratuito (Máximo: %).', v_limite;
      END IF;

    ELSIF v_tipo_plano = 'bronze' THEN
      SELECT COUNT(*) INTO v_total_fretes
      FROM fretes
      WHERE motorista_id = NEW.motorista_id
        AND status IN ('aceito', 'em_transporte');

      v_limite := 10;

      IF v_total_fretes >= v_limite THEN
        RAISE EXCEPTION 'Limite de fretes ativos excedido para o plano Bronze (Máximo: %).', v_limite;
      END IF;

    ELSIF v_tipo_plano = 'prata' THEN
      SELECT COUNT(*) INTO v_total_fretes
      FROM fretes
      WHERE motorista_id = NEW.motorista_id
        AND status IN ('aceito', 'em_transporte');

      v_limite := 20;

      IF v_total_fretes >= v_limite THEN
        RAISE EXCEPTION 'Limite de fretes ativos excedido para o plano Prata (Máximo: %).', v_limite;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_freight_limit ON public.fretes;
CREATE TRIGGER trigger_check_freight_limit
  BEFORE UPDATE ON public.fretes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_motorista_freight_limit();

-- ── 4. Limite de publicações da empresa (trial=5 total | bronze/prata=mensal | ouro=ilimitado) ──
CREATE OR REPLACE FUNCTION public.check_empresa_freight_publish_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tipo_plano TEXT;
  v_status_assinatura TEXT;
  v_trial_fim TIMESTAMPTZ;
  v_limite INTEGER;
  v_total INTEGER;
  v_inicio_mes TIMESTAMPTZ;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tipo_plano, status_assinatura, trial_fim
  INTO v_tipo_plano, v_status_assinatura, v_trial_fim
  FROM assinaturas
  WHERE user_id = NEW.user_id;

  IF v_tipo_plano IS NULL THEN
    RAISE EXCEPTION 'Assinatura nao encontrada. Escolha um plano para publicar fretes.';
  END IF;

  IF v_status_assinatura NOT IN ('trial', 'ativo') THEN
    RAISE EXCEPTION 'Assinatura inativa. Escolha um plano para continuar publicando fretes.';
  END IF;

  IF v_tipo_plano = 'ouro' AND v_status_assinatura = 'ativo' THEN
    RETURN NEW;
  END IF;

  -- Plano gratuito / trial: máximo 5 publicações no período (lifetime, alinhado ao motorista)
  IF v_tipo_plano = 'gratuito' THEN
    IF v_status_assinatura = 'trial' AND v_trial_fim IS NOT NULL AND now() > v_trial_fim THEN
      RAISE EXCEPTION 'Período de teste expirado. Assine um plano para continuar publicando fretes.';
    END IF;

    SELECT COUNT(*) INTO v_total FROM fretes WHERE user_id = NEW.user_id;
    v_limite := 5;

    IF v_total >= v_limite THEN
      RAISE EXCEPTION 'Limite do plano gratuito excedido (Máximo: % publicações no período de teste).', v_limite;
    END IF;

    RETURN NEW;
  END IF;

  -- Bronze / Prata: limite mensal
  v_limite := CASE v_tipo_plano
    WHEN 'bronze' THEN 15
    WHEN 'prata' THEN 25
    ELSE 5
  END;

  v_inicio_mes := date_trunc('month', now() AT TIME ZONE 'UTC');

  SELECT COUNT(*) INTO v_total
  FROM fretes
  WHERE user_id = NEW.user_id
    AND created_at >= v_inicio_mes;

  IF v_total >= v_limite THEN
    RAISE EXCEPTION 'Limite mensal de publicações excedido para o seu plano (Máximo: % fretes/mês).', v_limite;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_empresa_monthly_limit ON public.fretes;
DROP TRIGGER IF EXISTS trigger_check_empresa_publish_limit ON public.fretes;
CREATE TRIGGER trigger_check_empresa_publish_limit
  BEFORE INSERT ON public.fretes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_empresa_freight_publish_limit();

-- ── 5. RPC: sincronizar status (trial/assinatura expirados) ──
CREATE OR REPLACE FUNCTION public.sync_assinatura_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row assinaturas%ROWTYPE;
  v_agora TIMESTAMPTZ := now();
  v_needs_upgrade BOOLEAN := false;
  v_is_trial_expired BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_row FROM assinaturas WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'data', NULL,
      'needs_upgrade', false,
      'is_trial_expired', false
    );
  END IF;

  IF v_row.status_assinatura = 'trial'
     AND v_row.trial_fim IS NOT NULL
     AND v_agora > v_row.trial_fim
  THEN
    PERFORM public.assinatura_set_authoritative();
    UPDATE assinaturas SET
      status_assinatura = 'expirado',
      historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('plano', v_row.tipo_plano, 'data', v_agora, 'acao', 'trial_expirado')
      )
    WHERE user_id = v_uid
    RETURNING * INTO v_row;
    PERFORM public.assinatura_clear_authoritative();
    v_needs_upgrade := true;
    v_is_trial_expired := true;

  ELSIF v_row.status_assinatura = 'ativo'
        AND v_row.assinatura_fim IS NOT NULL
        AND v_agora > v_row.assinatura_fim
  THEN
    PERFORM public.assinatura_set_authoritative();
    UPDATE assinaturas SET
      status_assinatura = 'expirado',
      tipo_plano = 'gratuito',
      historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('plano', v_row.tipo_plano, 'data', v_agora, 'acao', 'assinatura_expirada')
      )
    WHERE user_id = v_uid
    RETURNING * INTO v_row;
    PERFORM public.assinatura_clear_authoritative();
    v_needs_upgrade := true;

  ELSE
    v_needs_upgrade := v_row.status_assinatura IN ('expirado', 'cancelado', 'inadimplente');
  END IF;

  RETURN jsonb_build_object(
    'data', to_jsonb(v_row),
    'needs_upgrade', v_needs_upgrade,
    'is_trial_expired', v_is_trial_expired
  );
END;
$$;

-- ── 6. RPC: processar pagamento (sandbox ou confirmação interna) ──
CREATE OR REPLACE FUNCTION public.processar_assinatura_pagamento(
  p_novo_plano TEXT,
  p_metodo_pagamento TEXT DEFAULT 'cartao',
  p_cenario TEXT DEFAULT 'aprovado'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row assinaturas%ROWTYPE;
  v_agora TIMESTAMPTZ := now();
  v_fim TIMESTAMPTZ;
  v_acao TEXT;
  v_plano_anterior TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_novo_plano NOT IN ('gratuito', 'bronze', 'prata', 'ouro') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;

  SELECT * INTO v_row FROM assinaturas WHERE user_id = v_uid FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assinatura não encontrada';
  END IF;

  PERFORM public.assinatura_set_authoritative();

  IF p_cenario = 'aprovado' THEN
    v_fim := v_agora + interval '1 month';
    v_plano_anterior := v_row.tipo_plano;
    v_acao := CASE
      WHEN p_novo_plano = v_plano_anterior THEN 'ativacao'
      WHEN (CASE p_novo_plano WHEN 'bronze' THEN 1 WHEN 'prata' THEN 2 WHEN 'ouro' THEN 3 ELSE 0 END)
         > (CASE v_plano_anterior WHEN 'bronze' THEN 1 WHEN 'prata' THEN 2 WHEN 'ouro' THEN 3 ELSE 0 END)
      THEN 'upgrade'
      ELSE 'downgrade'
    END;

    UPDATE assinaturas SET
      tipo_plano = p_novo_plano,
      status_assinatura = 'ativo',
      status_pagamento = 'aprovado',
      metodo_pagamento = p_metodo_pagamento,
      assinatura_inicio = v_agora,
      assinatura_fim = v_fim,
      ultimo_pagamento = v_agora,
      proximo_pagamento = v_fim,
      historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('plano', p_novo_plano, 'data', v_agora, 'acao', v_acao)
      )
    WHERE user_id = v_uid
    RETURNING * INTO v_row;

    PERFORM public.assinatura_clear_authoritative();
    RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row));

  ELSIF p_cenario = 'recusado' THEN
    UPDATE assinaturas SET
      status_pagamento = 'recusado',
      historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('plano', p_novo_plano, 'data', v_agora, 'acao', 'pagamento_recusado')
      )
    WHERE user_id = v_uid
    RETURNING * INTO v_row;

    PERFORM public.assinatura_clear_authoritative();
    RETURN jsonb_build_object('success', false, 'error', 'Pagamento recusado pela operadora.', 'data', to_jsonb(v_row));

  ELSIF p_cenario = 'falha_pagamento' THEN
    UPDATE assinaturas SET
      status_assinatura = 'inadimplente',
      status_pagamento = 'recusado',
      historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('plano', v_row.tipo_plano, 'data', v_agora, 'acao', 'falha_pagamento')
      )
    WHERE user_id = v_uid
    RETURNING * INTO v_row;

    PERFORM public.assinatura_clear_authoritative();
    RETURN jsonb_build_object('success', false, 'error', 'Falha no processamento do pagamento.', 'data', to_jsonb(v_row));
  END IF;

  PERFORM public.assinatura_clear_authoritative();
  RAISE EXCEPTION 'Cenário de pagamento inválido';
END;
$$;

-- ── 7. RPC: cancelar, renovar, simular expiração ──
CREATE OR REPLACE FUNCTION public.cancelar_minha_assinatura()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row assinaturas%ROWTYPE;
  v_agora TIMESTAMPTZ := now();
  v_plano_anterior TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT tipo_plano INTO v_plano_anterior FROM assinaturas WHERE user_id = v_uid;

  PERFORM public.assinatura_set_authoritative();
  UPDATE assinaturas SET
    tipo_plano = 'gratuito',
    status_assinatura = 'cancelado',
    status_pagamento = 'cancelado',
    renovacao_automatica = false,
    historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('plano', v_plano_anterior, 'data', v_agora, 'acao', 'cancelado')
    )
  WHERE user_id = v_uid
  RETURNING * INTO v_row;
  PERFORM public.assinatura_clear_authoritative();

  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.renovar_minha_assinatura()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row assinaturas%ROWTYPE;
  v_agora TIMESTAMPTZ := now();
  v_fim TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT * INTO v_row FROM assinaturas WHERE user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura não encontrada.');
  END IF;

  IF NOT v_row.renovacao_automatica THEN
    RETURN jsonb_build_object('success', false, 'error', 'Renovação automática desativada.');
  END IF;

  v_fim := v_agora + interval '1 month';

  PERFORM public.assinatura_set_authoritative();
  UPDATE assinaturas SET
    status_assinatura = 'ativo',
    status_pagamento = 'aprovado',
    assinatura_inicio = v_agora,
    assinatura_fim = v_fim,
    ultimo_pagamento = v_agora,
    proximo_pagamento = v_fim,
    historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('plano', v_row.tipo_plano, 'data', v_agora, 'acao', 'renovacao')
    )
  WHERE user_id = v_uid
  RETURNING * INTO v_row;
  PERFORM public.assinatura_clear_authoritative();

  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.simular_expiracao_assinatura()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row assinaturas%ROWTYPE;
  v_agora TIMESTAMPTZ := now();
  v_plano_anterior TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT tipo_plano INTO v_plano_anterior FROM assinaturas WHERE user_id = v_uid;

  PERFORM public.assinatura_set_authoritative();
  UPDATE assinaturas SET
    tipo_plano = 'gratuito',
    status_assinatura = 'expirado',
    status_pagamento = 'pendente',
    historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('plano', v_plano_anterior, 'data', v_agora, 'acao', 'expirado_simulado')
    )
  WHERE user_id = v_uid
  RETURNING * INTO v_row;
  PERFORM public.assinatura_clear_authoritative();

  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row));
END;
$$;

-- ── 8. RPC: aplicar plano via webhook Stripe (service_role apenas) ──
DROP FUNCTION IF EXISTS public.aplicar_plano_stripe(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.aplicar_plano_stripe(
  p_user_id UUID,
  p_novo_plano TEXT,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_acao TEXT DEFAULT 'stripe_webhook',
  p_tipo_usuario TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row assinaturas%ROWTYPE;
  v_agora TIMESTAMPTZ := now();
  v_fim TIMESTAMPTZ := v_agora + interval '1 month';
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_novo_plano NOT IN ('gratuito', 'bronze', 'prata', 'ouro') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;

  IF p_tipo_usuario IS NOT NULL AND p_tipo_usuario NOT IN ('motorista', 'empresa') THEN
    RAISE EXCEPTION 'Tipo de usuario invalido';
  END IF;

  PERFORM public.assinatura_set_authoritative();

  UPDATE assinaturas SET
    tipo_usuario = COALESCE(p_tipo_usuario, tipo_usuario),
    tipo_plano = p_novo_plano,
    status_assinatura = 'ativo',
    status_pagamento = 'aprovado',
    assinatura_inicio = v_agora,
    assinatura_fim = v_fim,
    ultimo_pagamento = v_agora,
    proximo_pagamento = v_fim,
    stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    historico_planos = COALESCE(historico_planos, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('plano', p_novo_plano, 'data', v_agora, 'acao', p_acao)
    )
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    INSERT INTO assinaturas (
      user_id,
      tipo_usuario,
      tipo_plano,
      status_assinatura,
      status_pagamento,
      assinatura_inicio,
      assinatura_fim,
      ultimo_pagamento,
      proximo_pagamento,
      renovacao_automatica,
      stripe_customer_id,
      stripe_subscription_id,
      historico_planos
    )
    VALUES (
      p_user_id,
      COALESCE(p_tipo_usuario, 'motorista'),
      p_novo_plano,
      'ativo',
      'aprovado',
      v_agora,
      v_fim,
      v_agora,
      v_fim,
      true,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      jsonb_build_array(jsonb_build_object('plano', p_novo_plano, 'data', v_agora, 'acao', p_acao))
    )
    RETURNING * INTO v_row;
  END IF;

  PERFORM public.assinatura_clear_authoritative();
  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_row));
END;
$$;

-- ── 9. Permissões das RPCs ──
GRANT EXECUTE ON FUNCTION public.sync_assinatura_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.processar_assinatura_pagamento(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_minha_assinatura() TO authenticated;
GRANT EXECUTE ON FUNCTION public.renovar_minha_assinatura() TO authenticated;
GRANT EXECUTE ON FUNCTION public.simular_expiracao_assinatura() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_plano_stripe(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.sync_assinatura_status IS 'Verifica expiração de trial/assinatura e retorna estado atualizado';
COMMENT ON FUNCTION public.processar_assinatura_pagamento IS 'Processa pagamento sandbox até integração Stripe';
COMMENT ON FUNCTION public.aplicar_plano_stripe IS 'Atualiza plano após confirmação do webhook Stripe (service_role)';
