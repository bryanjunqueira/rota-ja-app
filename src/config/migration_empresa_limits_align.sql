-- Patch: alinhar limites empresa (5 trial | 15 bronze | 25 prata | ouro ilimitado)
-- Execute no SQL Editor se migration_security_plans.sql já foi aplicada antes desta correção.

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

  IF v_tipo_plano IS NULL OR v_status_assinatura NOT IN ('trial', 'ativo') THEN
    v_tipo_plano := 'gratuito';
  END IF;

  IF v_tipo_plano = 'ouro' AND v_status_assinatura = 'ativo' THEN
    RETURN NEW;
  END IF;

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
